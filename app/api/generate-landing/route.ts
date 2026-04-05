import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

export const maxDuration = 120;

const systemPrompt = readFileSync(
  join(process.cwd(), "app/api/generate-landing/system-prompt.txt"),
  "utf8"
);

type LandingInput = {
  offer: string;
  audience: string;
  pricing: string;
  positioning: string;
  headline: string;
  userEmail: string;
  businessName?: string;
  primaryGoal?: string;
  siteVibe?: string;
};

function randomFourDigits() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function injectSlug(html: string, slug: string): string {
  return html.replaceAll("SLUG_VALUE", slug);
}

function cleanHtml(raw: string): string {
  return raw
    .replace(/^```(?:html)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LandingInput;
    if (!body.offer || !body.audience || !body.userEmail) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!apiKey || !supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Missing environment variables." }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Missing auth token." }, { status: 401 });

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const displayName = body.businessName || body.userEmail.split("@")[0];
    const headlineRaw =
      typeof body.headline === "string" && body.headline.trim().length > 0
        ? body.headline.trim()
        : displayName;

    const userMessage = `Generate a premium landing page for this business:

Business name: ${displayName}
What they sell: ${body.offer}
Target audience: ${body.audience}
Pricing: ${body.pricing}
Positioning: ${body.positioning}
Suggested headline: ${body.headline}
Page title (exact inner text for the HTML <title> element — use verbatim, single line): ${headlineRaw}
Primary CTA goal: ${body.primaryGoal || "Book a call"}
Site vibe: ${body.siteVibe || "Professional"}

Detect the language from the offer text. Write ALL copy in that language.
Contact form slug value: SLUG_VALUE

Return the complete HTML document only. No explanation.`;

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 12000,
        temperature: 0.8,
        stream: true,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!anthropicResponse.ok) {
      const details = await anthropicResponse.text();
      return NextResponse.json({ error: "Claude request failed.", details }, { status: 502 });
    }

    const streamBody = anthropicResponse.body;
    if (!streamBody) {
      return NextResponse.json({ error: "No response body from Claude." }, { status: 502 });
    }

    const reader = streamBody.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let lineBuffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        lineBuffer += chunk;
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]" || !data) continue;
          try {
            const parsed = JSON.parse(data) as {
              delta?: { text?: string };
              content?: Array<{ text?: string }>;
            };
            const text =
              parsed?.delta?.text || parsed?.content?.[0]?.text || "";
            fullText += text;
          } catch {
            /* ignore malformed SSE JSON */
          }
        }
      }
      if (lineBuffer.startsWith("data: ")) {
        const data = lineBuffer.slice(6).trim();
        if (data && data !== "[DONE]") {
          try {
            const parsed = JSON.parse(data) as {
              delta?: { text?: string };
              content?: Array<{ text?: string }>;
            };
            const text =
              parsed?.delta?.text || parsed?.content?.[0]?.text || "";
            fullText += text;
          } catch {
            /* ignore */
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    const rawText = fullText.trim();
    const html = cleanHtml(rawText);

    if (!html.startsWith("<!DOCTYPE html>") && !html.startsWith("<html")) {
      return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 502 });
    }

    const existingPage = await supabase
      .from("landing_pages")
      .select("slug")
      .eq("user_id", user.id)
      .maybeSingle();

    const emailBase = body.userEmail
      .split("@")[0]
      .replace(/[^a-zA-Z0-9-]/g, "-")
      .toLowerCase();
    const slug = existingPage.data?.slug ?? `${emailBase}-${randomFourDigits()}`;
    const htmlWithSlug = injectSlug(html, slug);

    const { error: upsertError } = await supabase
      .from("landing_pages")
      .upsert(
        { user_id: user.id, slug, html_content: htmlWithSlug, jsx_content: null } as never,
        { onConflict: "slug" }
      );

    if (upsertError) {
      return NextResponse.json(
        { error: "Failed to save.", details: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ slug, success: true });
  } catch (error) {
    console.error("generate-landing error:", error);
    return NextResponse.json(
      { error: "Failed to generate. Please try again." },
      { status: 500 }
    );
  }
}
