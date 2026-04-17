import { NextResponse } from "next/server";
import { aiComplete, AI_BUSY_USER_MESSAGE } from "@/lib/claudeWithRetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type DemoPayload = {
  headline: string;
  personas: Array<{ title: string; pain: string }>;
  linkedinQuery: string;
};

type RateEntry = { count: number; resetAt: number };

const ONE_HOUR_MS = 60 * 60 * 1000;
const RATE_LIMIT = 5;
const rateStore = new Map<string, RateEntry>();

function getClientIp(request: Request) {
  const xff = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  return xff || real || "unknown";
}

function isValidPayload(value: unknown): value is DemoPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.headline === "string" &&
    typeof v.linkedinQuery === "string" &&
    Array.isArray(v.personas) &&
    v.personas.length === 3 &&
    v.personas.every(
      (p) =>
        p &&
        typeof p === "object" &&
        typeof (p as { title?: unknown }).title === "string" &&
        typeof (p as { pain?: unknown }).pain === "string"
    )
  );
}

function parsePayload(raw: string): DemoPayload | null {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  try {
    const parsed: unknown = JSON.parse(cleaned);
    return isValidPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const current = rateStore.get(ip);
  if (!current || current.resetAt <= now) {
    rateStore.set(ip, { count: 1, resetAt: now + ONE_HOUR_MS });
    return true;
  }
  if (current.count >= RATE_LIMIT) return false;
  rateStore.set(ip, { ...current, count: current.count + 1 });
  return true;
}

const SYSTEM = `You are LACORE AI. Given a service business offer, return STRICT JSON with:
- headline: 7-10 word landing page hero headline that sells the outcome, not the service
- personas: exactly 3 buyer personas, each with title (role+company type) and pain (one sentence)
- linkedinQuery: a Boolean search query ready to paste into LinkedIn, format like: "VP Engineering" AND "SaaS" AND ("churn" OR "retention")

Return only valid JSON, no markdown, no prose.`;

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many previews from this IP. Please try again in about an hour." },
        { status: 429 }
      );
    }

    const body = (await request.json()) as { offer?: string };
    const offer = typeof body.offer === "string" ? body.offer.trim() : "";
    if (offer.length < 10 || offer.length > 500) {
      return NextResponse.json({ error: "Offer must be between 10 and 500 characters." }, { status: 400 });
    }

    const userPrompt = `Offer: ${offer}`;
    let raw = "";
    try {
      raw = await aiComplete({
        system: SYSTEM,
        user: userPrompt,
        maxTokens: 1200
      });
    } catch {
      return NextResponse.json({ error: AI_BUSY_USER_MESSAGE }, { status: 503 });
    }

    const parsed = parsePayload(raw);
    if (!parsed) {
      return NextResponse.json({ error: "Could not parse AI response." }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
