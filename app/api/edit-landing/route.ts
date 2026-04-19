import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";
import { compileLandingJsx } from "@/lib/compileLandingJsx";
import { AI_BUSY_USER_MESSAGE } from "@/lib/claudeWithRetry";
import { checkCredits, deductCredits } from "@/lib/credits";

function detectStyleChangeIntent(instruction: string): string | null {
  const raw = instruction.toLowerCase();

  const styleMap: Record<string, string> = {
    indigo: "dark-indigo",
    purple: "dark-purple",
    gold: "dark-gold",
    amber: "dark-amber",
    orange: "dark-orange",
    red: "dark-red",
    green: "dark-green",
    pink: "dark-pink",
    cyan: "dark-cyan",
    teal: "dark-cyan",
    black: "pure-black",
    minimal: "pure-black",
    white: "light-clean",
    light: "light-clean",
    clean: "light-clean",
    cream: "warm-cream",
    warm: "warm-cream",
    beige: "warm-cream",
  };

  const hasColorKeyword = Object.keys(styleMap).some((k) => raw.includes(k));
  if (!hasColorKeyword) return null;

  for (const [keyword, styleValue] of Object.entries(styleMap)) {
    if (raw.includes(keyword)) return styleValue;
  }
  return null;
}

export const maxDuration = 120;

type EditPayload = {
  slug: string;
  instruction: string;
  currentHtml?: string;
  currentJsx?: string;
  currentJson?: string;
  addBlockType?: "faq" | "pricing" | "video" | "about" | "calendly";
  imageBase64?: string;
  imageMediaType?: string;
};

type ClaudeUserContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
    >;

const REORDER_SECTION_KEYS = [
  "hero",
  "features",
  "problems",
  "steps",
  "stats",
  "testimonials",
  "about",
  "faq",
  "pricing",
  "video",
  "calendly",
  "cta",
] as const;
type ReorderSectionKey = (typeof REORDER_SECTION_KEYS)[number];

const SECTION_ALIASES: Array<{ key: Exclude<ReorderSectionKey, "hero" | "cta">; aliases: string[] }> = [
  { key: "features", aliases: ["features", "feature", "solution", "benefits", "benefit"] },
  { key: "problems", aliases: ["problems", "problem", "pain", "pain points", "painpoint"] },
  { key: "steps", aliases: ["steps", "step", "process", "how it works"] },
  { key: "stats", aliases: ["stats", "stat", "numbers", "metrics"] },
  { key: "testimonials", aliases: ["testimonials", "testimonial", "reviews", "review", "results"] },
  { key: "about", aliases: ["about", "bio", "founder", "story"] },
  { key: "faq", aliases: ["faq", "faqs", "questions"] },
  { key: "pricing", aliases: ["pricing", "price", "prices", "plans", "plan"] },
  { key: "video", aliases: ["video", "walkthrough"] },
  { key: "calendly", aliases: ["calendly", "booking", "book", "scheduler", "schedule"] },
];

function hasSection(data: Record<string, unknown>, key: ReorderSectionKey): boolean {
  if (key === "hero" || key === "cta") return true;
  if (key === "features") return Array.isArray(data.features) && data.features.length > 0;
  if (key === "problems") return Array.isArray(data.problems) && data.problems.length > 0;
  if (key === "steps") return Array.isArray(data.steps) && data.steps.length > 0;
  if (key === "stats") return Array.isArray(data.stats) && data.stats.length > 0;
  if (key === "testimonials") return Array.isArray(data.testimonials) && data.testimonials.length > 0;
  if (key === "about") return typeof data.about === "object" && data.about !== null;
  if (key === "faq") return Array.isArray(data.faq) && data.faq.length > 0;
  if (key === "pricing") return Array.isArray(data.pricing) && data.pricing.length > 0;
  if (key === "video") return typeof data.video === "object" && data.video !== null;
  if (key === "calendly") return typeof data.calendly === "object" && data.calendly !== null;
  return false;
}

function buildDefaultSectionOrder(data: Record<string, unknown>): ReorderSectionKey[] {
  const preferred: ReorderSectionKey[] = [
    "hero",
    "stats",
    "problems",
    "features",
    "steps",
    "testimonials",
    "about",
    "faq",
    "pricing",
    "video",
    "calendly",
    "cta",
  ];
  return preferred.filter((k) => hasSection(data, k));
}

function resolveSectionKeyFromText(input: string): Exclude<ReorderSectionKey, "hero" | "cta"> | null {
  const normalized = input.toLowerCase();
  for (const entry of SECTION_ALIASES) {
    if (entry.aliases.some((alias) => normalized.includes(alias))) return entry.key;
  }
  return null;
}

function detectReorderIntent(instruction: string): null | {
  type: "moveTop" | "moveBottom" | "before" | "after" | "swap";
  source: Exclude<ReorderSectionKey, "hero" | "cta">;
  target?: Exclude<ReorderSectionKey, "hero" | "cta">;
} {
  const raw = instruction.toLowerCase().trim();
  if (!raw) return null;
  const hasReorderWord = /(move|place|put|reorder|swap|before|after|above|below)/.test(raw);
  if (!hasReorderWord) return null;

  if (raw.includes("swap")) {
    const matches = SECTION_ALIASES.filter((x) => x.aliases.some((a) => raw.includes(a))).map((x) => x.key);
    if (matches.length >= 2 && matches[0] !== matches[1]) return { type: "swap", source: matches[0], target: matches[1] };
    return null;
  }

  const source = resolveSectionKeyFromText(raw);
  if (!source) return null;

  if (/(top|first|beginning)/.test(raw)) return { type: "moveTop", source };
  if (/(bottom|last|end)/.test(raw)) return { type: "moveBottom", source };

  if (/(before|above)/.test(raw)) {
    const target = SECTION_ALIASES
      .filter((x) => x.key !== source)
      .find((x) => x.aliases.some((a) => raw.includes(a)))?.key;
    if (target) return { type: "before", source, target };
  }

  if (/(after|below)/.test(raw)) {
    const target = SECTION_ALIASES
      .filter((x) => x.key !== source)
      .find((x) => x.aliases.some((a) => raw.includes(a)))?.key;
    if (target) return { type: "after", source, target };
  }

  return null;
}

function applyReorderIntent(
  currentOrder: ReorderSectionKey[],
  intent: ReturnType<typeof detectReorderIntent>
): ReorderSectionKey[] {
  if (!intent) return currentOrder;
  // hero always first, cta always last, cannot be moved by user commands
  const movable = currentOrder.filter((k) => k !== "hero" && k !== "cta");
  const sourceIdx = movable.indexOf(intent.source);
  if (sourceIdx < 0) return currentOrder;
  const next = [...movable];

  if (intent.type === "swap" && intent.target) {
    const targetIdx = next.indexOf(intent.target);
    if (targetIdx < 0) return currentOrder;
    [next[sourceIdx], next[targetIdx]] = [next[targetIdx], next[sourceIdx]];
  } else {
    const [source] = next.splice(sourceIdx, 1);
    // "top" means first position AFTER hero.
    if (intent.type === "moveTop") next.unshift(source);
    else if (intent.type === "moveBottom") next.push(source);
    else if (intent.type === "before" && intent.target) {
      const targetIdx = next.indexOf(intent.target);
      next.splice(Math.max(0, targetIdx), 0, source);
    } else if (intent.type === "after" && intent.target) {
      const targetIdx = next.indexOf(intent.target);
      next.splice(Math.max(0, targetIdx + 1), 0, source);
    } else {
      return currentOrder;
    }
  }

  // Keep protected endpoints in place after every reorder.
  return ["hero", ...next, "cta"];
}

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

function fileExtensionFromMediaType(mediaType: string): string {
  const m = mediaType.split(";")[0].trim().toLowerCase();
  if (m === "image/jpeg" || m === "image/jpg") return "jpg";
  if (m === "image/png") return "png";
  if (m === "image/gif") return "gif";
  if (m === "image/webp") return "webp";
  return "jpg";
}

async function uploadLandingImageForEdit(
  supabase: SupabaseClient,
  userId: string,
  imageBase64: string,
  mediaType: string
): Promise<{ publicUrl: string } | { error: string }> {
  const ext = fileExtensionFromMediaType(mediaType);
  const fileName = `${userId}/${Date.now()}.${ext}`;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(imageBase64, "base64");
  } catch {
    return { error: "Invalid image data." };
  }
  if (buffer.length === 0) return { error: "Empty image data." };

  const { error: upErr } = await supabase.storage.from("landing-images").upload(fileName, buffer, {
    contentType: mediaType,
    upsert: false
  });
  if (upErr) return { error: upErr.message };

  const { data } = supabase.storage.from("landing-images").getPublicUrl(fileName);
  const publicUrl = data?.publicUrl;
  if (!publicUrl) return { error: "Could not get public URL." };
  return { publicUrl };
}

function appendImagePublicUrlToInstruction(
  instruction: string,
  publicUrl: string,
  target: "html" | "jsx"
): string {
  if (target === "html") {
    return `${instruction}\n\nImage public URL for use in HTML/CSS: ${publicUrl}. Use this URL when inserting the image into the page (as src, background-image url(), etc). Do NOT use base64 in HTML.`;
  }
  return `${instruction}\n\nImage public URL for use in JSX: ${publicUrl}. Use this URL when inserting the image (as <img src>, style backgroundImage / url(), etc). Do NOT use base64 or data: URLs in the component source.`;
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
  const payload = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 12000,
    system,
    messages: [{ role: "user" as const, content: userContent }],
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    if (anthropicResponse.ok) {
      const completion = (await anthropicResponse.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };
      const raw = completion.content?.find((item) => item.type === "text")?.text?.trim();
      if (!raw) {
        throw new Error(AI_BUSY_USER_MESSAGE);
      }
      return cleanClaudeCode(raw);
    }

    const retryable =
      anthropicResponse.status === 529 ||
      anthropicResponse.status === 503 ||
      anthropicResponse.status === 429;
    if (retryable && attempt < 2) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    throw new Error(AI_BUSY_USER_MESSAGE);
  }
  throw new Error(AI_BUSY_USER_MESSAGE);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EditPayload;
    const instruction = typeof body.instruction === "string" ? body.instruction.trim() : "";
    const addBlockType =
      body.addBlockType === "faq" ||
      body.addBlockType === "pricing" ||
      body.addBlockType === "video" ||
      body.addBlockType === "about" ||
      body.addBlockType === "calendly"
        ? body.addBlockType
        : null;
    const imageBase64 =
      typeof body.imageBase64 === "string" ? body.imageBase64.replace(/\s/g, "").trim() : "";
    const imageMediaTypeRaw =
      typeof body.imageMediaType === "string" ? body.imageMediaType.trim() : "";

    if (!body.slug || (!instruction && !imageBase64 && !addBlockType)) {
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
    const useJson = Boolean(body.currentJson?.trim());
    if (!useJsx && !useHtml && !useJson) {
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

    if (!(await checkCredits(supabase, user.id, "edit_landing"))) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message: "Not enough credits. Please upgrade your plan or buy more credits."
        },
        { status: 402 }
      );
    }

    if (addBlockType && useJson && body.currentJson) {
      let currentJsonObj: Record<string, unknown>;
      try {
        currentJsonObj = JSON.parse(body.currentJson) as Record<string, unknown>;
      } catch {
        return NextResponse.json({ error: "Invalid current JSON content." }, { status: 400 });
      }

      const brand = typeof currentJsonObj.brand === "string" ? currentJsonObj.brand : "";
      const headline = typeof currentJsonObj.headline === "string" ? currentJsonObj.headline : "";
      const niche = typeof currentJsonObj.niche === "string" ? currentJsonObj.niche : "";
      const subheadline = typeof currentJsonObj.subheadline === "string" ? currentJsonObj.subheadline : "";
      const ctaButton = typeof currentJsonObj.ctaButton === "string" ? currentJsonObj.ctaButton : "";
      const summary = JSON.stringify(currentJsonObj);
      const blockPromptMap: Record<"faq" | "pricing" | "video" | "about" | "calendly", string> = {
        faq: `Based on this landing page content: ${summary}. Generate a FAQ section. Return only valid JSON: {"faqHeadline": "...", "faq": [{"question": "...", "answer": "..."}]} — 5-6 questions. No markdown, no explanation, only JSON.`,
        pricing: `Based on this landing page content: ${summary}. Generate a pricing section with 3 tiers. Return only valid JSON: {"pricingHeadline": "...", "pricing": [{"name": "...", "price": "...", "period": "...", "description": "...", "features": [...], "highlighted": false, "ctaLabel": "..."}]} — No markdown, no explanation, only JSON.`,
        video: `Based on this landing page: ${summary}. Generate a video section placeholder. Return only valid JSON: {"video": {"url": "", "headline": "...", "subheadline": "..."}} — leave url empty string. No markdown, no explanation, only JSON.`,
        about: `Based on this landing page: brand=${brand}, headline=${headline}, niche=${niche}, subheadline=${subheadline}. Generate an About section for the person behind this business. Return ONLY valid JSON, no markdown, no explanation: {"aboutHeadline": "Meet Your [role]", "about": {"name": "[derive from brand name]", "title": "[professional title based on niche]", "bio": "[2-3 sentence compelling personal story]", "photo": "", "highlights": ["[achievement 1]", "[achievement 2]", "[achievement 3]", "[achievement 4]"]}}`,
        calendly: `Based on this landing page: brand=${brand}, headline=${headline}, ctaButton=${ctaButton}. Generate a booking section. Return ONLY valid JSON, no markdown, no explanation: {"calendly": {"url": "", "headline": "[compelling booking headline]", "subheadline": "[reassuring 1 line — time commitment + no pressure]"}}`
      };

      let newFieldsText: string;
      try {
        newFieldsText = await callClaude(
          apiKey,
          "You generate only valid JSON objects with no markdown and no explanation.",
          blockPromptMap[addBlockType]
        );
      } catch {
        return NextResponse.json({ error: AI_BUSY_USER_MESSAGE }, { status: 503 });
      }

      const cleaned = newFieldsText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      let newFields: Record<string, unknown>;
      try {
        newFields = JSON.parse(cleaned) as Record<string, unknown>;
      } catch {
        return NextResponse.json({ error: "Failed to parse generated block JSON." }, { status: 502 });
      }

      const merged = { ...currentJsonObj, ...newFields };
      const { error: saveError } = await supabase
        .from("landing_pages")
        .update({ json_content: merged } as never)
        .eq("slug", body.slug)
        .eq("user_id", user.id);

      if (saveError) {
        return NextResponse.json({ error: "Failed to save.", details: saveError.message }, { status: 500 });
      }

      if (!(await deductCredits(supabase, user.id, "edit_landing"))) {
        return NextResponse.json({ error: "insufficient_credits", message: "Not enough credits." }, { status: 402 });
      }

      return NextResponse.json({ success: true, json: merged });
    }

    let imagePublicUrl: string | undefined;
    if (imageBase64) {
      const mt = normalizeClaudeImageMediaType(imageMediaTypeRaw || "image/jpeg")!;
      const uploaded = await uploadLandingImageForEdit(supabase, user.id, imageBase64, mt);
      if ("error" in uploaded) {
        return NextResponse.json(
          { error: "Failed to upload image.", details: uploaded.error },
          { status: 500 }
        );
      }
      imagePublicUrl = uploaded.publicUrl;
    }

    const instructionWithImageUrl = imagePublicUrl
      ? appendImagePublicUrlToInstruction(
          effectiveInstruction,
          imagePublicUrl,
          useJsx ? "jsx" : "html"
        )
      : effectiveInstruction;

    if (useJsx && body.currentJsx) {
      const baseUser = `Here is the current component:
${body.currentJsx}

Make this change: ${instructionWithImageUrl}

Return the complete updated component.`;

      const userContent = buildClaudeUserContent(baseUser, imageBase64 || undefined, imageMediaTypeRaw);

      let jsx: string;
      try {
        jsx = await callClaude(apiKey, editJsxSystemPrompt, userContent);
      } catch {
        return NextResponse.json({ error: AI_BUSY_USER_MESSAGE }, { status: 503 });
      }

      jsx = ensureExportDefaultLandingPage(jsx);

      let shapeErr = validateJsxShape(jsx);
      if (shapeErr) {
        return NextResponse.json({ error: shapeErr }, { status: 502 });
      }

      let compiled = tryCompileJsx(jsx);
      if (!compiled.ok) {
        const retryBase = `Here is the current component:
${body.currentJsx}

Make this change: ${instructionWithImageUrl}

Return the complete updated component.`;
        const retryText = `${retryBase}

Previous output did not compile (${compiled.message}). Fix the JSX and return the complete valid component again.`;
        const retryContent = buildClaudeUserContent(retryText, imageBase64 || undefined, imageMediaTypeRaw);
        try {
          jsx = await callClaude(apiKey, editJsxSystemPrompt, retryContent);
        } catch {
          return NextResponse.json({ error: AI_BUSY_USER_MESSAGE }, { status: 503 });
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

      if (!(await deductCredits(supabase, user.id, "edit_landing"))) {
        return NextResponse.json(
          {
            error: "insufficient_credits",
            message: "Not enough credits. Please upgrade your plan or buy more credits."
          },
          { status: 402 }
        );
      }

      return NextResponse.json({ success: true, jsx });
    }

    if (useJson && body.currentJson) {
      let currentJsonObjForReorder: Record<string, unknown>;
      try {
        currentJsonObjForReorder = JSON.parse(body.currentJson) as Record<string, unknown>;
      } catch {
        return NextResponse.json({ error: "Invalid current JSON content." }, { status: 400 });
      }
      const reorderIntent = detectReorderIntent(instructionWithImageUrl);
      if (reorderIntent) {
        const existingOrder = Array.isArray(currentJsonObjForReorder.sectionOrder)
          ? (currentJsonObjForReorder.sectionOrder.filter((k): k is ReorderSectionKey => typeof k === "string" && (REORDER_SECTION_KEYS as readonly string[]).includes(k)) as ReorderSectionKey[])
          : buildDefaultSectionOrder(currentJsonObjForReorder);
        const sanitized = existingOrder.filter((k, idx, arr) => arr.indexOf(k) === idx && hasSection(currentJsonObjForReorder, k));
        const baseOrder: ReorderSectionKey[] = [
          "hero",
          ...sanitized.filter((k) => k !== "hero" && k !== "cta"),
          "cta",
        ];
        const nextOrder = applyReorderIntent(baseOrder, reorderIntent);
        const updatedJson = { ...currentJsonObjForReorder, sectionOrder: nextOrder };
        const { error: saveError } = await supabase
          .from("landing_pages")
          .update({ json_content: updatedJson } as never)
          .eq("slug", body.slug)
          .eq("user_id", user.id);
        if (saveError) {
          return NextResponse.json({ error: "Failed to save.", details: saveError.message }, { status: 500 });
        }
        if (!(await deductCredits(supabase, user.id, "edit_landing"))) {
          return NextResponse.json({ error: "insufficient_credits", message: "Not enough credits." }, { status: 402 });
        }
        return NextResponse.json({ success: true, json: updatedJson });
      }

      // Detect style change intent — handle separately since style is stored outside json_content
      const styleChangeIntent = detectStyleChangeIntent(instructionWithImageUrl);
      if (styleChangeIntent) {
        const { error: styleError } = await supabase
          .from("landing_pages")
          .update({ style: styleChangeIntent } as never)
          .eq("slug", body.slug)
          .eq("user_id", user.id);
        if (styleError) {
          return NextResponse.json({ error: "Failed to update style." }, { status: 500 });
        }
        if (!(await deductCredits(supabase, user.id, "edit_landing"))) {
          return NextResponse.json({ error: "insufficient_credits", message: "Not enough credits." }, { status: 402 });
        }
        const updatedWithStyle = { ...currentJsonObjForReorder };
        return NextResponse.json({ success: true, json: updatedWithStyle, styleChanged: styleChangeIntent });
      }

      const jsonUser = `Here is the current landing page content as JSON:
${body.currentJson}

The user wants to make this change: ${instructionWithImageUrl}

Return ONLY a valid JSON object with the same structure as the input but with the requested changes applied.
Keep all fields that were not mentioned in the change request exactly as they are.
No markdown, no explanation, just the JSON object.`;

      let updatedJsonText: string;
      try {
        updatedJsonText = await callClaude(
          apiKey,
          `You are editing landing page content JSON for a marketing landing page.

CRITICAL RULES:
- Return ONLY valid JSON, no markdown, no explanation.
- Keep the EXACT same JSON structure and all existing fields.
- Only modify fields that are directly relevant to the user's request.
- NEVER add new top-level fields that don't exist in the input JSON.
- NEVER add fields like "heroBackground", "backgroundColor", "theme", "colors" — these don't exist in the schema.
- The only valid top-level fields are: niche, brand, badge, headline, headlineAccent, subheadline, ctaPrimary, ctaSecondary, socialProof, stats, problemHeadline, problems, solutionHeadline, features, processHeadline, steps, testimonialsHeadline, testimonials, ctaHeadline, ctaSubtext, ctaButton, formHeadline, formButton, heroImage, sectionOrder, faqHeadline, faq, pricingHeadline, pricing, video, aboutHeadline, about, calendly.
- If user asks to change background/color/style/theme — respond by changing relevant TEXT content only (headline, badge, etc.) and ignore the visual styling request since styles are controlled separately.
- heroImage field MUST only be set if it contains a valid object with these exact fields: { url: string (must be a real https:// URL), photographer: string, photographerUrl: string, unsplashUrl: string }. 
- If user asks to "change background", "change photo", "change image", or describes a visual scene (like "office view", "city", "nature") WITHOUT providing a real image URL — do NOT modify heroImage at all. Instead, respond by updating the badge or subheadline text to acknowledge the request, and leave heroImage exactly as it is.
- To REMOVE the hero image entirely, set heroImage to null.
- NEVER set heroImage to a string, a description, or an object with a non-https URL.`,
          jsonUser as ClaudeUserContent
        );
      } catch {
        return NextResponse.json({ error: AI_BUSY_USER_MESSAGE }, { status: 503 });
      }

      const cleanedJson = updatedJsonText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      let updatedJson: Record<string, unknown>;
      try {
        updatedJson = JSON.parse(cleanedJson) as Record<string, unknown>;
      } catch {
        return NextResponse.json({ error: "Failed to parse updated content." }, { status: 502 });
      }

      const { error: saveError } = await supabase
        .from("landing_pages")
        .update({ json_content: updatedJson } as never)
        .eq("slug", body.slug)
        .eq("user_id", user.id);

      if (saveError) {
        return NextResponse.json({ error: "Failed to save.", details: saveError.message }, { status: 500 });
      }

      if (!(await deductCredits(supabase, user.id, "edit_landing"))) {
        return NextResponse.json({ error: "insufficient_credits", message: "Not enough credits." }, { status: 402 });
      }

      return NextResponse.json({ success: true, json: updatedJson });
    }

    const htmlUser = `Here is the current page:
${body.currentHtml}

Make this change: ${instructionWithImageUrl}

Return the complete updated HTML.`;

    const htmlContent = buildClaudeUserContent(htmlUser, imageBase64 || undefined, imageMediaTypeRaw);

    let html: string;
    try {
      html = await callClaude(apiKey, editHtmlSystemPrompt, htmlContent);
    } catch {
      return NextResponse.json({ error: AI_BUSY_USER_MESSAGE }, { status: 503 });
    }

    if (!html.startsWith("<!DOCTYPE html>")) {
      return NextResponse.json({ error: "Invalid HTML returned. Please try again." }, { status: 502 });
    }

    const { error: saveError } = await supabase
      .from("landing_pages")
      .update({ html_content: html } as never)
      .eq("slug", body.slug)
      .eq("user_id", user.id);

    if (saveError) {
      return NextResponse.json({ error: "Failed to save edited page.", details: saveError.message }, { status: 500 });
    }

    if (!(await deductCredits(supabase, user.id, "edit_landing"))) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message: "Not enough credits. Please upgrade your plan or buy more credits."
        },
        { status: 402 }
      );
    }

    return NextResponse.json({ success: true, html });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    return NextResponse.json({ error: "Failed to edit landing page.", details: message }, { status: 500 });
  }
}
