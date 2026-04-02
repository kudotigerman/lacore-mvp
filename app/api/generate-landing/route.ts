import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const placeholderFillSystemPrompt = `You are a professional copywriter. You receive business data and a list of placeholder variable names from an HTML landing page template. Your job is to return a JSON object where each key is a placeholder name and each value is the text to fill in.

RULES:
- Return ONLY a valid JSON object, nothing else. No markdown, no backticks, no explanation.
- All copy must be in the SAME LANGUAGE as the input data (if input is Russian, write Russian; if English, write English)
- Make all copy specific, compelling, and benefit-driven based on the actual business data
- For placeholder names that are obvious (like BUSINESS_NAME, EMAIL, PHONE, CITY) use the data provided
- For nav items (NAV_1, NAV_2 etc) use relevant section names
- For hero text: make it powerful and specific to the niche
- For testimonials: create realistic names and specific results
- For FAQ: write 5 real questions someone would ask before buying
- For stats (S1N, S2N etc): use realistic impressive numbers
- For marquee items (M1-M5): short compelling phrases about the business
- For bento stats (BST1, BST2): impressive metrics
- For floating card numbers (FC1N-FC4N): key metrics/stats, FC1L-FC4L: short labels
- Keep all values concise - no value should exceed 150 characters
- LOGO_1 and LOGO_2: split the business name into two parts for the styled logo`;

function detectNiche(offer: string, audience: string, positioning: string): string {
  const text = `${offer} ${audience} ${positioning}`.toLowerCase();
  if (text.match(/real estate|недвижимость|property|realty|дубай|dubai|батуми|batumi|квартир|риелтор/))
    return "luxury-v2";
  if (text.match(/saas|software|tech|app|startup|digital|marketing|smm|агентств|диджитал/)) return "acid-v2";
  if (text.match(/design|designer|photography|фотограф|дизайн|creative|portfolio|креатив/)) return "minimal-v2";
  if (text.match(/ai|crypto|web3|developer|blockchain|gaming|nft|разработ/)) return "neon-v2";
  if (text.match(/coach|коуч|mentor|education|курс|обучение|консульт|наставник/)) return "warm-v2";
  if (text.match(/fitness|фитнес|gym|sport|trainer|тренер|boxing|спорт/)) return "energy-v2";
  if (text.match(/b2b|legal|юрист|финанс|finance|invest|консалтинг|consulting|corporate|бизнес/)) return "navy-v2";
  if (text.match(/beauty|красот|spa|wellness|skincare|massag|косметолог|салон/)) return "pastel-v2";
  if (text.match(/premium|luxury|vip|elite|exclusive|премиум|элит/)) return "luxury-v2";
  return "acid-v2";
}

type LandingInput = {
  offer: string;
  audience: string;
  pricing: string;
  positioning: string;
  headline: string;
  userName?: string;
  userEmail: string;
  businessName?: string;
  realResults?: string;
  idealClient?: string;
};

function randomFourDigits() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LandingInput;
    if (!body.offer || !body.audience || !body.pricing || !body.positioning || !body.headline || !body.userEmail) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
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

    const niche = detectNiche(body.offer, body.audience, body.positioning);
    const templatePath = path.join(process.cwd(), "public", "templates", `template-${niche}.html`);
    let templateHtml: string;
    try {
      templateHtml = fs.readFileSync(templatePath, "utf-8");
    } catch {
      return NextResponse.json(
        { error: "Failed to load landing template.", details: `template-${niche}.html` },
        { status: 500 }
      );
    }

    const placeholders = [
      ...new Set([...templateHtml.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1].trim()))
    ];

    const displayName = body.businessName || body.userEmail.split("@")[0];

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        system: placeholderFillSystemPrompt,
        messages: [
          {
            role: "user",
            content: `Business data:\nName: ${displayName}\nOffer: ${body.offer}\nAudience: ${body.audience}\nPricing: ${body.pricing}\nPositioning: ${body.positioning}\nHeadline: ${body.headline}\nBest result: ${body.realResults || "Not provided"}\nIdeal client: ${body.idealClient || "Not provided"}\n\nFill these placeholders:\n${placeholders.join(", ")}`
          }
        ]
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
    const rawText = completion.content?.find((item) => item.type === "text")?.text?.trim() || "";

    let filledValues: Record<string, string> = {};
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Invalid JSON shape");
      }
      filledValues = Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v ?? "")])
      );
    } catch {
      throw new Error("Failed to parse placeholder values from Claude");
    }

    let html = templateHtml;
    for (const [key, value] of Object.entries(filledValues)) {
      html = html.replaceAll(`{{${key}}}`, value);
    }
    html = html.replace(/\{\{[^}]+\}\}/g, "");

    if (!html.trim().startsWith("<!DOCTYPE html>")) {
      return NextResponse.json({ error: "Invalid HTML after template fill." }, { status: 502 });
    }

    const existingPage = await supabase
      .from("landing_pages")
      .select("slug")
      .eq("user_id", user.id)
      .maybeSingle();

    const emailBase = body.userEmail.split("@")[0].replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
    const slug = existingPage.data?.slug ?? `${emailBase}-${randomFourDigits()}`;

    const { error: upsertError } = await supabase
      .from("landing_pages")
      .upsert(
        {
          user_id: user.id,
          slug,
          html_content: html
        } as never,
        { onConflict: "slug" }
      );

    if (upsertError) {
      return NextResponse.json({ error: "Failed to save landing page.", details: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ slug, html, success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    return NextResponse.json({ error: "Failed to generate landing page.", details: message }, { status: 500 });
  }
}
