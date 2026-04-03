import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type EditPayload = {
  slug: string;
  instruction: string;
  currentHtml?: string;
  currentJsx?: string;
};

const editHtmlSystemPrompt = `You are an expert landing page editor. You will receive an HTML landing page and an instruction to modify it. Make ONLY the requested changes. Keep all other content identical. Return the complete modified HTML. No markdown, no explanation. Start with <!DOCTYPE html>.`;

const editJsxSystemPrompt = `You are an expert React developer. You will receive the full source of a LandingPage React component and an instruction to modify it.

RULES:
- Component name stays: LandingPage
- Use ONLY inline styles, no CSS files, no Tailwind classes
- No imports except: import React, { useState } from 'react';
- Contact form must keep posting to /api/leads with JSON { name, email, message, slug }
- Preserve the hardcoded slug string in the source (do not change it unless the instruction asks)
- Return the COMPLETE modified component only. No markdown. No explanation. Start with: import React, { useState } from 'react';`;

function cleanClaudeCode(text: string): string {
  return text.replace(/^```(?:tsx|jsx|typescript)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EditPayload;
    if (!body.slug || !body.instruction) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const useJsx = Boolean(body.currentJsx?.trim());
    const useHtml = Boolean(body.currentHtml?.trim());
    if (!useJsx && !useHtml) {
      return NextResponse.json({ error: "Missing current page content." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!apiKey || !supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Missing API or Supabase environment variables." }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing authorization token." }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const system = useJsx ? editJsxSystemPrompt : editHtmlSystemPrompt;
    const userContent = useJsx
      ? `CURRENT JSX:\n${body.currentJsx}\n\nINSTRUCTION: ${body.instruction}`
      : `CURRENT HTML:\n${body.currentHtml}\n\nINSTRUCTION: ${body.instruction}`;

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16000,
        system,
        messages: [{ role: "user", content: userContent }]
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
    const raw = completion.content?.find((item) => item.type === "text")?.text?.trim();
    if (!raw) {
      return NextResponse.json({ error: "Empty response from Claude." }, { status: 502 });
    }

    if (useJsx) {
      const jsx = cleanClaudeCode(raw);
      const okImport =
        jsx.startsWith("import React, { useState } from 'react'") ||
        jsx.startsWith('import React, { useState } from "react"');
      if (!okImport || !/\bexport\s+default\s+/.test(jsx) || !/\bLandingPage\b/.test(jsx)) {
        return NextResponse.json({ error: "Invalid JSX returned from Claude." }, { status: 502 });
      }

      const { error: saveError } = await supabase
        .from("landing_pages")
        .update({ jsx_content: jsx } as never)
        .eq("slug", body.slug)
        .eq("user_id", user.id);

      if (saveError) {
        return NextResponse.json({ error: "Failed to save edited page.", details: saveError.message }, { status: 500 });
      }

      return NextResponse.json({ jsx, success: true });
    }

    const html = cleanClaudeCode(raw);
    if (!html.startsWith("<!DOCTYPE html>")) {
      return NextResponse.json({ error: "Invalid HTML returned from Claude." }, { status: 502 });
    }

    const { error: saveError } = await supabase
      .from("landing_pages")
      .update({ html_content: html } as never)
      .eq("slug", body.slug)
      .eq("user_id", user.id);

    if (saveError) {
      return NextResponse.json({ error: "Failed to save edited page.", details: saveError.message }, { status: 500 });
    }

    return NextResponse.json({ html, success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    return NextResponse.json({ error: "Failed to edit landing page.", details: message }, { status: 500 });
  }
}
