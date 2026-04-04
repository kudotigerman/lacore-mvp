import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 120;

type ImageStyle = "professional" | "creative" | "minimal" | "bold";

const PLATFORMS = ["instagram", "x", "linkedin", "threads", "telegram"] as const;

const MAX_PROMPT_CHARS = 3800;

function styleDescription(style: ImageStyle): string {
  switch (style) {
    case "professional":
      return "clean corporate look, neutral colors, business atmosphere";
    case "creative":
      return "vibrant colors, artistic composition, eye-catching design";
    case "minimal":
      return "white space, simple elements, elegant typography-inspired layout";
    case "bold":
      return "high contrast, strong colors, powerful visual impact";
    default:
      return "";
  }
}

function buildImagePrompt(platform: string, offer: string, audience: string, style: ImageStyle): string {
  const styleDesc = styleDescription(style);
  return `Create a professional social media image for ${platform} for a business with this offer: ${offer}. 
Target audience: ${audience}. 
Style: ${styleDesc}.
No text on image. Clean, modern, high-quality visual that represents the business.
Make it suitable for ${platform} posts.`;
}

function buildImagePromptFromPost(
  platform: string,
  postText: string,
  offer: string,
  audience: string,
  style: ImageStyle
): string {
  const styleDesc = styleDescription(style);
  const safePost =
    postText.length > MAX_PROMPT_CHARS ? postText.slice(0, MAX_PROMPT_CHARS) + "…" : postText;
  return `Create a social media image for ${platform} that visually represents this post:
'${safePost.replace(/'/g, "′")}'
Business offer: ${offer}. Target audience: ${audience}.
Style: ${styleDesc}.
No text overlays on image. Clean, modern, photorealistic visual.
Make it suitable for ${platform} format.`;
}

async function generateOneImage(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url"
    })
  });
  if (!res.ok) {
    const details = await res.text();
    throw new Error(details.slice(0, 300));
  }
  const data = (await res.json()) as { data?: Array<{ url?: string }> };
  const url = data.data?.[0]?.url;
  if (!url) throw new Error("No image URL in response.");
  return url;
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
      style?: string;
      offer?: string;
      audience?: string;
      userId?: string;
      postText?: string;
    };

    if (typeof body.userId === "string" && body.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const platform = typeof body.platform === "string" ? body.platform.trim().toLowerCase() : "";
    const style = body.style as ImageStyle;
    const offer = typeof body.offer === "string" ? body.offer.trim() : "";
    const audience = typeof body.audience === "string" ? body.audience.trim() : "";
    const postText = typeof body.postText === "string" ? body.postText.trim() : "";

    if (!PLATFORMS.includes(platform as (typeof PLATFORMS)[number])) {
      return NextResponse.json({ error: "Invalid platform." }, { status: 400 });
    }
    const styles: ImageStyle[] = ["professional", "creative", "minimal", "bold"];
    if (!styles.includes(style)) {
      return NextResponse.json({ error: "Invalid style." }, { status: 400 });
    }
    if (!offer) {
      return NextResponse.json({ error: "Add your offer in Layer 01 first." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI is not configured." }, { status: 500 });
    }

    const aud = audience || "General audience";
    const imagePrompt =
      postText.length > 0
        ? buildImagePromptFromPost(platform, postText, offer, aud, style)
        : buildImagePrompt(platform, offer, aud, style);

    const url = await generateOneImage(apiKey, imagePrompt);

    return NextResponse.json({
      images: [{ id: 1, url }]
    });
  } catch (e) {
    console.error("content/generate-image:", e);
    const message = e instanceof Error ? e.message : "Image generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
