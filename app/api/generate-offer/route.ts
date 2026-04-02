import { NextResponse } from "next/server";

const systemPrompt = `You are a world-class business strategist and copywriter. Given what someone sells, generate 3 distinct positioning strategies as a JSON array. Each strategy must be genuinely different in target audience, pricing model, and positioning angle.

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
    const { userInput } = (await request.json()) as { userInput?: string };

    if (!userInput || !userInput.trim()) {
      return NextResponse.json({ error: "Missing user input." }, { status: 400 });
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

    return NextResponse.json({ variants });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    return NextResponse.json({ error: "Failed to generate offer.", details: message }, { status: 500 });
  }
}
