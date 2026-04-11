import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkCredits, deductCredits } from "@/lib/credits";

export const maxDuration = 120;

type Platform = "instagram" | "x" | "linkedin" | "threads" | "telegram";
type PostType = "hook" | "value" | "story" | "offer" | "case_study";
type ModelId = "claude" | "gpt4o" | "gemini";

const CRITICAL_PLATFORM_RULES = `CRITICAL PLATFORM RULES — these override everything else including custom instructions:
- Instagram posts: MAXIMUM 2200 characters
- X/Twitter posts: MAXIMUM 280 characters
- LinkedIn posts: MAXIMUM 1300 characters
- Threads posts: MAXIMUM 500 characters
- Telegram posts: MAXIMUM 4096 characters
Never exceed these limits under any circumstances.

PLATFORM LIMITS (HARD RULES — never exceed regardless of custom instructions):
- Instagram: max 2200 characters
- X (Twitter): max 280 characters
- LinkedIn: max 1300 characters
- Threads: max 500 characters
- Telegram: max 4096 characters`;

const BASE_SYSTEM = `You are an expert social media copywriter. You write compelling, authentic posts that drive engagement and sales. You understand each platform's unique culture and format. Always write in the language of the offer provided. Generate exactly 5 unique posts. Return ONLY valid JSON: { "posts": [{ "id": 1, "text": "..." }, { "id": 2, "text": "..." }, { "id": 3, "text": "..." }, { "id": 4, "text": "..." }, { "id": 5, "text": "..." }] }. No markdown, no explanation, just JSON.`;

function platformRules(platform: Platform): string {
  switch (platform) {
    case "instagram":
      return `PLATFORM — Instagram: Use emojis where they fit naturally. End each post with 5–7 relevant hashtags on the last line(s). Max 2200 characters per post. Put a strong visual or emotional hook in the first line.`;
    case "x":
      return `PLATFORM — X (Twitter): Max 280 characters per post. No hashtags. Short, provocative, scroll-stopping.`;
    case "linkedin":
      return `PLATFORM — LinkedIn: Professional tone. Story arc plus clear lesson or takeaway. Max 1300 characters per post. No hashtags.`;
    case "threads":
      return `PLATFORM — Threads: Conversational, like Instagram voice but NO hashtags. Max 500 characters per post.`;
    case "telegram":
      return `PLATFORM — Telegram: Up to 4096 characters per post. Structured (short paragraphs or bullets). You may use *bold* and _italic_ markers for Telegram formatting.`;
    default:
      return "";
  }
}

function postTypeRules(postType: PostType): string {
  switch (postType) {
    case "hook":
      return `POST TYPE — hook: Gripping openers — intrigue, bold claims, or sharp questions.`;
    case "value":
      return `POST TYPE — value: Actionable tips; specific and immediately usable.`;
    case "story":
      return `POST TYPE — story: Personal story or anonymized client story with tension and resolution.`;
    case "offer":
      return `POST TYPE — offer: Direct pitch to buy, book, or DM — clear CTA.`;
    case "case_study":
      return `POST TYPE — case_study: Before/after with concrete numbers or outcomes.`;
    default:
      return "";
  }
}

function buildSystemPrompt(platform: Platform, postType: PostType): string {
  return [CRITICAL_PLATFORM_RULES, BASE_SYSTEM, platformRules(platform), postTypeRules(postType)].filter(Boolean).join("\n\n");
}

function buildUserPrompt(
  offer: string,
  audience: string,
  platform: Platform,
  postType: PostType,
  customPrompt?: string
): string {
  const base = `Business offer: ${offer}
Target audience: ${audience}
Platform: ${platform}
Post type: ${postType}
Generate 5 ${postType} posts for ${platform}.`;
  const extra = typeof customPrompt === "string" && customPrompt.trim() ? `\n\nAdditional instructions: ${customPrompt.trim()}` : "";
  return base + extra;
}

function parsePostsFromText(raw: string): { id: number; text: string }[] {
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) t = fence[1].trim();
  const parsed = JSON.parse(t) as { posts?: unknown };
  if (!parsed || !Array.isArray(parsed.posts)) {
    throw new Error("Invalid JSON shape.");
  }
  const out: { id: number; text: string }[] = [];
  for (let i = 0; i < parsed.posts.length; i++) {
    const p = parsed.posts[i] as { id?: unknown; text?: unknown };
    const rawId = p.id;
    const idNum = typeof rawId === "number" ? rawId : parseInt(String(rawId), 10);
    const id = Number.isFinite(idNum) && idNum > 0 ? idNum : i + 1;
    const text = typeof p.text === "string" ? p.text : "";
    if (text.trim()) out.push({ id, text });
  }
  return out;
}

function normalizeFive(posts: { id: number; text: string }[]): { id: number; text: string }[] {
  if (posts.length < 5) {
    throw new Error(`Expected 5 posts, got ${posts.length}.`);
  }
  return posts.slice(0, 5).map((p, i) => ({ id: i + 1, text: p.text }));
}

async function runClaude(system: string, userPrompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: userPrompt }]
    })
  });
  if (!res.ok) {
    const details = await res.text();
    throw new Error(`Claude error: ${details.slice(0, 200)}`);
  }
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  return data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
}

async function runOpenAI(system: string, userPrompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    })
  });
  if (!res.ok) {
    const details = await res.text();
    throw new Error(`OpenAI error: ${details.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function runGemini(system: string, userPrompt: string, apiKey: string): Promise<string> {
  const combined = `${system}\n\n${userPrompt}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: combined }] }]
    })
  });
  if (!res.ok) {
    const details = await res.text();
    throw new Error(`Gemini error: ${details.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
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

    const body = (await request.json()) as {
      platform?: string;
      postType?: string;
      model?: string;
      offer?: string;
      audience?: string;
      userId?: string;
      customPrompt?: string;
    };

    if (typeof body.userId === "string" && body.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const platform = body.platform as Platform;
    const postType = body.postType as PostType;
    const model = body.model as ModelId;
    const offer = typeof body.offer === "string" ? body.offer.trim() : "";
    const audience = typeof body.audience === "string" ? body.audience.trim() : "";
    const customPrompt = typeof body.customPrompt === "string" ? body.customPrompt : "";

    const platforms: Platform[] = ["instagram", "x", "linkedin", "threads", "telegram"];
    const postTypes: PostType[] = ["hook", "value", "story", "offer", "case_study"];
    const models: ModelId[] = ["claude", "gpt4o", "gemini"];

    if (!platforms.includes(platform)) {
      return NextResponse.json({ error: "Invalid platform." }, { status: 400 });
    }
    if (!postTypes.includes(postType)) {
      return NextResponse.json({ error: "Invalid post type." }, { status: 400 });
    }
    if (!models.includes(model)) {
      return NextResponse.json({ error: "Invalid model." }, { status: 400 });
    }
    if (!offer) {
      return NextResponse.json({ error: "Add your offer in Layer 01 first." }, { status: 400 });
    }

    if (!(await checkCredits(supabase, user.id, "generate_post"))) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message: "Not enough credits. Please upgrade your plan or buy more credits."
        },
        { status: 402 }
      );
    }

    const system = buildSystemPrompt(platform, postType);
    const userPrompt = buildUserPrompt(offer, audience || "General audience", platform, postType, customPrompt);

    let text = "";
    if (model === "claude") {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return NextResponse.json({ error: "Claude is not configured." }, { status: 500 });
      text = await runClaude(system, userPrompt, key);
    } else if (model === "gpt4o") {
      const key = process.env.OPENAI_API_KEY;
      if (!key) return NextResponse.json({ error: "OpenAI is not configured." }, { status: 500 });
      text = await runOpenAI(system, userPrompt, key);
    } else {
      const key = process.env.GEMINI_API_KEY;
      if (!key) return NextResponse.json({ error: "Gemini is not configured." }, { status: 500 });
      text = await runGemini(system, userPrompt, key);
    }

    if (!text) {
      return NextResponse.json({ error: "Empty model response." }, { status: 502 });
    }

    let posts: { id: number; text: string }[];
    try {
      posts = normalizeFive(parsePostsFromText(text));
    } catch (e) {
      console.error("content/generate parse:", e, text.slice(0, 500));
      return NextResponse.json(
        { error: "Could not parse posts from model. Try again or switch model." },
        { status: 502 }
      );
    }

    if (!(await deductCredits(supabase, user.id, "generate_post"))) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message: "Not enough credits. Please upgrade your plan or buy more credits."
        },
        { status: 402 }
      );
    }

    return NextResponse.json({ posts });
  } catch (e) {
    console.error("content/generate:", e);
    const message = e instanceof Error ? e.message : "Request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
