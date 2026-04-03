/*
Add to Supabase if missing:

ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS jsx_content text;
*/

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const reactLandingSystemPrompt = `You are an expert React developer. Generate a complete React functional component for a landing page.

RULES:
- Component name: LandingPage
- Use ONLY inline styles, no CSS files, no Tailwind classes
- No imports except: import React, { useState } from 'react';
- All content hardcoded inside the component
- Contact form uses fetch to POST to /api/leads with JSON body: { name, email, message, slug }
- slug value should be hardcoded as '{{SLUG_PLACEHOLDER}}' (the string the app will replace with the real slug)
- Use useState for form state and submission
- All animations via CSS keyframes injected in a <style> tag inside the component
- Return complete component code starting with: import React, { useState } from 'react';

DESIGN: You will be given a DESIGN SYSTEM name (luxury, acid, minimal, neon, warm, energy, navy, pastel). Implement that aesthetic using only inline style objects and optional keyframes in <style>.

Return ONLY the React component code. No markdown. No explanation. Start with: import React, { useState } from 'react';`;

function detectDesignSystem(offer: string, audience: string, positioning: string): string {
  const text = `${offer} ${audience} ${positioning}`.toLowerCase();
  if (text.match(/real estate|недвижимость|property|realty|дубай|dubai|батуми|batumi|квартир|риелтор/))
    return "luxury";
  if (text.match(/saas|software|tech|app|startup|digital|marketing|smm|агентств|диджитал/)) return "acid";
  if (text.match(/design|designer|photography|фотограф|дизайн|creative|portfolio|креатив/)) return "minimal";
  if (text.match(/ai|crypto|web3|developer|blockchain|gaming|nft|разработ/)) return "neon";
  if (text.match(/coach|коуч|mentor|education|курс|обучение|консульт|наставник/)) return "warm";
  if (text.match(/fitness|фитнес|gym|sport|trainer|тренер|boxing|спорт/)) return "energy";
  if (text.match(/b2b|legal|юрист|финанс|finance|invest|консалтинг|consulting|corporate|бизнес/)) return "navy";
  if (text.match(/beauty|красот|spa|wellness|skincare|massag|косметолог|салон/)) return "pastel";
  if (text.match(/premium|luxury|vip|elite|exclusive|премиум|элит/)) return "luxury";
  return "acid";
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

function injectSlugIntoJsx(jsx: string, slug: string): string {
  const jsonSlug = JSON.stringify(slug);
  let out = jsx.replaceAll("'{{SLUG_PLACEHOLDER}}'", jsonSlug).replaceAll('"{{SLUG_PLACEHOLDER}}"', jsonSlug);
  out = out.replaceAll("{{SLUG_PLACEHOLDER}}", slug);
  return out;
}

function validateGeneratedJsx(jsx: string): string | null {
  const t = jsx.trim();
  if (!t.startsWith("import React, { useState } from 'react'") && !t.startsWith('import React, { useState } from "react"')) {
    return "Generated code must start with import React, { useState } from 'react'.";
  }
  if (!/\bLandingPage\b/.test(t)) {
    return "Generated code must define LandingPage.";
  }
  if (!/\bexport\s+default\s+/.test(t)) {
    return "Generated code must export default LandingPage.";
  }
  return null;
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

    const designSystem = detectDesignSystem(body.offer, body.audience, body.positioning);
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
        max_tokens: 16000,
        system: reactLandingSystemPrompt,
        messages: [
          {
            role: "user",
            content: `DESIGN SYSTEM: ${designSystem}

Business data:
Name: ${displayName}
Offer: ${body.offer}
Audience: ${body.audience}
Pricing: ${body.pricing}
Positioning: ${body.positioning}
Headline: ${body.headline}
Best result: ${body.realResults || "Not provided"}
Ideal client: ${body.idealClient || "Not provided"}
Contact email for display (footer etc.): ${body.userEmail}

Build a single-page landing with hero, benefits, social proof section, FAQ, and the contact form posting to /api/leads.`
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
    let jsx = completion.content?.find((item) => item.type === "text")?.text?.trim() || "";
    jsx = jsx.replace(/^```(?:tsx|jsx|typescript)?\s*/i, "").replace(/\s*```\s*$/i, "");

    const validationError = validateGeneratedJsx(jsx);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 502 });
    }

    const existingPage = await supabase
      .from("landing_pages")
      .select("slug")
      .eq("user_id", user.id)
      .maybeSingle();

    const emailBase = body.userEmail.split("@")[0].replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
    const slug = existingPage.data?.slug ?? `${emailBase}-${randomFourDigits()}`;

    const jsxWithSlug = injectSlugIntoJsx(jsx, slug);

    const { error: upsertError } = await supabase
      .from("landing_pages")
      .upsert(
        {
          user_id: user.id,
          slug,
          jsx_content: jsxWithSlug
        } as never,
        { onConflict: "slug" }
      );

    if (upsertError) {
      return NextResponse.json({ error: "Failed to save landing page.", details: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ slug, jsx: jsxWithSlug, success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    return NextResponse.json({ error: "Failed to generate landing page.", details: message }, { status: 500 });
  }
}
