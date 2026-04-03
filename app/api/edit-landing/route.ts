import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type EditPayload = {
  slug: string;
  instruction: string;
  currentHtml?: string;
  currentJsx?: string;
};

const diffSystemPrompt = `You are a precise code editor. The user wants to change something on their landing page.

Analyze the instruction and return a JSON object with one of these formats:

For text/label changes:
{ "type": "replace", "find": "exact text to find", "replace": "new text" }

For color changes:
{ "type": "style", "find": "exact color value like #C8A84C or 'gold' or background: '#000'", "replace": "new color value" }

For multiple changes:
{ "type": "multi", "changes": [{ "find": "...", "replace": "..." }, ...] }

For structural changes (add/remove sections, change layout) on a React landing:
{ "type": "rewrite", "jsx": "complete new JSX component" }

For structural changes on a legacy HTML landing:
{ "type": "rewrite", "html": "complete new HTML document starting with <!DOCTYPE html>" }

RULES:
- Always try 'replace' or 'style' first — only use 'rewrite' when absolutely necessary
- 'find' must be the EXACT string as it appears in the source (JSX or HTML)
- For button text: find the exact label text
- For colors: find the exact color string
- Return ONLY valid JSON, nothing else`;

function extractCommonStrings(source: string, limit = 20): string[] {
  const re = /['"`]([^'"`]{3,50})['"`]/g;
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const s = m[1];
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
      if (out.length >= limit) break;
    }
  }
  return out;
}

function parseJsonFromClaude(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  return JSON.parse(cleaned) as unknown;
}

function replaceAllExact(haystack: string, find: string, replace: string): string {
  if (!haystack.includes(find)) {
    throw new Error(`Could not find exact string in source: ${find.slice(0, 120)}${find.length > 120 ? "…" : ""}`);
  }
  return haystack.split(find).join(replace);
}

type ParsedDiff =
  | { kind: "patch"; fast: true; apply: (content: string) => string }
  | { kind: "rewrite"; fast: false; content: string; format: "jsx" | "html" };

function parseDiff(raw: unknown, mode: "jsx" | "html"): ParsedDiff | { error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "Invalid diff: not an object." };
  }
  const o = raw as Record<string, unknown>;
  const t = o.type;
  if (t === "replace" || t === "style") {
    if (typeof o.find !== "string" || typeof o.replace !== "string") {
      return { error: "Invalid replace/style diff: missing find or replace string." };
    }
    const find = o.find;
    const rep = o.replace;
    return {
      kind: "patch",
      fast: true,
      apply: (content: string) => replaceAllExact(content, find, rep)
    };
  }
  if (t === "multi") {
    if (!Array.isArray(o.changes)) {
      return { error: "Invalid multi diff: changes must be an array." };
    }
    const pairs: { find: string; replace: string }[] = [];
    for (const item of o.changes) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return { error: "Invalid multi diff: each change must be an object." };
      }
      const c = item as Record<string, unknown>;
      if (typeof c.find !== "string" || typeof c.replace !== "string") {
        return { error: "Invalid multi diff: each change needs find and replace strings." };
      }
      pairs.push({ find: c.find, replace: c.replace });
    }
    return {
      kind: "patch",
      fast: true,
      apply: (content: string) => {
        let next = content;
        for (const { find, replace } of pairs) {
          next = replaceAllExact(next, find, replace);
        }
        return next;
      }
    };
  }
  if (t === "rewrite") {
    if (mode === "jsx") {
      if (typeof o.jsx !== "string" || !o.jsx.trim()) {
        return { error: "Invalid rewrite diff: missing jsx string." };
      }
      return { kind: "rewrite", fast: false, content: o.jsx.trim(), format: "jsx" };
    }
    if (typeof o.html !== "string" || !o.html.trim()) {
      return { error: "Invalid rewrite diff: missing html string." };
    }
    return { kind: "rewrite", fast: false, content: o.html.trim(), format: "html" };
  }
  return { error: `Unknown diff type: ${String(t)}` };
}

function validateJsx(jsx: string): string | null {
  const okImport =
    jsx.startsWith("import React, { useState } from 'react'") ||
    jsx.startsWith('import React, { useState } from "react"');
  if (!okImport) return "Rewritten JSX must start with import React, { useState } from 'react'.";
  if (!/\bLandingPage\b/.test(jsx)) return "Rewritten JSX must define LandingPage.";
  if (!/\bexport\s+default\s+/.test(jsx)) return "Rewritten JSX must export default LandingPage.";
  return null;
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

    const mode = useJsx ? "jsx" : "html";
    const fullSource = (useJsx ? body.currentJsx : body.currentHtml) as string;
    const common = extractCommonStrings(fullSource, 20);
    const prefixLabel = useJsx ? "Current JSX" : "Current HTML";
    const userContent = `${prefixLabel} (first 200 chars for context): ${fullSource.slice(0, 200)}...

Instruction: ${body.instruction}

Common strings in this component you might need:
${common.length ? common.join("\n") : "(none extracted)"}`;

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
        system: diffSystemPrompt,
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

    let parsedUnknown: unknown;
    try {
      parsedUnknown = parseJsonFromClaude(raw);
    } catch {
      return NextResponse.json({ error: "Claude returned invalid JSON." }, { status: 502 });
    }

    const parsed = parseDiff(parsedUnknown, mode);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 502 });
    }

    if (parsed.kind === "patch") {
      let updated: string;
      try {
        updated = parsed.apply(fullSource);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Patch failed.";
        return NextResponse.json({ error: msg }, { status: 422 });
      }

      if (useJsx) {
        const { error: saveError } = await supabase
          .from("landing_pages")
          .update({ jsx_content: updated } as never)
          .eq("slug", body.slug)
          .eq("user_id", user.id);

        if (saveError) {
          return NextResponse.json({ error: "Failed to save edited page.", details: saveError.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, jsx: updated, fast: true });
      }

      const { error: saveError } = await supabase
        .from("landing_pages")
        .update({ html_content: updated } as never)
        .eq("slug", body.slug)
        .eq("user_id", user.id);

      if (saveError) {
        return NextResponse.json({ error: "Failed to save edited page.", details: saveError.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, html: updated, fast: true });
    }

    const rewritten = parsed.content;
    if (parsed.format === "jsx") {
      const err = validateJsx(rewritten);
      if (err) {
        return NextResponse.json({ error: err }, { status: 502 });
      }
      const { error: saveError } = await supabase
        .from("landing_pages")
        .update({ jsx_content: rewritten } as never)
        .eq("slug", body.slug)
        .eq("user_id", user.id);

      if (saveError) {
        return NextResponse.json({ error: "Failed to save edited page.", details: saveError.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, jsx: rewritten, fast: false });
    }

    if (!rewritten.startsWith("<!DOCTYPE html>")) {
      return NextResponse.json({ error: "Rewritten HTML must start with <!DOCTYPE html>." }, { status: 502 });
    }
    const { error: saveError } = await supabase
      .from("landing_pages")
      .update({ html_content: rewritten } as never)
      .eq("slug", body.slug)
      .eq("user_id", user.id);

    if (saveError) {
      return NextResponse.json({ error: "Failed to save edited page.", details: saveError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, html: rewritten, fast: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    return NextResponse.json({ error: "Failed to edit landing page.", details: message }, { status: 500 });
  }
}
