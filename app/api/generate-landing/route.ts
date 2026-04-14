import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { LandingContent } from "@/types/landing";
import { aiComplete, AI_BUSY_USER_MESSAGE, hasAiProviderConfigured } from "@/lib/claudeWithRetry";
import { PLANS, type PlanName } from "@/lib/plans";
import { checkCredits, deductCredits } from "@/lib/credits";

export const maxDuration = 120;

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
  style?: string;
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

function randomFourDigits() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LandingInput;
    if (!body.offer || !body.audience || !body.userEmail) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Missing environment variables." }, { status: 500 });
    }

    if (!hasAiProviderConfigured()) {
      return NextResponse.json({ error: "Server AI is not configured." }, { status: 500 });
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
    const requestedStyle = typeof body.style === "string" ? body.style : "dark-indigo";
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

    const userMessage = `Generate JSON landing content for this business:

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
Style: ${requestedStyle}

Detect the language from the offer text. Write ALL copy in that language.
Output ONLY valid JSON matching the schema in your instructions. No markdown.`;

    let rawText: string;
    try {
      rawText = await aiComplete({
        system: systemPrompt,
        user: userMessage,
        maxTokens: 4000,
      });
    } catch {
      return NextResponse.json({ error: AI_BUSY_USER_MESSAGE }, { status: 503 });
    }

    const parsed = parseClaudeJson(rawText);
    if (!parsed) {
      return NextResponse.json(
        { error: "Could not parse landing content from AI. Please try again." },
        { status: 502 }
      );
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
          html_content: null,
          json_content: parsed,
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
