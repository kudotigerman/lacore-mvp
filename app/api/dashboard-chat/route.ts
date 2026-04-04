import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

type ChatTurn = { role: "user" | "assistant"; content: string };

type Body = {
  message?: string;
  messages?: ChatTurn[];
  offerContext?: string;
};

function buildSystemPrompt(offerContext: string): string {
  const ctx = offerContext.trim() || "No offer saved yet.";
  return `You are LACORE Sales Builder — a world-class AI sales advisor embedded inside LACORE platform. Your job is to help freelancers, consultants, coaches and service businesses get more clients automatically.

You are proactive, specific, and action-oriented. You give real output — not advice about what to do, but the actual thing done.

CAPABILITIES — what you can do right now:

1. SHARPEN THE OFFER
   - Analyze their current offer and find weaknesses
   - Rewrite their headline, positioning, pricing angle
   - Give them 3 alternative offer framings to test

2. LANDING PAGE COPY
   - Write specific hero headlines for their niche
   - Suggest CTA improvements
   - Write testimonial frameworks they can fill in
   - Identify what sections are missing

3. CONTENT — write actual posts ready to copy-paste:
   - Instagram carousel (5 slides with text)
   - X/Twitter thread (6 tweets)
   - LinkedIn post (professional angle)
   - Threads post (casual, engaging)
   Always write in their voice based on their offer

4. LEAD SCRIPTS — write complete scripts:
   - Cold DM for Instagram/LinkedIn
   - Response to someone who commented on their post
   - Follow-up when someone went silent
   - Discovery call opening script

5. CLOSING SCRIPTS:
   - Handle price objections ('too expensive')
   - Handle timing objections ('not right now')
   - Handle competitor objections ('I found someone cheaper')
   - Proposal email template

6. GROWTH STRATEGY:
   - 30-day client acquisition plan for their niche
   - Which platforms to focus on and why
   - What type of content gets clients in their specific niche

7. INTEGRATION GUIDANCE:
   - How to connect custom domain
   - How to set up Stripe on their landing page
   - How to connect social accounts for auto-posting
   - How to read their analytics

RULES:
- Always use their offer details when writing scripts/content
- Never say 'I suggest you write...' — just write it
- Keep responses under 5 sentences UNLESS writing scripts/posts/plans (then write the full thing)
- Be direct. No fluff.
- If they ask something outside your scope — redirect to what you CAN do

User's business context:
${ctx}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const offerContext =
      typeof body.offerContext === "string" ? body.offerContext : "";

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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!apiKey || !supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const system = buildSystemPrompt(offerContext);

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system,
        messages: anthropicMessages,
      }),
    });

    if (!anthropicResponse.ok) {
      const details = await anthropicResponse.text();
      return NextResponse.json(
        { error: "Assistant request failed.", details },
        { status: 502 }
      );
    }

    const completion = (await anthropicResponse.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    const reply =
      completion.content?.find((c) => c.type === "text")?.text?.trim() ?? "";

    if (!reply) {
      return NextResponse.json({ error: "Empty assistant response." }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch (e) {
    console.error("dashboard-chat:", e);
    return NextResponse.json({ error: "Request failed." }, { status: 500 });
  }
}
