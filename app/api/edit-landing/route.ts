import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";
import { compileLandingJsx } from "@/lib/compileLandingJsx";

export const maxDuration = 120;

type EditPayload = {
  slug: string;
  instruction: string;
  currentHtml?: string;
  currentJsx?: string;
  imageBase64?: string;
  imageMediaType?: string;
};

type ClaudeUserContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
    >;

function normalizeClaudeImageMediaType(raw?: string): string | null {
  const r = (raw ?? "image/jpeg").split(";")[0].trim().toLowerCase();
  if (r === "image/jpg") return "image/jpeg";
  if (["image/jpeg", "image/png", "image/gif", "image/webp"].includes(r)) return r;
  return null;
}

function buildClaudeUserContent(textBody: string, imageBase64?: string, imageMediaType?: string): ClaudeUserContent {
  const b64 = imageBase64?.replace(/\s/g, "").trim();
  if (!b64) return textBody;
  const mediaType = normalizeClaudeImageMediaType(imageMediaType);
  if (!mediaType) return textBody;
  return [
    { type: "image", source: { type: "base64", media_type: mediaType, data: b64 } },
    { type: "text", text: textBody }
  ];
}

const editHtmlSystemPrompt = readFileSync(
  join(process.cwd(), "app/api/edit-landing/edit-html-system-prompt.txt"),
  "utf8"
);

const editJsxSystemPrompt = readFileSync(
  join(process.cwd(), "app/api/edit-landing/edit-jsx-system-prompt.txt"),
  "utf8"
);

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
  if (!jsx.includes("import React")) {
    return "Response must contain import React.";
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

async function callClaude(apiKey: string, system: string, userContent: ClaudeUserContent): Promise<string> {
  const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 12000,
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
    const instruction = typeof body.instruction === "string" ? body.instruction.trim() : "";
    const imageBase64 =
      typeof body.imageBase64 === "string" ? body.imageBase64.replace(/\s/g, "").trim() : "";
    const imageMediaTypeRaw =
      typeof body.imageMediaType === "string" ? body.imageMediaType.trim() : "";

    if (!body.slug || (!instruction && !imageBase64)) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    if (imageBase64) {
      const mt = normalizeClaudeImageMediaType(imageMediaTypeRaw || "image/jpeg");
      if (!mt) {
        return NextResponse.json(
          { error: "Unsupported image type. Use JPEG, PNG, GIF, or WebP." },
          { status: 400 }
        );
      }
    }

    const effectiveInstruction =
      instruction ||
      (imageBase64
        ? "The user attached an image without extra text. Analyze it and apply it sensibly to the landing page (e.g. hero photo, background, or style reference)."
        : "");

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

Make this change: ${effectiveInstruction}

Return the complete updated component.`;

      const userContent = buildClaudeUserContent(baseUser, imageBase64 || undefined, imageMediaTypeRaw);

      let jsx: string;
      try {
        jsx = await callClaude(apiKey, editJsxSystemPrompt, userContent);
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
        const retryText = `${baseUser}

Previous output did not compile (${compiled.message}). Fix the JSX and return the complete valid component again.`;
        const retryContent = buildClaudeUserContent(retryText, imageBase64 || undefined, imageMediaTypeRaw);
        try {
          jsx = await callClaude(apiKey, editJsxSystemPrompt, retryContent);
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

Make this change: ${effectiveInstruction}

Return the complete updated HTML.`;

    const htmlContent = buildClaudeUserContent(htmlUser, imageBase64 || undefined, imageMediaTypeRaw);

    let html: string;
    try {
      html = await callClaude(apiKey, editHtmlSystemPrompt, htmlContent);
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
