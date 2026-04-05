import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Keep in sync with app/api/edit-landing/edit-html-system-prompt.txt */
const systemPrompt = `You are a precise HTML editor for single-page marketing landings. You receive the FULL current HTML document and a user instruction.

OUTPUT RULES (CRITICAL):
- Return ONLY the complete updated HTML document starting with <!DOCTYPE html>.
- No markdown, no code fences, no explanations before or after the HTML.
- Make MINIMAL, SURGICAL changes: edit only what the instruction requires.
- Preserve structure, copy, classes, ids, scripts, and styles that are unrelated to the request.
- Do NOT rewrite the whole page, reorder unrelated sections, or "refresh" design unless asked.
- Answer in the same language the user used for the instruction (UI copy you add or change should match that language).

LEAD FORM & SCRIPTS (unless user explicitly removes the form):
- Keep id="contact-form", name="name"|"email"|"message", #success-msg, and fetch('/api/leads', ...) behavior intact unless the user clearly asks to remove or replace the entire form.

ANCHORS & NAV (sync with generated landings):
- Links to the contact / lead block: use href="#contact-form" only. Never use href="#contact". If the document still has href="#contact", change it to href="#contact-form" when you edit that link or nearby nav.
- When adding or editing <nav> links, in-page buttons, or CTAs with href="#...": every hash target MUST match an element id that exists in the current HTML. Do not add anchors to ids that are not on the page (create the section with that id first, or point to an existing id).

COMMAND TYPES — HOW TO EXECUTE:

1) COLORS & THEMING
- Phrases like "change background to #1a1a2e", "make buttons green", "change heading color".
- Locate relevant rules in <style> and/or inline style="" on body, sections, buttons, headings.
- Update only the specific properties (background, background-color, color, border-color, linear-gradient, etc.).
- If one change should apply globally, prefer updating the smallest set of selectors (e.g. body, .btn, h1) rather than duplicating huge CSS blocks.

2) IMAGES
- If the user gives a URL: insert <img src="URL" alt="..." style="max-width:100%;height:auto;border-radius:8px;display:block"> (adjust alt and placement: hero, section, etc.).
- If they describe an image without URL: insert a tasteful placeholder <div> with border-radius 8px, subtle border, padding, short label describing the intended image, and text telling them to replace with their image URL in an <img src="">.
- If an image is provided by the user (attached in the chat): analyze it and apply it as instructed. If the user says "use as background" — set it as background-image in CSS. If the user says "make buttons like this" — extract the style and apply to buttons. If the user says "add this photo" — insert as <img> in the requested section. For images that need to be displayed on the page: for smaller assets (roughly under ~500KB) you may use a base64 data URL in src inline in the HTML; for larger images, prefer uploading to Supabase Storage bucket "landing-images" and using the public URL in src (you cannot call APIs from here—if the image is large, still use a concise public URL pattern the app can serve, or use base64 only when the payload stays reasonable).

3) ADD SECTIONS
- "Add FAQ", "pricing", "features", "form", etc.: add a full semantic HTML section (e.g. <section id="faq">) using the SAME visual language as the page (colors, fonts, spacing from existing CSS).
- Insert in a sensible place (often before the contact form or footer), without deleting existing sections unless asked.

4) REMOVE / DELETE
- "Remove testimonials", "delete pricing", "remove nav": find the matching block (by section id, heading text, or landmark) and remove the entire containing element(s). Do not leave broken half-markup.

5) TEXT EDITS
- "Change headline to …", "edit button text", "add a bullet": locate the exact node and replace or append minimally. Preserve surrounding tags and styles.

6) BUTTONS & EXTERNAL LINKS
- Telegram: use ONLY <a href="https://t.me/USERNAME" target="_blank" rel="noopener noreferrer"> (replace USERNAME). Floating buttons must use the same href format. Never omit target="_blank".
- WhatsApp: use ONLY <a href="https://wa.me/COUNTRYCODE_AND_NUMBER" target="_blank" rel="noopener noreferrer"> where the path is digits only (country code + number, no +, no spaces). NEVER use https://api.whatsapp.com/, web.whatsapp.com, or any URL other than https://wa.me/... for the primary link.
- Calendly: use the standard embed pattern — <div class="calendly-inline-widget" data-url="https://calendly.com/..." style="min-width:320px;height:700px;"></div> and <script src="https://assets.calendly.com/assets/external/widget.js" async></script> before </body> (once; no duplicate widget.js).
- All other external http(s) links: use target="_blank" rel="noopener noreferrer" where appropriate.

7) ANALYTICS & PIXELS
- Google Analytics (G-XXXXXXXX): add gtag snippet in <head> — async loader for https://www.googletagmanager.com/gtag/js?id=ID, then gtag('config','ID'). Use the exact ID from the user message.
- Meta (Facebook) Pixel: add the official fbq init snippet with the numeric pixel ID from the user, typically before </head> or early in <body>, once only.

WHEN IN DOUBT:
- Prefer the smallest edit that satisfies the instruction.
- Never strip <!DOCTYPE>, <html>, <head>, or <body> unless replacing the entire document (which you should avoid).
`;

function normalizeClaudeImageMediaType(raw?: string): string | null {
  const r = (raw ?? "image/jpeg").split(";")[0].trim().toLowerCase();
  if (r === "image/jpg") return "image/jpeg";
  if (["image/jpeg", "image/png", "image/gif", "image/webp"].includes(r)) return r;
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json() as {
      slug?: string;
      instruction?: string;
      currentHtml?: string;
      imageBase64?: string;
      imageMediaType?: string;
    };

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    let userId: string | undefined;
    try {
      const base64Payload = token.split(".")[1];
      if (base64Payload) {
        const b64 = base64Payload.replace(/-/g, "+").replace(/_/g, "/");
        const pad = (4 - (b64.length % 4)) % 4;
        const payload = JSON.parse(atob(b64 + "=".repeat(pad)));
        userId = typeof payload.sub === "string" ? payload.sub : undefined;
      }
    } catch {
      userId = undefined;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const instruction = typeof body.instruction === "string"
      ? body.instruction.trim()
      : "";
    const currentHtml = typeof body.currentHtml === "string"
      ? body.currentHtml.trim()
      : "";
    const imageBase64 = typeof body.imageBase64 === "string"
      ? body.imageBase64.replace(/\s/g, "").trim()
      : "";
    const imageMediaTypeRaw = typeof body.imageMediaType === "string"
      ? body.imageMediaType.trim()
      : "";

    if (!slug || !currentHtml || (!instruction && !imageBase64)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (imageBase64) {
      const mt = normalizeClaudeImageMediaType(imageMediaTypeRaw || "image/jpeg");
      if (!mt) {
        return new Response(
          JSON.stringify({
            error: "Unsupported image type. Use JPEG, PNG, GIF, or WebP.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const effectiveInstruction =
      instruction ||
      (imageBase64
        ? "The user attached an image without extra text. Analyze it and apply it sensibly to the landing page (e.g. hero photo, background, or style reference)."
        : "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row, error: rowError } = await supabase
      .from("landing_pages")
      .select("user_id")
      .eq("slug", slug)
      .maybeSingle();

    if (rowError || !row || row.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized or page not found." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const textPart = `Here is the current page:
${currentHtml}

Make this change: ${effectiveInstruction}

Return the complete updated HTML.`;

    const mediaTypeForClaude = imageBase64
      ? normalizeClaudeImageMediaType(imageMediaTypeRaw || "image/jpeg")!
      : "";

    const messageContent = imageBase64
      ? [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaTypeForClaude,
            data: imageBase64,
          },
        },
        { type: "text", text: textPart },
      ]
      : textPart;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 12000,
        stream: true,
        system: systemPrompt,
        messages: [{ role: "user", content: messageContent }],
      }),
    });

    if (!anthropicRes.ok) {
      const details = await anthropicRes.text();
      return new Response(
        JSON.stringify({ error: "Claude request failed.", details }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const streamBody = anthropicRes.body;
    if (!streamBody) {
      return new Response(
        JSON.stringify({ error: "No response body from Claude." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const reader = streamBody.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let lineBuffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            fullText +=
              parsed?.delta?.text || parsed?.content?.[0]?.text || "";
          } catch {
            /* ignore malformed SSE JSON */
          }
        }
      }
      if (lineBuffer.startsWith("data: ")) {
        const data = lineBuffer.slice(6).trim();
        if (data && data !== "[DONE]") {
          try {
            const parsed = JSON.parse(data);
            fullText +=
              parsed?.delta?.text || parsed?.content?.[0]?.text || "";
          } catch {
            /* ignore */
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    let html = fullText
      .replace(/^```(?:html)?\s*/im, "")
      .replace(/\s*```\s*$/im, "")
      .trim();

    if (!html.startsWith("<!DOCTYPE html>") && !html.startsWith("<html")) {
      return new Response(
        JSON.stringify({ error: "Invalid HTML returned from Claude." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { error: saveError } = await supabase
      .from("landing_pages")
      .update({ html_content: html })
      .eq("slug", slug)
      .eq("user_id", userId);

    if (saveError) {
      return new Response(
        JSON.stringify({
          error: "Failed to save edited page.",
          details: saveError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ success: true, html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to edit.", details: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
