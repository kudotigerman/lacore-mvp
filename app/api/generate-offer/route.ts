import { NextResponse } from "next/server";
import { createClient as createSupabaseJsClient, type SupabaseClient } from "@supabase/supabase-js";
import { checkCredits, deductCredits } from "@/lib/credits";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const systemPrompt = `You are a world-class business strategist and copywriter. Given what someone sells, generate 3 distinct positioning strategies as a JSON array. Each strategy must be genuinely different in target audience, pricing model, and positioning angle.

CRITICAL INTERPRETATION RULE:
When user says 'I sell X for clients/customers/people' — they mean they sell X directly TO end consumers. NOT that they help others sell X.

Examples:
- 'I sell fitness courses for clients' = they sell fitness courses TO people who want to get fit
- 'I sell design services for businesses' = they sell design TO businesses as end clients
- 'I help coaches sell more' = they help coaches (B2B)
- 'I sell coaching for entrepreneurs' = they sell coaching TO entrepreneurs

Always ask yourself: WHO PAYS THEM? That person is the audience.
The user is the SERVICE PROVIDER. Their clients/customers are the BUYERS.

Generate the offer from the perspective of someone selling TO their audience, not helping their audience sell to others.

Return ONLY a valid JSON array with exactly 3 objects. Each object must have these exact keys: variant (A/B/C), label (short strategy name in uppercase, max 3 words), offer (one sentence describing the service), audience (specific target client), pricing (specific price/model), positioning (unique angle vs competitors), headline (punchy headline max 10 words).

Make each variant dramatically different. A = premium high-ticket, B = productized scalable, C = retainer ongoing. All copy in the same language as the input.`;

export type OfferVariant = {
  variant: "A" | "B" | "C";
  label: string;
  offer: string;
  audience: string;
  pricing: string;
  positioning: string;
  headline: string;
};

function isOfferVariant(value: unknown): value is OfferVariant {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  const v = obj.variant;
  return (
    (v === "A" || v === "B" || v === "C") &&
    typeof obj.label === "string" &&
    typeof obj.offer === "string" &&
    typeof obj.audience === "string" &&
    typeof obj.pricing === "string" &&
    typeof obj.positioning === "string" &&
    typeof obj.headline === "string"
  );
}

function parseVariantsFromText(text: string): OfferVariant[] | null {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const parsed: unknown = JSON.parse(cleaned);
  if (!Array.isArray(parsed) || parsed.length !== 3) return null;
  if (!parsed.every(isOfferVariant)) return null;
  return parsed;
}

export async function POST(request: Request) {
  try {
    const { userInput, project_id } = (await request.json()) as { userInput?: string; project_id?: string };

    if (!userInput || !userInput.trim()) {
      return NextResponse.json({ error: "Missing user input." }, { status: 400 });
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

    console.log("generate-offer: user=", user?.id ?? "null");

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const hasCredits = await checkCredits(supabaseForDb, user.id, "generate_offer");
    if (!hasCredits) {
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

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2500,
        system: systemPrompt,
        messages: [{ role: "user", content: userInput.trim() }]
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

    let variants: OfferVariant[] | null = null;
    try {
      variants = parseVariantsFromText(text);
    } catch {
      variants = null;
    }

    if (!variants) {
      return NextResponse.json({ error: "Claude returned invalid variants schema." }, { status: 502 });
    }

    if (project_id) {
      const first = variants[0];
      await supabaseForDb.from("offers").upsert(
        {
          user_id: user.id,
          project_id,
          offer: first.offer,
          audience: first.audience,
          pricing: first.pricing,
          positioning: first.positioning,
          headline: first.headline
        } as never
      );
    }

    const deducted = await deductCredits(supabaseForDb, user.id, "generate_offer");
    if (!deducted) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message: "Not enough credits. Please upgrade your plan or buy more credits."
        },
        { status: 402 }
      );
    }

    return NextResponse.json({ variants });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    return NextResponse.json({ error: "Failed to generate offer.", details: message }, { status: 500 });
  }
}
