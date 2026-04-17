import { NextResponse } from "next/server";
import { createClient as createSupabaseJsClient, type SupabaseClient } from "@supabase/supabase-js";
import { aiComplete, AI_BUSY_USER_MESSAGE, hasAiProviderConfigured } from "@/lib/claudeWithRetry";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type IcpPayload = {
  role: string;
  companyType: string;
  keyPain: string;
  budgetSignal: string;
  linkedinQuery: string;
  apolloQuery: string;
  twitterHashtags: string[];
  redditCommunities: string[];
  nicheKeyword: string;
};

const SYSTEM = `You help business owners find ideal prospects for outreach.
Generate an Ideal Client Profile from the provided business context.
Return ONLY valid JSON (no markdown) with this exact shape:
{
  "role": "string",
  "companyType": "string",
  "keyPain": "string",
  "budgetSignal": "string",
  "linkedinQuery": "string",
  "apolloQuery": "string",
  "twitterHashtags": ["string", "string"],
  "redditCommunities": ["string", "string"],
  "nicheKeyword": "string"
}`;

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isIcpPayload(v: unknown): v is IcpPayload {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.role === "string" &&
    typeof o.companyType === "string" &&
    typeof o.keyPain === "string" &&
    typeof o.budgetSignal === "string" &&
    typeof o.linkedinQuery === "string" &&
    typeof o.apolloQuery === "string" &&
    isStringArray(o.twitterHashtags) &&
    isStringArray(o.redditCommunities) &&
    typeof o.nicheKeyword === "string"
  );
}

function parseJson(text: string): IcpPayload | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  try {
    const parsed: unknown = JSON.parse(cleaned);
    return isIcpPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      offer?: string;
      audience?: string;
      pricing?: string;
      positioning?: string;
      headline?: string;
      niche?: string;
    };

    const offer = typeof body.offer === "string" ? body.offer.trim() : "";
    const audience = typeof body.audience === "string" ? body.audience.trim() : "";
    const pricing = typeof body.pricing === "string" ? body.pricing.trim() : "";
    const positioning = typeof body.positioning === "string" ? body.positioning.trim() : "";
    const headline = typeof body.headline === "string" ? body.headline.trim() : "";
    const niche = typeof body.niche === "string" ? body.niche.trim() : "";

    if (!offer) {
      return NextResponse.json({ error: "Offer is required." }, { status: 400 });
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

    if (!hasAiProviderConfigured()) {
      return NextResponse.json({ error: "Server AI is not configured." }, { status: 500 });
    }

    const prompt = [
      "Based on this business offer, generate an Ideal Client Profile.",
      "",
      `Offer: ${offer || "—"}`,
      `Audience: ${audience || "—"}`,
      `Pricing: ${pricing || "—"}`,
      `Positioning: ${positioning || "—"}`,
      `Headline: ${headline || "—"}`,
      `Niche: ${niche || "—"}`
    ].join("\n");

    let raw = "";
    try {
      raw = await aiComplete({ system: SYSTEM, user: prompt, maxTokens: 2000 });
    } catch {
      return NextResponse.json({ error: AI_BUSY_USER_MESSAGE }, { status: 503 });
    }

    const parsed = parseJson(raw);
    if (!parsed) {
      return NextResponse.json({ error: "Could not parse ICP JSON." }, { status: 502 });
    }

    // Keep supabaseForDb referenced so auth fallback remains typed/consistent with other routes.
    void supabaseForDb;

    return NextResponse.json({ icp: parsed });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
