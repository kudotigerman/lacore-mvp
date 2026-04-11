import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";
import type { LandingContent } from "@/types/landing";
import { PLANS, type PlanName } from "@/lib/plans";
import { checkCredits, deductCredits } from "@/lib/credits";

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
  project_id?: string;
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

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("display_name, plan, landing_generations_count")
      .eq("user_id", user.id)
      .maybeSingle();
    const profileDisplayName =
      typeof (profileRow as { display_name?: string } | null)?.display_name === "string"
        ? (profileRow as { display_name: string }).display_name.trim()
        : "";
    const profilePlan = ((profileRow as { plan?: string } | null)?.plan || "free") as PlanName;
    const generationCount = Number((profileRow as { landing_generations_count?: number } | null)?.landing_generations_count || 0);
    const plan = PLANS[profilePlan] ?? PLANS.free;
    if (generationCount >= plan.maxLandingGenerations) {
      return NextResponse.json(
        { error: "Generation limit reached. Upgrade your plan." },
        { status: 403 }
      );
    }

    if (!(await checkCredits(supabase, user.id, "generate_landing"))) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message: "Not enough credits. Please upgrade your plan or buy more credits."
        },
        { status: 402 }
      );
    }
    const brandNameLine =
      profileDisplayName.length > 0 ? profileDisplayName : "(not set in profile)";
    const displayName =
      profileDisplayName || body.businessName || body.userEmail.split("@")[0];
    const headlineRaw =
      typeof body.headline === "string" && body.headline.trim().length > 0
        ? body.headline.trim()
        : displayName;

    const jsonEndpoint = new URL("/api/generate-landing-json", request.url);
    const jsonResponse = await fetch(jsonEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        offer: body.offer,
        audience: body.audience,
        pricing: body.pricing,
        positioning: body.positioning,
        headline: body.headline,
        project_id: body.project_id ?? null,
        displayName: brandNameLine === "(not set in profile)" ? displayName : brandNameLine,
      }),
    });

    if (!jsonResponse.ok) {
      const details = await jsonResponse.text();
      return NextResponse.json({ error: "Claude request failed.", details }, { status: 502 });
    }

    const generated = (await jsonResponse.json()) as {
      success?: boolean;
      data?: LandingContent;
      error?: string;
    };
    if (!generated.success || !generated.data) {
      return NextResponse.json(
        { error: generated.error || "Invalid JSON generation response." },
        { status: 502 }
      );
    }

    const userMessage = `Generate a premium landing page for this business:

Brand name: ${brandNameLine}
Business name: ${displayName}
What they sell: ${body.offer}
Target audience: ${body.audience}
Pricing: ${body.pricing}
Positioning: ${body.positioning}
Suggested headline: ${body.headline}
Page title (exact inner text for the HTML <title> element — use verbatim, single line): ${headlineRaw}
Primary CTA goal: ${body.primaryGoal || "Book a call"}
Site vibe: ${body.siteVibe || "Professional"}

Use EXACTLY this content to generate the HTML landing page:
${JSON.stringify(generated.data)}

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
      .eq("project_id", body.project_id ?? null)
      .maybeSingle();

    const emailBase = body.userEmail
      .split("@")[0]
      .replace(/[^a-zA-Z0-9-]/g, "-")
      .toLowerCase();
    const slug = existingPage.data?.slug ?? `${emailBase}-${randomFourDigits()}`;
    const htmlWithSlug = injectSlug(html, slug);

    const deducted = await deductCredits(supabase, user.id, "generate_landing");
    if (!deducted) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message: "Not enough credits. Please upgrade your plan or buy more credits."
        },
        { status: 402 }
      );
    }

    const { error: upsertError } = await supabase
      .from("landing_pages")
      .upsert(
        {
          user_id: user.id,
          project_id: body.project_id ?? null,
          slug,
          html_content: htmlWithSlug,
          json_content: generated.data,
          jsx_content: null,
        } as never,
        { onConflict: "slug" }
      );

    if (upsertError) {
      return NextResponse.json(
        { error: "Failed to save.", details: upsertError.message },
        { status: 500 }
      );
    }

    await supabase
      .from("profiles")
      .update({ landing_generations_count: generationCount + 1 } as never)
      .eq("user_id", user.id);

    return NextResponse.json({ slug, success: true });
  } catch (error) {
    console.error("generate-landing error:", error);
    return NextResponse.json(
      { error: "Failed to generate. Please try again." },
      { status: 500 }
    );
  }
}
