import { NextResponse } from "next/server";
import { createClient as createSupabaseJsClient, type SupabaseClient } from "@supabase/supabase-js";
import { aiComplete, AI_BUSY_USER_MESSAGE, hasAiProviderConfigured } from "@/lib/claudeWithRetry";
import { checkCredits, deductCredits } from "@/lib/credits";
import { createClient } from "@/utils/supabase/server";
import type { PricingStrategyResult, PricingTier } from "@/types/dashboard-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM = `You are a pricing strategist for service businesses.
Analyze the user's business and provide:

Optimal price point with market reasoning
Three pricing tiers (Starter / Core / Premium) with concrete prices and bullet "includes"
Script for presenting price confidently (as plain text)
Response to "that's too expensive" objection (as plain text)

Consider: business type and niche, years of experience, current price (if undercharging, say so directly), market rates for this service.
Be specific with numbers. Don't be vague.
Use the user's offer/positioning from context when provided.

Return ONLY valid JSON (no markdown):
{
  "recommendedPrice": "string",
  "priceRationale": "string",
  "tiers": [{ "name": "string", "price": "string", "includes": ["string"] }],
  "presentationScript": "string",
  "objectionResponse": "string"
}

"tier" names should align with Starter, Core, Premium (or equivalent). "includes" must be non-empty arrays of short strings.`;

function isPricingPayload(value: unknown): value is PricingStrategyResult {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (typeof o.recommendedPrice !== "string" || typeof o.priceRationale !== "string") return false;
  if (typeof o.presentationScript !== "string" || typeof o.objectionResponse !== "string") return false;
  if (!Array.isArray(o.tiers) || o.tiers.length < 1) return false;
  return o.tiers.every(
    (t) =>
      t &&
      typeof t === "object" &&
      typeof (t as PricingTier).name === "string" &&
      typeof (t as PricingTier).price === "string" &&
      Array.isArray((t as PricingTier).includes) &&
      (t as PricingTier).includes.every((x) => typeof x === "string")
  );
}

function parseJson(text: string): PricingStrategyResult | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  try {
    const parsed: unknown = JSON.parse(cleaned);
    return isPricingPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      businessType?: string;
      niche?: string;
      currentPrice?: string;
      experience?: string;
      offer?: string;
      audience?: string;
      pricing?: string;
      positioning?: string;
      headline?: string;
    };

    const businessType = typeof body.businessType === "string" ? body.businessType.trim() : "";
    const niche = typeof body.niche === "string" ? body.niche.trim() : "";
    const experience = typeof body.experience === "string" ? body.experience.trim() : "";
    if (!businessType || !niche || !experience) {
      return NextResponse.json({ error: "Business type, niche, and experience are required." }, { status: 400 });
    }

    const currentPrice =
      typeof body.currentPrice === "string" ? body.currentPrice.trim() || "Not specified / unknown" : "Not specified";

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

    if (!(await checkCredits(supabaseForDb, user.id, "pricing_strategy"))) {
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
      `Saved business context (if any):`,
      `Headline: ${body.headline?.trim() || "—"}`,
      `Offer: ${body.offer?.trim() || "—"}`,
      `Audience: ${body.audience?.trim() || "—"}`,
      `Current saved pricing note: ${body.pricing?.trim() || "—"}`,
      `Positioning: ${body.positioning?.trim() || "—"}`,
      "",
      `Business type: ${businessType}`,
      `Niche: ${niche}`,
      `What they charge now (user input): ${currentPrice}`,
      `Experience: ${experience}`
    ].join("\n");

    let text: string;
    try {
      text = await aiComplete({
        system: SYSTEM,
        user: ctx,
        maxTokens: 4000,
      });
    } catch {
      return NextResponse.json({ error: AI_BUSY_USER_MESSAGE }, { status: 503 });
    }
    text = text.trim();
    if (!text) {
      return NextResponse.json({ error: AI_BUSY_USER_MESSAGE }, { status: 502 });
    }

    const parsed = parseJson(text);
    if (!parsed) {
      return NextResponse.json({ error: "Could not parse pricing strategy JSON." }, { status: 502 });
    }

    if (!(await deductCredits(supabaseForDb, user.id, "pricing_strategy"))) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message: "Not enough credits. Please upgrade your plan or buy more credits."
        },
        { status: 402 }
      );
    }

    return NextResponse.json({ result: parsed });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
