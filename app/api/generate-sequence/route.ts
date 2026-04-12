import { NextResponse } from "next/server";
import { createClient as createSupabaseJsClient, type SupabaseClient } from "@supabase/supabase-js";
import { checkCredits, deductCredits } from "@/lib/credits";
import { createClient } from "@/utils/supabase/server";
import type { SequenceMessage } from "@/types/dashboard-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function buildSystem(channel: string) {
  return `You are an expert in sales communication and outreach.
Write a ${channel} sequence for the user's stated goal.
Use the user's offer, positioning and target audience from context.
Make messages feel personal, not salesy.
Include specific timing for each message (e.g. "Day 1", "Day 3", "Hour 0").
For email: include subject lines (non-null subject per message).
For DM / WhatsApp / Telegram: keep each message under 150 words; subject must be null.
For LinkedIn: professional but warm tone; subject null unless email-style — use null for LinkedIn DMs.
Return ONLY valid JSON (no markdown):
{"messages":[{"timing":"string","subject":"string or null","content":"string"}]}

Provide at least 3 messages for nurture-style goals; for short connection+follow-up use 2–3 messages as appropriate.`;
}

function isSequencePayload(value: unknown): value is { messages: SequenceMessage[] } {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (!Array.isArray(o.messages) || o.messages.length < 1) return false;
  return o.messages.every(
    (m) =>
      m &&
      typeof m === "object" &&
      typeof (m as SequenceMessage).timing === "string" &&
      typeof (m as SequenceMessage).content === "string" &&
      ((m as SequenceMessage).subject === null || typeof (m as SequenceMessage).subject === "string")
  );
}

function parseJson(text: string): { messages: SequenceMessage[] } | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  try {
    const parsed: unknown = JSON.parse(cleaned);
    return isSequencePayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

const CHANNEL_LABELS: Record<string, string> = {
  email: "email",
  instagram: "Instagram DM",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  telegram: "Telegram"
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      channel?: string;
      goal?: string;
      offer?: string;
      audience?: string;
      pricing?: string;
      positioning?: string;
      headline?: string;
    };

    const channel = typeof body.channel === "string" ? body.channel.trim() : "";
    const goal = typeof body.goal === "string" ? body.goal.trim() : "";
    const allowed = new Set(["email", "instagram", "linkedin", "whatsapp", "telegram"]);
    if (!allowed.has(channel) || !goal) {
      return NextResponse.json({ error: "Valid channel and goal are required." }, { status: 400 });
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

    if (!(await checkCredits(supabaseForDb, user.id, "generate_sequence"))) {
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

    const channelHuman = CHANNEL_LABELS[channel] ?? channel;
    const ctx = [
      `Goal: ${goal}`,
      `Channel: ${channelHuman}`,
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
        max_tokens: 5000,
        system: buildSystem(channelHuman),
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
      return NextResponse.json({ error: "Could not parse sequence JSON." }, { status: 502 });
    }

    if (!(await deductCredits(supabaseForDb, user.id, "generate_sequence"))) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message: "Not enough credits. Please upgrade your plan or buy more credits."
        },
        { status: 402 }
      );
    }

    return NextResponse.json({ sequence: parsed });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
