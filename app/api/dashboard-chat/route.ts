import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { aiCompleteMessages, AI_BUSY_USER_MESSAGE, hasAiProviderConfigured } from "@/lib/claudeWithRetry";

export const maxDuration = 60;

type ChatTurn = { role: "user" | "assistant"; content: string };

type SalesContextPayload = {
  offer?: string;
  audience?: string;
  pricing?: string;
  positioning?: string;
  headline?: string;
  slug?: string | null;
};

type Body = {
  message?: string;
  messages?: ChatTurn[];
  /** @deprecated prefer salesContext */
  offerContext?: string;
  salesContext?: SalesContextPayload;
};

function normalizeSalesContext(body: Body): {
  offer: string;
  audience: string;
  pricing: string;
  positioning: string;
  headline: string;
  slug: string;
} {
  const sc = body.salesContext;
  if (sc && typeof sc === "object") {
    const slug = sc.slug === null || sc.slug === undefined ? "" : String(sc.slug);
    return {
      offer: typeof sc.offer === "string" ? sc.offer : "",
      audience: typeof sc.audience === "string" ? sc.audience : "",
      pricing: typeof sc.pricing === "string" ? sc.pricing : "",
      positioning: typeof sc.positioning === "string" ? sc.positioning : "",
      headline: typeof sc.headline === "string" ? sc.headline : "",
      slug
    };
  }
  const raw = typeof body.offerContext === "string" ? body.offerContext.trim() : "";
  return {
    offer: raw || "(No structured context.)",
    audience: "",
    pricing: "",
    positioning: "",
    headline: "",
    slug: ""
  };
}

function buildSystemPrompt(ctx: ReturnType<typeof normalizeSalesContext>): string {
  const landingLine = ctx.slug.trim()
    ? `https://www.lacore.ai/p/${ctx.slug.trim()}`
    : "Not published yet (no landing page slug).";

  return `You are the LACORE Sales Builder — an elite AI sales strategist built into the LACORE platform. You have full context about the user's business.

USER CONTEXT:
- Offer: ${ctx.offer}
- Audience: ${ctx.audience}
- Pricing: ${ctx.pricing}
- Positioning: ${ctx.positioning}
- Headline: ${ctx.headline}
- Landing page: ${landingLine}

YOUR CAPABILITIES:
1. SHARPEN THE OFFER — Rewrite and improve their offer to be more compelling, specific, and high-converting. Give 3 concrete alternatives.
2. LANDING PAGE COPY — Write specific headlines, subheadlines, bullet points, and CTAs for their landing page. Be specific to their offer.
3. CONTENT — Write ready-to-post content for Instagram, X, LinkedIn, Threads, Telegram. Adapt format and tone per platform.
4. LEAD SCRIPTS — Write cold DM scripts, email templates, LinkedIn outreach. Personalized to their offer and audience.
5. CLOSING SCRIPTS — Handle objections, write follow-up sequences, closing techniques specific to their pricing.
6. GROWTH STRATEGY — Give a concrete 30-day action plan with daily tasks. Be specific, not generic.
7. PLATFORM GUIDANCE — Help them use LACORE features: how to edit their landing page, connect domain, set up Stripe, generate content.

RULES:
- Always respond in the same language the user writes in
- Be direct, confident, specific — never generic
- Always reference their specific offer, audience, and pricing
- Give concrete examples, not theory
- When suggesting content, write the actual content — not instructions on how to write it
- Maximum response length: clear and scannable, use line breaks
- Never say you cannot help — find a way to be useful`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    let anthropicMessages: Array<{ role: "user" | "assistant"; content: string }>;

    if (Array.isArray(body.messages) && body.messages.length > 0) {
      anthropicMessages = body.messages
        .filter(
          (m): m is ChatTurn =>
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string" &&
            m.content.trim().length > 0
        )
        .map((m) => ({ role: m.role, content: m.content.trim() }));
    } else if (typeof body.message === "string" && body.message.trim()) {
      anthropicMessages = [{ role: "user", content: body.message.trim() }];
    } else {
      return NextResponse.json({ error: "Missing message or messages." }, { status: 400 });
    }

    const last = anthropicMessages[anthropicMessages.length - 1];
    if (last?.role !== "user") {
      return NextResponse.json({ error: "Last message must be from user." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey || !hasAiProviderConfigured()) {
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const system = buildSystemPrompt(normalizeSalesContext(body));

    let reply: string;
    try {
      reply = await aiCompleteMessages({
        system,
        messages: anthropicMessages,
        maxTokens: 4096,
        model: "claude-haiku-4-5-20251001",
      });
    } catch {
      return NextResponse.json({ error: AI_BUSY_USER_MESSAGE }, { status: 503 });
    }
    reply = reply.trim();
    if (!reply) {
      return NextResponse.json({ error: AI_BUSY_USER_MESSAGE }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch (e) {
    console.error("dashboard-chat:", e);
    return NextResponse.json({ error: "Request failed." }, { status: 500 });
  }
}
