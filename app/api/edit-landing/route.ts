import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { compileLandingJsx } from "@/lib/compileLandingJsx";

export const maxDuration = 60;

type EditPayload = {
  slug: string;
  instruction: string;
  currentHtml?: string;
  currentJsx?: string;
};

const editJsxSystemPrompt = `You are editing a React landing page component. The user wants a specific change.

RULES:
- Return the COMPLETE updated React component starting with: import React, { useState } from 'react';
- Make ONLY the requested change, keep everything else identical
- Preserve all existing inline styles, animations, sections
- Do not add markdown, backticks, or explanation
- The component must be valid JSX that compiles without errors
- Keep all existing useState hooks and useEffect hooks
- Do not remove any sections

CRITICAL: The component MUST end with: export default LandingPage;
This is required. Never omit it. Never use module.exports. Always use: export default LandingPage;`;

const editHtmlSystemPrompt = `You are editing an HTML landing page. The user wants a specific change.

RULES:
- Return the COMPLETE updated HTML document starting with <!DOCTYPE html>
- Make ONLY the requested change, keep everything else identical
- Do not add markdown, backticks, or explanation`;

function cleanClaudeCode(text: string): string {
  return text.replace(/^```(?:tsx|jsx|typescript|html)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
}

function ensureExportDefaultLandingPage(jsx: string): string {
  if (!jsx.includes("export default LandingPage")) {
    if (/\bexport\s+default\s+function\s+LandingPage\b/.test(jsx)) {
      return jsx;
    }
    jsx = jsx + "\nexport default LandingPage;";
  }
  return jsx;
}

function validateJsxShape(jsx: string): string | null {
  const okImport =
    jsx.startsWith("import React, { useState } from 'react'") ||
    jsx.startsWith('import React, { useState } from "react"');
  if (!okImport) {
    return "Response must start with import React, { useState } from 'react'.";
  }
  if (!/\bLandingPage\b/.test(jsx)) return "Response must define LandingPage.";
  if (!/\bexport\s+default\s+/.test(jsx)) return "Response must export default LandingPage.";
  return null;
}

function tryCompileJsx(jsx: string): { ok: true } | { ok: false; message: string } {
  try {
    compileLandingJsx(jsx);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

async function callClaude(apiKey: string, system: string, userContent: string): Promise<string> {
  const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system,
      messages: [{ role: "user", content: userContent }]
    })
  });

  if (!anthropicResponse.ok) {
    const details = await anthropicResponse.text();
    throw new Error(`Claude request failed: ${anthropicResponse.status} ${details}`);
  }

  const completion = (await anthropicResponse.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const raw = completion.content?.find((item) => item.type === "text")?.text?.trim();
  if (!raw) {
    throw new Error("Empty response from Claude.");
  }
  return cleanClaudeCode(raw);
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

    if (useJsx && body.currentJsx) {
      const baseUser = `Here is the current component:
${body.currentJsx}

Make this change: ${body.instruction}

Return the complete updated component.`;

      let jsx: string;
      try {
        jsx = await callClaude(apiKey, editJsxSystemPrompt, baseUser);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Claude request failed.";
        return NextResponse.json({ error: msg }, { status: 502 });
      }

      jsx = ensureExportDefaultLandingPage(jsx);

      let shapeErr = validateJsxShape(jsx);
      if (shapeErr) {
        return NextResponse.json({ error: shapeErr }, { status: 502 });
      }

      let compiled = tryCompileJsx(jsx);
      if (!compiled.ok) {
        const retryUser = `${baseUser}

Previous output did not compile (${compiled.message}). Fix the JSX and return the complete valid component again.`;
        try {
          jsx = await callClaude(apiKey, editJsxSystemPrompt, retryUser);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Claude request failed on retry.";
          return NextResponse.json({ error: msg }, { status: 502 });
        }
        jsx = ensureExportDefaultLandingPage(jsx);
        shapeErr = validateJsxShape(jsx);
        if (shapeErr) {
          return NextResponse.json({ error: shapeErr }, { status: 502 });
        }
        compiled = tryCompileJsx(jsx);
        if (!compiled.ok) {
          return NextResponse.json(
            { error: `Updated JSX failed to compile: ${compiled.message}` },
            { status: 502 }
          );
        }
      }

      const { error: saveError } = await supabase
        .from("landing_pages")
        .update({ jsx_content: jsx } as never)
        .eq("slug", body.slug)
        .eq("user_id", user.id);

      if (saveError) {
        return NextResponse.json({ error: "Failed to save edited page.", details: saveError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, jsx });
    }

    const htmlUser = `Here is the current page:
${body.currentHtml}

Make this change: ${body.instruction}

Return the complete updated HTML.`;

    let html: string;
    try {
      html = await callClaude(apiKey, editHtmlSystemPrompt, htmlUser);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Claude request failed.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

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

    return NextResponse.json({ success: true, html });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    return NextResponse.json({ error: "Failed to edit landing page.", details: message }, { status: 500 });
  }
}
