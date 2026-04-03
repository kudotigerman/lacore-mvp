/*
Add to Supabase if missing:

ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS jsx_content text;
*/

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 120;

const reactLandingSystemPrompt = `You must respond with ONLY a React component. Never respond with explanations, apologies, or error messages. If you cannot complete the request, still return a valid React LandingPage component.

You are a world-class web designer and React developer. You create landing pages that look like they cost $10,000 from a top agency. Think Stripe, Linear, Vercel - clean, bold, premium.

Generate a complete React functional component for a landing page.

TECHNICAL RULES:
- Component name: LandingPage
- Only inline styles - no CSS files, no Tailwind classes
- No imports except: import React, { useState } from 'react';
- All CSS animations via a <style> tag injected inside the component JSX
- Contact form uses fetch POST to /api/leads with body: { name, email, message, slug: 'SLUG_VALUE' }
- Use useState for form state and nav mobile menu
- Return ONLY the component code starting with: import React, { useState } from 'react';

DESIGN SYSTEM - choose based on niche and vibe:

For LUXURY / PREMIUM vibe or real estate / finance niche:
- Colors: bg #0A0A0A, accent gold #C8A84C, text #F8F9FC
- Font stack: Georgia, serif for headings - system-ui for body
- Style: editorial, lots of whitespace, elegant

For BOLD / ENERGETIC vibe or fitness / sport / agency niche:
- Colors: bg #080808, accent #FF3D00 or #06B6D4, text #FFFFFF
- Font stack: Impact, Arial Black for headings
- Style: high contrast, big numbers, aggressive

For PROFESSIONAL / TRUSTWORTHY vibe or B2B / legal / consulting:
- Colors: bg #0F1628, accent #4A90D9, text #F0F4FF
- Font stack: system-ui, clean sans-serif
- Style: structured, data-driven, authoritative

For WARM / APPROACHABLE vibe or coaching / wellness / education:
- Colors: bg #FDF8F5, accent #E8917A, text #1C1416
- Font stack: Georgia for headings, system-ui for body
- Style: friendly, inviting, human

REQUIRED SECTIONS (in order):
1. NAV - logo left, 3-4 nav links center, CTA button right, mobile hamburger menu
2. HERO - massive headline (font-size clamp(56px, 8vw, 120px)), subheadline, 2 CTA buttons, animated background (mesh gradient or geometric pattern via CSS)
3. STATS BAR - 3-4 impressive numbers in a horizontal row with animated count-up feel
4. SERVICES - bento grid layout (CSS grid), 4-6 cards with icons (use unicode or emoji), one accent card
5. PROCESS - numbered steps (01, 02, 03) with titles and descriptions
6. TESTIMONIALS - 3 cards with star rating, quote, avatar initials, name, role
7. PRICING - 2-3 tiers, middle one highlighted with accent border. PRICING section: Always use a single row (display: grid, gridTemplateColumns: repeat(3, 1fr), gap: 24px) for 3 tiers. NEVER use a 2x2 grid or wrap cards. All 3 cards must be equal height using alignItems: stretch. The middle card gets accent border and 'MOST POPULAR' badge.
8. FAQ - 5 questions with accordion (useState toggle)
9. CTA SECTION - full-width accent background, big headline, button
10. CONTACT - split layout: info left, form right with name/email/message fields + submit button
11. FOOTER - logo, tagline, 2 column links, copyright, social icons (use unicode)

ANIMATION REQUIREMENTS (inject via <style> tag):
- Hero: fadeUp animation on headline and subtext
- Floating elements in hero background
- Nav: solid bg on scroll (use useState + useEffect with window.addEventListener scroll)
- Cards: subtle border highlight on hover via CSS
- Marquee strip between hero and stats: scrolling text with key services

CONTENT RULES:
- All text in the SAME LANGUAGE as the input data
- Make headlines powerful and specific - no generic 'Welcome to our service'
- Use the primaryGoal to determine the main CTA button text and form purpose:
  'Book a call' -> 'BOOK YOUR FREE CALL ->'
  'Buy a package' -> 'GET STARTED ->'
  'Send a message' -> 'GET IN TOUCH ->'
  'Join a waitlist' -> 'JOIN THE WAITLIST ->'
- Use the siteVibe to inform tone of ALL copy
- Stat numbers should be realistic and impressive for the niche
- Testimonials should feel real - specific results, real-sounding names

QUALITY BAR: Every section must look intentional and premium. No placeholder text. No lorem ipsum. Every pixel serves the conversion goal.`;

const retrySystemPrompt = `CRITICAL: You must respond with ONLY valid React JSX code. No explanations. No markdown. No backticks.

Your response must:
1. Start EXACTLY with: import React, { useState } from 'react';
2. Define a function called LandingPage
3. End with: export default LandingPage;

Nothing before the import. Nothing after the export. Only code.`;

type LandingInput = {
  offer: string;
  audience: string;
  pricing: string;
  positioning: string;
  headline: string;
  userName?: string;
  userEmail: string;
  businessName?: string;
  primaryGoal?: string;
  siteVibe?: string;
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

// Strips markdown fences and any text before the import statement
function cleanJsx(raw: string): string {
  // Remove markdown code fences
  let cleaned = raw.replace(/^```(?:tsx|jsx|typescript|js)?\s*/im, "").replace(/\s*```\s*$/im, "").trim();

  // Find where the actual import starts
  const importIndex = cleaned.indexOf("import React");
  if (importIndex > 0) {
    cleaned = cleaned.slice(importIndex);
  }

  return cleaned.trim();
}

function validateJsx(jsx: string): string | null {
  if (!jsx.includes("import React")) {
    return "Generated code must start with import React.";
  }
  if (!/\bLandingPage\b/.test(jsx)) {
    return "Generated code must define LandingPage.";
  }
  if (!/\bexport\s+default\b/.test(jsx)) {
    return "Generated code must export default LandingPage.";
  }
  return null;
}

async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Claude API error ${response.status}: ${details}`);
  }

  const completion = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  return completion.content?.find((item) => item.type === "text")?.text?.trim() || "";
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
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const displayName = body.businessName || body.userEmail.split("@")[0];

    const userMessage = `Generate a premium landing page for this business:

Business name: ${displayName}
What they sell: ${body.offer}
Target audience: ${body.audience}
Pricing: ${body.pricing}
Positioning: ${body.positioning}
Headline: ${body.headline}
Primary goal: ${body.primaryGoal || "Not provided"}
Site vibe: ${body.siteVibe || "Not provided"}
Language: detect from the offer text and write ALL copy in that language

Make it look world-class. Every section must feel premium and intentional.`;

    // Attempt 1 — full quality prompt
    let rawText = await callClaude(apiKey, reactLandingSystemPrompt, userMessage);
    let jsx = cleanJsx(rawText);
    let validationError = validateJsx(jsx);

    // Attempt 2 — if validation failed, retry with strict prompt
    if (validationError) {
      console.warn("Attempt 1 failed validation:", validationError, "— retrying...");
      const retryMessage = `${userMessage}

IMPORTANT: Your previous response failed validation. You MUST:
- Start with exactly: import React, { useState } from 'react';
- Define: function LandingPage() { ... }
- End with: export default LandingPage;
- NO text before the import. NO text after the export.`;

      rawText = await callClaude(apiKey, retrySystemPrompt, retryMessage);
      jsx = cleanJsx(rawText);
      validationError = validateJsx(jsx);
    }

    if (validationError) {
      console.error("Both attempts failed. Last JSX sample:", jsx.slice(0, 300));
      return NextResponse.json({ error: "Generation failed after 2 attempts. Please try again." }, { status: 502 });
    }

    // Resolve slug
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
        { user_id: user.id, slug, jsx_content: jsxWithSlug } as never,
        { onConflict: "slug" }
      );

    if (upsertError) {
      return NextResponse.json({ error: "Failed to save landing page.", details: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ slug, jsx: jsxWithSlug, success: true });
  } catch (error) {
    console.error("generate-landing:", error);
    return NextResponse.json({ error: "Failed to generate. Please try again in a moment." }, { status: 500 });
  }
}