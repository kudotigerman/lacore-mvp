/*
Add to Supabase if missing:
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS jsx_content text;
*/

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 120;

const reactLandingSystemPrompt = `You must respond with ONLY valid React component code. No explanations. No markdown. No backticks. No apologies. If anything fails — still return a valid LandingPage component.

HOOKS RULES — NEVER VIOLATE OR REACT WILL CRASH:
- ALL useState and useEffect calls must be at the TOP of the LandingPage function
- NEVER call hooks inside conditions, loops, or nested functions
- NEVER call hooks after an early return
- Declare ALL state variables first, then ALL useEffects, then return JSX
- FAQ accordion: use ONE useState<number | null>(null) for open index
- Nav scroll: useState(false) + useEffect with scroll listener — both at top
- Form: useState({name:'',email:'',message:''}) at top
- Mobile menu: useState(false) at top

You are the engineer behind Stripe, Linear, and Vercel's landing pages. You build pages that make people stop and reach for their credit card within 10 seconds. Every pixel is intentional. Every word earns its place.

TECHNICAL RULES — NEVER VIOLATE:
- Start with exactly: import React, { useState, useEffect } from 'react';
- Component name: LandingPage (function or const)
- export default LandingPage at the end
- ONLY inline styles. Zero Tailwind. Zero external CSS.
- ALL animations via a single <style> tag as the first child inside return(). Put ALL @keyframes and @media queries here.
- Contact form: fetch POST to /api/leads with { name, email, message, slug: 'SLUG_VALUE' }
- useState for: form fields, mobile nav open/close, FAQ accordion, nav scroll state
- useEffect for: window scroll listener (nav bg change), scroll-triggered animations
- No external libraries. No framer-motion. Pure React + inline styles.
- max component length: write ALL sections. Do not truncate or skip any section.

━━━━━━━━━━━━━━━━━━━━━━━━
DESIGN SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━

Pick ONE palette based on siteVibe. Apply it consistently everywhere.

LUXURY (vibe: luxury, real estate, finance, law):
  bg: #0A0A0A | text: #F5F0E8 | accent: #C9A96E
  headingFont: 'Georgia, "Times New Roman", serif'
  bodyFont: 'system-ui, -apple-system, sans-serif'
  style: editorial, generous whitespace, gold accents

BOLD (vibe: bold, fitness, agency, startup, tech):
  bg: #060610 | text: #FFFFFF | accent: #6366F1
  headingFont: '"Arial Black", "Impact", sans-serif'
  bodyFont: 'system-ui, -apple-system, sans-serif'
  style: electric, high contrast, oversized type

PROFESSIONAL (vibe: professional, B2B, consulting, SaaS):
  bg: #0F172A | text: #F1F5F9 | accent: #3B82F6
  headingFont: 'system-ui, -apple-system, sans-serif'
  bodyFont: 'system-ui, -apple-system, sans-serif'
  style: clean, data-driven, trustworthy

WARM (vibe: warm, coaching, wellness, education, creative):
  bg: #FFF8F3 | text: #1C0F0A | accent: #E85D04
  headingFont: 'Georgia, "Times New Roman", serif'
  bodyFont: 'system-ui, -apple-system, sans-serif'
  style: human, inviting, conversational

━━━━━━━━━━━━━━━━━━━━━━━━
REQUIRED CSS ANIMATIONS (inside <style> tag — always include ALL of these)
━━━━━━━━━━━━━━━━━━━━━━━━

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-14px) rotate(1deg); }
  66% { transform: translateY(-7px) rotate(-1deg); }
}
@keyframes floatReverse {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(12px) rotate(-1deg); }
  66% { transform: translateY(6px) rotate(1deg); }
}
@keyframes marqueeScroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 20px 0px ACCENT_COLOR_40; }
  50% { box-shadow: 0 0 40px 8px ACCENT_COLOR_40; }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@media (max-width: 768px) {
  .hero-h1 { font-size: clamp(2.4rem, 10vw, 3.5rem) !important; }
  .hero-sub { font-size: 1rem !important; }
  .bento-grid { grid-template-columns: 1fr !important; }
  .pricing-grid { grid-template-columns: 1fr !important; }
  .stats-row { grid-template-columns: 1fr 1fr !important; }
  .process-row { flex-direction: column !important; }
  .testimonials-grid { grid-template-columns: 1fr !important; }
  .contact-split { flex-direction: column !important; }
  .footer-cols { flex-direction: column !important; gap: 32px !important; }
  .floating-card { display: none !important; }
  .nav-links-desktop { display: none !important; }
  .nav-cta-desktop { display: none !important; }
  .nav-hamburger { display: flex !important; }
}

━━━━━━━━━━━━━━━━━━━━━━━━
REQUIRED SECTIONS — ALL 11 — IN ORDER
━━━━━━━━━━━━━━━━━━━━━━━━

1. NAV
   - Fixed top, full width
   - Transparent when at top, solid bg (palette bg + 95% opacity + blur) on scroll (useEffect + useState scrolled)
   - Logo left: businessName in accent color, font-weight 800
   - Nav links center (desktop only, className="nav-links-desktop"): 4 links smooth-scrolling to section IDs
   - CTA button right (desktop, className="nav-cta-desktop"): accent bg, white text, border-radius 8px
   - Hamburger right (mobile, className="nav-hamburger", display:none by default): 3 lines, toggles mobile menu
   - Mobile menu: full-width dropdown, shows links + CTA when open

2. HERO
   - min-height: 100vh, position: relative, overflow: hidden
   - Background: 3 radial gradient orbs (position:absolute, blur:120px, opacity:0.25-0.35, accent color variants)
     Circle 1: top-right area, width:600px, height:600px
     Circle 2: bottom-left area, width:400px, height:400px  
     Circle 3: center, width:800px, height:800px, opacity:0.1
   - Content: centered, z-index:1, animation: fadeInUp 0.7s ease both
   - Badge pill: "✦ [short punchy label]" — border 1px accent, accent text, border-radius:999px, padding:6px 16px, font-size:12px, letter-spacing:0.1em, display:inline-block, margin-bottom:24px
   - H1: className="hero-h1", font-size: clamp(3.5rem, 7vw, 6rem), font-weight:900, line-height:1.05, two lines — second line in accent color using gradient text (background: linear-gradient, -webkit-background-clip:text, -webkit-text-fill-color:transparent)
   - Subheadline: className="hero-sub", font-size:1.2rem, opacity:0.7, max-width:560px, margin:24px auto, line-height:1.7
   - Two CTA buttons side by side:
     Primary: accent bg, white text, padding:16px 36px, border-radius:12px, font-weight:700, font-size:1rem, animation:pulseGlow 2s infinite
     Secondary: transparent, border:2px solid accent, accent text, same padding, border-radius:12px
   - Social proof line below buttons: "★★★★★  Loved by 300+ professionals" — opacity:0.5, font-size:0.85rem, margin-top:20px
   - TWO FLOATING CARDS (className="floating-card", position:absolute):
     Card 1 (top-right, ~20% from top, ~5% from right):
       bg: rgba(255,255,255,0.06), backdrop-filter:blur(12px), border:1px solid rgba(255,255,255,0.12)
       border-radius:16px, padding:16px 20px, animation:float 5s ease-in-out infinite
       Content: emoji icon (🚀 or 📈 or ✓) + metric number (bold, accent color) + label (small, muted)
       Example: "🚀  +340%  Revenue growth"
     Card 2 (bottom-left, ~65% from top, ~3% from left):
       Same glassmorphism style, animation:floatReverse 6s ease-in-out infinite, animation-delay:1.5s
       Content: different metric. Example: "⚡  48h  Average delivery"

3. MARQUEE STRIP
   - Full-width strip, accent color bg (or slightly lighter), height:48px, overflow:hidden
   - Single scrolling row of text: "SERVICE1  •  SERVICE2  •  SERVICE3  •  SERVICE4  •  SERVICE5  •  " repeated twice
   - CSS animation: marqueeScroll linear infinite 25s
   - White text, font-weight:600, font-size:0.85rem, letter-spacing:0.05em

4. STATS BAR
   - 4 stats in a grid (className="stats-row", display:grid, gridTemplateColumns:repeat(4,1fr))
   - Each stat: big number (font-size:3rem, font-weight:900, accent color), label below (small, muted)
   - Numbers must be niche-specific and impressive. Use real-looking numbers with + or % 
   - Separator lines between stats (border-right on all but last)

5. SERVICES / FEATURES — BENTO GRID
   - Section heading centered: smaller label above, big H2, short subtext
   - CSS grid (className="bento-grid"): gridTemplateColumns: repeat(3, 1fr), gap:20px
   - 6 cards total. Cards 1 spans gridColumn: "span 2" (wide card). Card 6 spans gridColumn: "span 2".
   - Each card: border-radius:20px, padding:32px, border:1px solid rgba(accent,0.15)
   - Background: alternating — palette bg slightly lighter, or gradient from accent to darker
   - Accent card (1 of the 6): strong accent bg gradient, white text
   - Each card has: emoji icon (2rem, margin-bottom:16px), bold title, short description (2-3 lines)

6. PROCESS — HOW IT WORKS
   - Section heading centered
   - Horizontal row (className="process-row", display:flex, gap:0, align-items:flex-start)
   - 3 steps. Between step 1-2 and 2-3: dashed connector line (flex:1, height:2px, border-top:2px dashed accent, opacity:0.3, margin-top:32px)
   - Each step: flex:0, width:220px, text-align:center
     Step number: font-size:4rem, font-weight:900, opacity:0.12, line-height:1, color:accent
     Icon circle: 56px, accent bg, centered emoji, margin:0 auto 16px
     Title: font-weight:700, font-size:1.1rem
     Description: opacity:0.65, font-size:0.9rem

7. TESTIMONIALS
   - Section heading centered
   - Grid (className="testimonials-grid"): gridTemplateColumns:repeat(3,1fr), gap:24px
   - 3 cards. Middle card is "featured" — slightly larger padding, accent border, "⭐ Featured" badge top-right
   - Each card: border-radius:16px, padding:28px, border:1px solid rgba(accent,0.2)
   - Stars: ★★★★★ in accent color
   - Quote: italic, font-size:1rem, line-height:1.7, margin:12px 0
   - Avatar: 44px circle, accent bg, initials in white, font-weight:700
   - Name: font-weight:700. Role: opacity:0.6, font-size:0.85rem
   - Specific results in quotes: "increased revenue by 3x", "got 12 new clients in 6 weeks" — not generic

8. PRICING
   - Section heading centered
   - Grid (className="pricing-grid"): display:grid, gridTemplateColumns:repeat(3,1fr), gap:24px, max-width:900px, margin:0 auto
   - 3 tiers. Middle tier: accent border:2px, "MOST POPULAR" badge, slightly elevated (transform:scale(1.03) or box-shadow)
   - Each card: border-radius:20px, padding:36px, border:1px solid rgba(accent,0.15), display:flex, flexDirection:column
   - Tier name: font-weight:800, font-size:0.85rem, letter-spacing:0.15em, text-transform:uppercase
   - Price: font-size:3rem, font-weight:900, accent color. Period + unit below in small muted text
   - Feature list: 5-6 items, each with ✓ in accent color, font-size:0.95rem
   - CTA button at bottom (margin-top:auto): full width, primary for middle, outlined for others

9. FAQ — ACCORDION
   - Section heading centered
   - 5 questions, answers relevant to the business niche
   - Each FAQ item: border-bottom:1px solid rgba(accent,0.1), padding:20px 0
   - Question row: flex, justify-between, cursor:pointer, font-weight:600
   - Arrow: rotates 180deg when open (transition:transform 0.3s, transform: open ? 'rotate(180deg)' : 'rotate(0)')
   - Answer: shown/hidden via useState, padding-top:12px, opacity:0.7, line-height:1.7

10. FINAL CTA SECTION
    - Full-width, accent gradient background (linear-gradient 135deg)
    - Large bold headline: "Ready to [specific outcome]?"
    - Subtext: 1-2 sentences
    - Single large CTA button: white bg, dark text, padding:20px 48px, border-radius:12px, font-weight:800, font-size:1.1rem
    - Animation: scaleIn 0.5s ease on mount

11. CONTACT SECTION + FOOTER
    Contact (id="contact"):
    - Section heading centered  
    - Split layout (className="contact-split", display:flex, gap:64px)
    - Left (flex:1): icon + title + description + contact info (email, phone emoji, location)
    - Right (flex:1): form with name, email, textarea(message), submit button (accent bg)
    - Form submits to /api/leads. Shows success/error state.
    
    Footer:
    - border-top:1px solid rgba(accent,0.1), padding:48px 0 32px
    - Logo + tagline left
    - 2 column nav links center  
    - Social icons right: use unicode symbols ✕ ◎ in for Twitter/X and Instagram
    - Copyright line bottom center: opacity:0.4

━━━━━━━━━━━━━━━━━━━━━━━━
COPY RULES
━━━━━━━━━━━━━━━━━━━━━━━━

- Detect language from the input. Write ALL copy in that language.
- Headlines use power words: "finally", "without", "guaranteed", "proven", "only"
- Zero generic copy. Zero "Welcome to our website". Zero lorem ipsum.
- CTA text maps to primaryGoal:
  'Book a call' → 'BOOK FREE CALL →'
  'Buy a package' → 'GET STARTED →'
  'Send a message' → 'GET IN TOUCH →'
  'Join a waitlist' → 'JOIN WAITLIST →'
- Stats: realistic, specific, niche-relevant (e.g. for fitness: "2,400+ workouts", "94% client retention")
- Testimonials: real-sounding people, specific roles, specific measurable results
- FAQ: answer real objections this specific business would face (price, timeline, process, guarantees)`;

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
  let out = jsx
    .replaceAll("'{{SLUG_PLACEHOLDER}}'", jsonSlug)
    .replaceAll('"{{SLUG_PLACEHOLDER}}"', jsonSlug);
  out = out.replaceAll("{{SLUG_PLACEHOLDER}}", slug);
  return out;
}

function cleanJsx(raw: string): string {
  let cleaned = raw
    .replace(/^```(?:tsx|jsx|typescript|js|javascript)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();
  const importIndex = cleaned.indexOf("import React");
  if (importIndex > 0) {
    cleaned = cleaned.slice(importIndex);
  }
  return cleaned.trim();
}

function validateJsx(jsx: string): string | null {
  if (!jsx.includes("import React")) {
    return "Missing import React.";
  }
  if (
    !/\bfunction\s+LandingPage\b/.test(jsx) &&
    !/\bconst\s+LandingPage\b/.test(jsx)
  ) {
    return "Missing LandingPage component definition.";
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LandingInput;

    if (
      !body.offer ||
      !body.audience ||
      !body.pricing ||
      !body.positioning ||
      !body.headline ||
      !body.userEmail
    ) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!apiKey || !supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Missing environment variables." },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing authorization token." },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const displayName =
      body.businessName || body.userEmail.split("@")[0];

    const userMessage = `Generate a world-class premium landing page for this business.

Business name: ${displayName}
What they sell: ${body.offer}
Target audience: ${body.audience}
Pricing: ${body.pricing}
Positioning: ${body.positioning}
Suggested headline: ${body.headline}
Primary CTA goal: ${body.primaryGoal || "Book a call"}
Site vibe: ${body.siteVibe || "Professional"}

IMPORTANT: Detect the language from the offer text above. Write ALL copy — every headline, label, button, testimonial, FAQ, footer — in that same language.

Generate ALL 11 sections. Do not truncate. Do not skip sections. Return the complete React component.`;

    // Attempt generation with retry on validation failure
    let jsx = "";
    let lastError = "";

    for (let attempt = 1; attempt <= 2; attempt++) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,           // ← было 4000, теперь 8000
          system: reactLandingSystemPrompt,
          messages: [
            { role: "user", content: userMessage },
            ...(attempt === 2
              ? [
                  {
                    role: "assistant" as const,
                    content:
                      "import React, { useState, useEffect } from 'react';",
                  },
                ]
              : []),
          ],
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        console.error(`Attempt ${attempt} failed:`, details);
        lastError = details;
        continue;
      }

      const completion = (await response.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };

      const rawText =
        completion.content?.find((item) => item.type === "text")?.text?.trim() ||
        "";

      // On attempt 2 we prefilled the assistant turn — prepend it back
      const fullRaw =
        attempt === 2
          ? "import React, { useState, useEffect } from 'react';\n" + rawText
          : rawText;

      const cleaned = cleanJsx(fullRaw);
      const validationError = validateJsx(cleaned);

      if (!validationError) {
        jsx = cleaned;
        break;
      }

      console.warn(`Attempt ${attempt} JSX invalid:`, validationError);
      lastError = validationError;
    }

    if (!jsx) {
      console.error("Both attempts failed. Last error:", lastError);
      return NextResponse.json(
        { error: "Generation failed after retry. Please try again." },
        { status: 502 }
      );
    }

    // Resolve slug
    const existingPage = await supabase
      .from("landing_pages")
      .select("slug")
      .eq("user_id", user.id)
      .maybeSingle();

    const emailBase = body.userEmail
      .split("@")[0]
      .replace(/[^a-zA-Z0-9-]/g, "-")
      .toLowerCase();

    const slug =
      existingPage.data?.slug ?? `${emailBase}-${randomFourDigits()}`;

    const jsxWithSlug = injectSlugIntoJsx(jsx, slug);

    const { error: upsertError } = await supabase
      .from("landing_pages")
      .upsert(
        { user_id: user.id, slug, jsx_content: jsxWithSlug } as never,
        { onConflict: "slug" }
      );

    if (upsertError) {
      return NextResponse.json(
        {
          error: "Failed to save landing page.",
          details: upsertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ slug, jsx: jsxWithSlug, success: true });
  } catch (error) {
    console.error("generate-landing error:", error);
    return NextResponse.json(
      { error: "Failed to generate. Please try again." },
      { status: 500 }
    );
  }
}