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
  return `You are LACORE Assistant — an expert AI advisor inside the LACORE platform. You help users: optimize their offer and positioning, understand how to use dashboard features, plan their content strategy, improve their landing page, set up integrations, and grow their business. You have access to the user's offer data. Be concise, actionable, and direct. Max 3-4 sentences per response unless asked for more. Current user offer: ${offerContext}`;
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

    const system = buildSystemPrompt(offerContext || "No offer saved yet.");

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
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
