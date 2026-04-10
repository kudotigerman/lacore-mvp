import { NextResponse } from "next/server";
import type { LandingContent } from "@/types/landing";

type Payload = {
  offer: string;
  audience: string;
  pricing: string;
  positioning: string;
  headline: string;
  displayName?: string;
};

const systemPrompt = `You are an expert conversion copywriter. Generate landing page content as a valid JSON object.

Output ONLY a JSON object with this exact structure, no markdown:
{
  niche: one of [fitness|designer|developer|coach|consultant|agency|course|local|default],
  brand: display name or first word from offer,
  badge: 3-4 word category label in UPPERCASE,
  headline: first part of headline (4-5 words MAX, ALL CAPS),
  headlineAccent: accented second part (2-4 words MAX, ALL CAPS) - the emotional hook,
  subheadline: 1-2 sentences specific to their offer and audience,
  ctaPrimary: action-oriented button text (3-5 words),
  ctaSecondary: secondary action (2-3 words),
  socialProof: 'Trusted by X+ [niche] professionals',
  stats: [{number, label}, {number, label}, {number, label}] - specific numbers,
  problemHeadline: 8-10 words hitting main pain,
  problems: [{emoji, title (3-4 words), desc (1-2 sentences)}, x3],
  solutionHeadline: 6-8 words,
  features: [{icon: one of [Zap|Target|Shield|TrendingUp|Clock|Users|Star|Check], title (3-4 words), desc (1-2 sentences)}, x3],
  processHeadline: 6-8 words,
  steps: [{title (3-4 words), desc (1-2 sentences)}, x3],
  testimonialsHeadline: 5-7 words,
  testimonials: [{text (2-3 sentences with specific results), name (realistic), role (job + company)}, x3],
  ctaHeadline: bold promise 5-6 words,
  ctaSubtext: 1 sentence,
  ctaButton: 3-5 word action,
  formHeadline: 4-6 words,
  formButton: 3-5 word action
}

Rules:
- Same language as the offer
- NO lorem ipsum, NO generic phrases
- Testimonials must include specific numbers (%, $, kg, days)
- Stats must be plausible and specific
- Never use 'Take your business to the next level'`;

function parseClaudeJson(raw: string): LandingContent | null {
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned) as LandingContent;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    if (!body.offer || !body.audience) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing environment variables." }, { status: 500 });
    }

    const userMessage = `Generate JSON landing content.
Display name: ${body.displayName || ""}
Offer: ${body.offer}
Audience: ${body.audience}
Pricing: ${body.pricing}
Positioning: ${body.positioning}
Suggested headline: ${body.headline}`;

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 6000,
        temperature: 0.8,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!anthropicResponse.ok) {
      const details = await anthropicResponse.text();
      return NextResponse.json({ error: "Claude request failed.", details }, { status: 502 });
    }

    const parsed = (await anthropicResponse.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = parsed.content?.find((x) => x.type === "text")?.text ?? "";
    const json = parseClaudeJson(text);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON returned from Claude." }, { status: 502 });
    }

    return NextResponse.json({ success: true, data: json });
  } catch (error) {
    console.error("generate-landing-json error:", error);
    return NextResponse.json({ error: "Failed to generate JSON." }, { status: 500 });
  }
}
