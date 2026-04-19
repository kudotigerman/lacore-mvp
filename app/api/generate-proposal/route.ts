import { NextResponse } from "next/server";
import { createClient as createSupabaseJsClient, type SupabaseClient } from "@supabase/supabase-js";
import { aiComplete, AI_BUSY_USER_MESSAGE, hasAiProviderConfigured } from "@/lib/claudeWithRetry";
import { checkCredits, deductCredits } from "@/lib/credits";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM = `You are an expert sales consultant writing a winning business proposal for a freelancer/consultant.
Write a professional proposal with these sections:

EXECUTIVE SUMMARY — 2-3 sentences about the client's problem and your solution
THE PROBLEM — what's costing them without this solution
OUR SOLUTION — specific deliverables from the offer
TIMELINE — 3-4 week breakdown
INVESTMENT — pricing with 2 tiers (basic/premium)
NEXT STEPS — clear call to action

Use the freelancer's offer info and client context.
Be specific, confident, and outcome-focused.
Avoid generic language. Use the client's name throughout where natural.
Return ONLY valid JSON with this exact shape (no markdown):
{"sections":[{"title":"string","content":"string"}]}

Each section title should match one of: Executive summary, The problem, Our solution, Timeline, Investment, Next steps (use Title Case for title field).`;

export type ProposalSection = { title: string; content: string };

function isProposalPayload(value: unknown): value is { sections: ProposalSection[] } {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (!Array.isArray(o.sections)) return false;
  return o.sections.every(
    (s) =>
      s &&
      typeof s === "object" &&
      typeof (s as ProposalSection).title === "string" &&
      typeof (s as ProposalSection).content === "string"
  );
}

function parseProposalFromText(text: string): { sections: ProposalSection[] } | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (!isProposalPayload(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      clientName?: string;
      clientProblem?: string;
      project_id?: string;
      offer?: string;
      audience?: string;
      pricing?: string;
      positioning?: string;
      headline?: string;
    };

    const clientName = typeof body.clientName === "string" ? body.clientName.trim() : "";
    const clientProblem = typeof body.clientProblem === "string" ? body.clientProblem.trim() : "";
    if (!clientName || !clientProblem) {
      return NextResponse.json({ error: "Client name and problem are required." }, { status: 400 });
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

    const { data: profileRow } = await supabaseForDb
      .from("profiles")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle();
    const userPlan = (profileRow as { plan?: string } | null)?.plan ?? "free";
    const proposalModel =
      userPlan === "pro" || userPlan === "scale" ? "claude-opus-4-6" : "claude-sonnet-4-6";

    const hasCredits = await checkCredits(supabaseForDb, user.id, "generate_proposal");
    if (!hasCredits) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message: "Not enough credits. Please upgrade your plan or buy more credits."
        },
        { status: 402 }
      );
    }

    if (!hasAiProviderConfigured()) {
      return NextResponse.json({ error: "Server AI is not configured." }, { status: 500 });
    }

    const ctx = [
      `Freelancer headline: ${body.headline?.trim() || "—"}`,
      `Offer: ${body.offer?.trim() || "—"}`,
      `Audience: ${body.audience?.trim() || "—"}`,
      `Pricing: ${body.pricing?.trim() || "—"}`,
      `Positioning: ${body.positioning?.trim() || "—"}`,
      "",
      `Client name: ${clientName}`,
      `Client's main problem: ${clientProblem}`
    ].join("\n");

    let text: string;
    try {
      text = await aiComplete({
        system: SYSTEM,
        user: ctx,
        maxTokens: 4000,
        model: proposalModel,
      });
    } catch {
      return NextResponse.json({ error: AI_BUSY_USER_MESSAGE }, { status: 503 });
    }
    text = text.trim();
    if (!text) {
      return NextResponse.json({ error: AI_BUSY_USER_MESSAGE }, { status: 502 });
    }

    const parsed = parseProposalFromText(text);
    if (!parsed?.sections?.length) {
      return NextResponse.json({ error: "Could not parse proposal JSON from model." }, { status: 502 });
    }

    const projectId = typeof body.project_id === "string" && body.project_id.trim() ? body.project_id.trim() : null;

    const { data: inserted, error: insErr } = await supabaseForDb
      .from("proposals")
      .insert({
        user_id: user.id,
        project_id: projectId,
        client_name: clientName,
        client_problem: clientProblem,
        content: parsed as unknown as Record<string, unknown>
      } as never)
      .select("id")
      .maybeSingle();

    if (insErr) {
      console.error("generate-proposal insert:", insErr);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    const deducted = await deductCredits(supabaseForDb, user.id, "generate_proposal");
    if (!deducted) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message: "Not enough credits. Please upgrade your plan or buy more credits."
        },
        { status: 402 }
      );
    }

    const row = inserted as { id?: string } | null;
    return NextResponse.json({
      proposal: {
        id: row?.id ?? null,
        sections: parsed.sections
      }
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
