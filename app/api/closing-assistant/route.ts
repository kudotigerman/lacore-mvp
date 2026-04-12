import { NextResponse } from "next/server";
import { createClient as createSupabaseJsClient, type SupabaseClient } from "@supabase/supabase-js";
import { checkCredits, deductCredits } from "@/lib/credits";
import { createClient } from "@/utils/supabase/server";
import { normalizePipelineStatus, pipelineColumnLabel, type PipelineColumnId } from "@/lib/leadPipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM = `You are an expert sales closer for freelancers and consultants selling high-trust services.
You help the user move a real lead through their pipeline with empathy, clarity, and zero sleaze.

Return ONLY valid JSON (no markdown, no code fences). Use this exact shape:
{
  "analysis": "string (1-2 sentences: what's going on with this lead right now)",
  "next_action": "string (one concrete next step)",
  "messages": [
    { "label": "Initial reach", "body": "string" },
    { "label": "Follow-up", "body": "string" },
    { "label": "Close", "body": "string" }
  ],
  "objections": [
    { "objection": "string", "response": "string" }
  ]
}

Messages must be ready to send with light personalization placeholders like [Name] where useful.
Objections: 3-5 pairs tailored to this lead type and offer.`;

type ClosingResult = {
  analysis: string;
  next_action: string;
  messages: { label: string; body: string }[];
  objections: { objection: string; response: string }[];
};

function isClosingPayload(value: unknown): value is ClosingResult {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (typeof o.analysis !== "string" || typeof o.next_action !== "string") return false;
  if (!Array.isArray(o.messages) || !Array.isArray(o.objections)) return false;
  for (const m of o.messages) {
    if (!m || typeof m !== "object") return false;
    const x = m as Record<string, unknown>;
    if (typeof x.label !== "string" || typeof x.body !== "string") return false;
  }
  for (const ob of o.objections) {
    if (!ob || typeof ob !== "object") return false;
    const x = ob as Record<string, unknown>;
    if (typeof x.objection !== "string" || typeof x.response !== "string") return false;
  }
  return true;
}

function parseJson(text: string): ClosingResult | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  try {
    const parsed: unknown = JSON.parse(cleaned);
    return isClosingPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { lead_id?: string };
    const leadId = typeof body.lead_id === "string" ? body.lead_id.trim() : "";
    if (!leadId) {
      return NextResponse.json({ error: "lead_id is required." }, { status: 400 });
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

    const { data: leadRow, error: leadErr } = await supabaseForDb
      .from("leads")
      .select("id, name, email, phone, message, status, created_at, project_id")
      .eq("id", leadId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (leadErr || !leadRow) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const lead = leadRow as {
      id: string;
      name: string | null;
      email: string;
      phone: string | null;
      message: string | null;
      status: string | null;
      created_at: string;
      project_id: string | null;
    };

    let offerBlock = "Offer context not loaded — use generic best practices.";
    if (lead.project_id) {
      const { data: offerData } = await supabaseForDb
        .from("offers")
        .select("offer, audience, pricing, positioning, headline")
        .eq("user_id", user.id)
        .eq("project_id", lead.project_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const off = offerData as {
        offer?: string;
        audience?: string;
        pricing?: string;
        positioning?: string;
        headline?: string;
      } | null;
      if (off) {
        offerBlock = [
          `Headline: ${off.headline?.trim() || "—"}`,
          `Offer: ${off.offer?.trim() || "—"}`,
          `Audience: ${off.audience?.trim() || "—"}`,
          `Pricing: ${off.pricing?.trim() || "—"}`,
          `Positioning: ${off.positioning?.trim() || "—"}`
        ].join("\n");
      }
    }

    if (!(await checkCredits(supabaseForDb, user.id, "closing_assistant"))) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message: "Not enough credits. Please upgrade your plan or buy more credits."
        },
        { status: 402 }
      );
    }

    const statusNorm = normalizePipelineStatus(lead.status) as PipelineColumnId;
    const statusLabel = pipelineColumnLabel(statusNorm);

    const userContent = [
      `Pipeline stage: ${statusLabel} (${statusNorm})`,
      "",
      `Lead name: ${lead.name?.trim() || "—"}`,
      `Email: ${lead.email}`,
      `Phone: ${lead.phone?.trim() || "—"}`,
      `Message from lead: ${lead.message?.trim() || "—"}`,
      `Added: ${lead.created_at}`,
      "",
      "User's offer / business context:",
      offerBlock,
      "",
      `Tailor everything to stage "${statusLabel}". The next pipeline stages after this one are typically: contacted → replied → call_booked → proposal_sent → won.`
    ].join("\n");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set." }, { status: 500 });
    }

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM,
        messages: [{ role: "user", content: userContent }]
      })
    });

    if (!anthropicResponse.ok) {
      const details = await anthropicResponse.text();
      return NextResponse.json(
        { error: "Claude request failed.", details },
        { status: anthropicResponse.status }
      );
    }

    const completion = (await anthropicResponse.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = completion.content?.find((item) => item.type === "text")?.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "No text returned from Claude." }, { status: 502 });
    }

    const parsed = parseJson(text);
    if (!parsed) {
      return NextResponse.json({ error: "Could not parse closing assistant JSON." }, { status: 502 });
    }

    if (!(await deductCredits(supabaseForDb, user.id, "closing_assistant"))) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message: "Not enough credits. Please upgrade your plan or buy more credits."
        },
        { status: 402 }
      );
    }

    return NextResponse.json({
      analysis: parsed.analysis,
      next_action: parsed.next_action,
      messages: parsed.messages,
      objections: parsed.objections
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
