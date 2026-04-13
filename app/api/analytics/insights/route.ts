import { NextResponse } from "next/server";
import { createClient as createSupabaseJsClient, type SupabaseClient } from "@supabase/supabase-js";
import { aiComplete, AI_BUSY_USER_MESSAGE, hasAiProviderConfigured } from "@/lib/claudeWithRetry";
import { checkCredits, deductCredits } from "@/lib/credits";
import { upsertSavedResult } from "@/lib/saved-results";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SYSTEM = `You are a sales coach analyzing a freelancer's pipeline data.
Give 3 specific, actionable insights. Be direct and concrete.
Format as JSON array: [{icon, title, insight, action}]`;

type InsightCard = {
  icon: string;
  title: string;
  insight: string;
  action: string;
};

function isInsightCard(v: unknown): v is InsightCard {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.icon === "string" &&
    typeof o.title === "string" &&
    typeof o.insight === "string" &&
    typeof o.action === "string"
  );
}

function parseInsights(text: string): InsightCard[] | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (!Array.isArray(parsed) || parsed.length < 1) return null;
    const valid = parsed.filter(isInsightCard).slice(0, 3);
    return valid.length === 3 ? valid : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("project_id")?.trim() ?? "";
    if (!projectId) {
      return NextResponse.json({ error: "project_id is required." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const authHeader = request.headers.get("authorization");

    const supabase = createClient();
    let supabaseForDb: SupabaseClient = supabase as SupabaseClient;
    let {
      data: { user },
      error: authErr
    } = await supabase.auth.getUser();

    if ((!user || authErr) && authHeader?.startsWith("Bearer ") && supabaseUrl && supabaseAnonKey) {
      const bearerClient = createSupabaseJsClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const r = await bearerClient.auth.getUser();
      if (!r.error && r.data.user) {
        user = r.data.user;
        authErr = null;
        supabaseForDb = bearerClient;
      }
    }

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: cachedRow } = await supabaseForDb
      .from("saved_results")
      .select("result, updated_at")
      .eq("user_id", user.id)
      .eq("project_id", projectId)
      .eq("type", "analytics_insights")
      .maybeSingle();

    const cached = cachedRow as { result?: unknown; updated_at?: string | null } | null;
    if (cached?.updated_at) {
      const ageMs = Date.now() - new Date(cached.updated_at).getTime();
      if (Number.isFinite(ageMs) && ageMs < ONE_DAY_MS && Array.isArray(cached.result)) {
        const cards = (cached.result as unknown[]).filter(isInsightCard).slice(0, 3);
        if (cards.length === 3) {
          return NextResponse.json({ insights: cards, cached: true });
        }
      }
    }

    if (!(await checkCredits(supabaseForDb, user.id, "analytics_insights"))) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message: "Not enough credits. Please upgrade your plan or buy more credits."
        },
        { status: 402 }
      );
    }

    const { data: leadsData } = await supabaseForDb
      .from("leads")
      .select("status, created_at, deal_value")
      .eq("user_id", user.id)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    const { data: landingData } = await supabaseForDb
      .from("landing_pages")
      .select("views")
      .eq("user_id", user.id)
      .eq("project_id", projectId);

    const leads = (leadsData ?? []) as Array<{ status: string | null; created_at: string; deal_value: number | string | null }>;
    const totalLeads = leads.length;
    const wonLeads = leads.filter((l) => (l.status ?? "").trim().toLowerCase() === "won");
    const wonDeals = wonLeads.length;
    const dealValues = wonLeads
      .map((l) => (typeof l.deal_value === "number" ? l.deal_value : Number.parseFloat(String(l.deal_value ?? ""))))
      .filter((n) => Number.isFinite(n) && n > 0);
    const totalRevenue = dealValues.reduce((sum, n) => sum + n, 0);
    const conversionRate = totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0;
    const landingViews = ((landingData ?? []) as Array<{ views: number | null }>).reduce((a, r) => a + (Number(r.views) || 0), 0);
    const byStatus = leads.reduce<Record<string, number>>((acc, lead) => {
      const key = (lead.status ?? "new").trim().toLowerCase() || "new";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const userContent = JSON.stringify(
      {
        metrics: { totalLeads, landingViews, wonDeals, conversionRate, totalRevenue },
        status_breakdown: byStatus,
        leads
      },
      null,
      2
    );

    if (!hasAiProviderConfigured()) {
      return NextResponse.json({ error: "Server AI is not configured." }, { status: 500 });
    }

    let text: string;
    try {
      text = await aiComplete({
        system: SYSTEM,
        user: userContent,
        maxTokens: 2048,
      });
    } catch {
      return NextResponse.json({ error: AI_BUSY_USER_MESSAGE }, { status: 503 });
    }
    text = text.trim();
    if (!text) {
      return NextResponse.json({ error: AI_BUSY_USER_MESSAGE }, { status: 502 });
    }

    const insights = parseInsights(text);
    if (!insights) {
      return NextResponse.json({ error: "Could not parse insights JSON." }, { status: 502 });
    }

    if (!(await deductCredits(supabaseForDb, user.id, "analytics_insights"))) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message: "Not enough credits. Please upgrade your plan or buy more credits."
        },
        { status: 402 }
      );
    }

    await upsertSavedResult(supabaseForDb, {
      userId: user.id,
      projectId,
      type: "analytics_insights",
      input: { generated_at: new Date().toISOString() },
      result: insights
    });

    return NextResponse.json({ insights, cached: false });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
