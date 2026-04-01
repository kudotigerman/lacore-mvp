import { NextResponse } from "next/server";

const systemPrompt = `You are a world-class marketing strategist. Based on the user's description, generate a sharp business offer in this exact JSON format:
{
  offer: string (one compelling sentence: what + for who + outcome),
  audience: string (specific target customer profile),
  pricing: string (recommended pricing model and price point),
  positioning: string (how to stand out from competitors, 2-3 sentences),
  headline: string (landing page headline for their offer)
}
Return only valid JSON, no markdown, no explanation.`;

type Offer = {
  offer: string;
  audience: string;
  pricing: string;
  positioning: string;
  headline: string;
};

function isOffer(value: unknown): value is Offer {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.offer === "string" &&
    typeof obj.audience === "string" &&
    typeof obj.pricing === "string" &&
    typeof obj.positioning === "string" &&
    typeof obj.headline === "string"
  );
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
        max_tokens: 700,
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

    const text = completion.content?.find((item) => item.type === "text")?.text;
    if (!text) {
      return NextResponse.json({ error: "No text returned from Claude." }, { status: 502 });
    }

    const parsed: unknown = JSON.parse(text);
    if (!isOffer(parsed)) {
      return NextResponse.json({ error: "Claude returned invalid offer schema." }, { status: 502 });
    }

    return NextResponse.json({ offer: parsed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    return NextResponse.json({ error: "Failed to generate offer.", details: message }, { status: 500 });
  }
}
