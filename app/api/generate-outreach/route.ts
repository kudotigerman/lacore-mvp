import { NextResponse } from "next/server";
import { createClient as createSupabaseJsClient, type SupabaseClient } from "@supabase/supabase-js";
import { checkCredits, deductCredits } from "@/lib/credits";
import { createClient } from "@/utils/supabase/server";
import type { OutreachResult } from "@/types/dashboard-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM = `You are an expert at cold outreach for service businesses.
The user describes a prospect and a channel + tone. Write:

1) primary — the main first message to send
2) alternative — a different angle / hook for the same person
3) followUp — a short follow-up if they don't reply (appropriate to channel length)

Use the user's offer and audience from context so the outreach is relevant.
Be specific to the prospect description. No generic templates.

Return ONLY valid JSON (no markdown):
{
  "primary": "string",
  "alternative": "string",
  "followUp": "string"
}`;

function isOutreachPayload(value: unknown): value is OutreachResult {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.primary === "string" &&
    typeof o.alternative === "string" &&
    typeof o.followUp === "string"
  );
}

function parseJson(text: string): OutreachResult | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  try {
    const parsed: unknown = JSON.parse(cleaned);
    return isOutreachPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prospect?: string;
      channel?: string;
      tone?: string;
      offer?: string;
      audience?: string;
      pricing?: string;
      positioning?: string;
      headline?: string;
    };

    const prospect = typeof body.prospect === "string" ? body.prospect.trim() : "";
    const channel = typeof body.channel === "string" ? body.channel.trim() : "";
    const tone = typeof body.tone === "string" ? body.tone.trim() : "";
    if (!prospect || !channel || !tone) {
      return NextResponse.json({ error: "Prospect, channel, and tone are required." }, { status: 400 });
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

    if (!(await checkCredits(supabaseForDb, user.id, "generate_outreach"))) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message: "Not enough credits. Please upgrade your plan or buy more credits."
        },
        { status: 402 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set." }, { status: 500 });
    }

    const ctx = [
      `Prospect / context: ${prospect}`,
      `Channel: ${channel}`,
      `Tone: ${tone}`,
      "",
      `Headline: ${body.headline?.trim() || "—"}`,
      `Offer: ${body.offer?.trim() || "—"}`,
      `Audience: ${body.audience?.trim() || "—"}`,
      `Pricing: ${body.pricing?.trim() || "—"}`,
      `Positioning: ${body.positioning?.trim() || "—"}`
    ].join("\n");

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        system: SYSTEM,
        messages: [{ role: "user", content: ctx }]
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
      return NextResponse.json({ error: "Could not parse outreach JSON." }, { status: 502 });
    }

    if (!(await deductCredits(supabaseForDb, user.id, "generate_outreach"))) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message: "Not enough credits. Please upgrade your plan or buy more credits."
        },
        { status: 402 }
      );
    }

    return NextResponse.json({ outreach: parsed });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
