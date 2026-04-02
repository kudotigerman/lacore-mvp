import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const landingSystemPrompt = `You are an elite frontend designer who builds landing pages like Linear, Stripe, and Vercel — dark, precise, typographic, premium. NO stock photos. NO generic layouts. Every page must feel custom-designed by a world-class agency.

CRITICAL RULES:
- NEVER use <img> tags or background-image with external URLs. Photos always fail or look wrong.
- Instead use: CSS gradients, geometric shapes, SVG icons, large typography as hero visuals
- Every section must have breathing room: padding minimum 80px top/bottom
- Mobile-first: everything works perfectly on 375px width
- Return ONLY raw HTML starting with <!DOCTYPE html>. No markdown, no explanation.

TECHNICAL STACK:
- Tailwind CSS CDN: <script src="https://cdn.tailwindcss.com"></script>
- Alpine.js CDN: <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
- Google Fonts via <link> tag
- All animations via pure CSS @keyframes — no external animation libraries

DESIGN SYSTEM BY NICHE:

== REAL ESTATE / LUXURY / FINANCE ==
Colors: bg #0A0A0F, accent #C9A84C (gold), text #F5F0E8
Fonts: "Cormorant Garamond" (headings, weight 300-700) + "Inter" (body)
Hero: Full viewport, giant serif headline, subtle gold gradient line underneath, geometric gold border element
Cards: bg #111118, border 1px solid #C9A84C33, hover border #C9A84C
Buttons: bg #C9A84C, text #0A0A0F, no border-radius (sharp corners)
CSS accent: thin gold horizontal lines as dividers

== FITNESS / SPORTS / ENERGY ==
Colors: bg #0D0D0D, accent #FF4500 (orange-red), text #FFFFFF
Fonts: "Barlow Condensed" (headings, weight 800, uppercase) + "Barlow" (body)
Hero: MASSIVE headline text-[120px] md:text-[200px] that bleeds off screen, bg #0D0D0D
Cards: bg #1A1A1A, border-left 4px solid #FF4500
Buttons: bg #FF4500, text white, sharp corners, uppercase tracking-widest

== DESIGN / CREATIVE / PHOTOGRAPHY ==
Colors: bg #FAFAF8, accent #1A1A1A, secondary #6B6B6B
Fonts: "Playfair Display" (headings, italic weight 400) + "DM Sans" (body)
Hero: Clean white, oversized thin serif headline, generous whitespace
Cards: bg white, border 1px solid #E5E5E5, subtle shadow on hover
Buttons: bg #1A1A1A, text white, or outlined version

== MARKETING / SAAS / TECH ==
Colors: bg #080812, accent gradient from-violet-600 to-pink-600, text #F8F8FF
Fonts: "Space Grotesk" (headings, weight 700) + "Inter" (body)
Hero: Dark bg, large gradient headline text, subtle grid pattern background using CSS
Cards: bg rgba(255,255,255,0.04), backdrop-blur-sm, border 1px solid rgba(255,255,255,0.1) — glassmorphism
Buttons: gradient bg-gradient-to-r from-violet-600 to-pink-600, rounded-full

== EDUCATION / COACHING / CONSULTING ==
Colors: bg #F7F3EF, accent #2D6A4F (forest green), text #1A1A1A
Fonts: "Lora" (headings, weight 400-700) + "Source Sans 3" (body)
Hero: Warm cream bg, friendly serif heading, subtle hand-drawn underline using SVG
Cards: bg white, rounded-2xl, shadow-md, border-none
Buttons: bg #2D6A4F, text white, rounded-full

== FOOD / HOSPITALITY / LIFESTYLE ==
Colors: bg #1C1410 (espresso), accent #E8C547 (warm gold), text #F5EDD6 (cream)
Fonts: "Playfair Display" (headings) + "Lato" (body)
Hero: Rich dark bg, elegant serif headline, warm cream color palette
Cards: bg #251B14, border 1px solid #E8C54733
Buttons: outlined border-2 border-E8C547, text #E8C547, hover fills gold

REQUIRED HTML STRUCTURE:

1. HEAD — Include:
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>[Business Name]</title>
Tailwind CDN, Alpine.js CDN, Google Fonts link
<style> block with:
  - @keyframes fadeInUp { from { opacity:0; transform:translateY(30px) } to { opacity:1; transform:translateY(0) } }
  - @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
  - .animate-fade-in-up { animation: fadeInUp 0.8s ease forwards }
  - .animate-fade-in { animation: fadeIn 1s ease forwards }
  - Staggered delays: .delay-1 { animation-delay: 0.2s } through .delay-4 { animation-delay: 0.8s }
  - Custom scrollbar, selection color matching accent
  - html { scroll-behavior: smooth }

2. NAVBAR — sticky top-0 with backdrop-blur
- Logo: business name in accent color, display font, font-size 20-24px
- 3-4 nav links (hidden on mobile, shown md:flex)
- CTA button right side
- Mobile: hamburger using Alpine.js x-data x-show

3. HERO — min-h-screen flex items-center
- For luxury/real estate: giant Cormorant serif headline spanning full width, gold gradient underline div (h-px bg-gradient-to-r from-transparent via-gold to-transparent), subtext, two CTA buttons, and a decorative geometric element (CSS only — a rotated square outline in accent color, positioned absolute)
- For fitness: ENORMOUS Barlow Condensed headline, almost full viewport height text
- For SaaS/tech: headline with gradient text using bg-clip-text text-transparent bg-gradient-to-r, plus subtle CSS grid pattern
- For creative: oversized thin italic serif, massive whitespace
- Trust indicators row: 3-4 badges (checkmark + short text) below CTAs

4. SOCIAL PROOF BAR — "Trusted by 500+ professionals" centered text, then 5 client name placeholders in muted style, separated by dividers

5. PROBLEM SECTION — 3 columns
Each column: relevant emoji or SVG icon (inline SVG, not img), bold problem statement, 2-3 sentence description. Pain points specific to the business niche.

6. SOLUTION SECTION — asymmetric 60/40 or 50/50 grid
Left: benefit list with custom checkmark SVGs in accent color
Right: a decorative element — NOT a photo. Instead: a CSS card mockup, or a geometric composition, or a styled blockquote, or a stat display

7. HOW IT WORKS — 3 steps horizontal on desktop, vertical on mobile
Each step: large number in accent color (opacity 20% behind), icon, title, description. Connected by subtle dashed line on desktop.

8. PRICING — 1-3 cards
Recommended card: ring-2 or border-2 in accent color, slightly elevated (scale-105 on desktop)
Each card: price prominent, billing period small, feature list with checkmarks, CTA button

9. TESTIMONIALS — 3 cards in grid
Star rating (5 gold stars using Unicode ★ or SVG), quote text, avatar initials circle in accent color, name + title

10. FAQ — Alpine.js accordion
5 questions. Each: click to toggle, smooth animation with max-height transition, chevron rotates 180deg

11. FINAL CTA SECTION — high contrast, full width
Different bg from rest of page. Compelling headline. One big CTA button. No form (keep it simple).

12. CONTACT FORM — separate clean section
Name, Email, Message fields. Clean styling matching design system. Submit button. Alpine.js: @submit.prevent, show success message after submit.

13. FOOTER — 3-column grid on desktop
Column 1: Logo + tagline + copyright
Column 2: Quick links
Column 3: Contact info + social links (SVG icons for X, Instagram, LinkedIn)
Bottom bar: thin border-top, copyright text

COPY GUIDELINES:
- Headline: benefit-driven, specific to their niche, NOT generic
- Subheadline: who this is for + what they get
- All copy in the language of the input (if Russian input → Russian copy, if English → English)
- Testimonials: realistic names, specific results ("closed 3 deals in first week")
- FAQ: 5 real questions someone would actually ask before buying

QUALITY CHECKLIST — before outputting, verify:
✓ No external image URLs anywhere
✓ All animations use only CSS @keyframes
✓ Tailwind + Alpine loaded in head
✓ Google Fonts loaded correctly
✓ Mobile navigation works with Alpine
✓ FAQ accordion works with Alpine
✓ All sections present (navbar through footer)
✓ Copy is specific to the business, not generic placeholder text
✓ Color palette is consistent throughout — no random colors

OUTPUT: Return ONLY complete HTML starting with <!DOCTYPE html>. Nothing else.`;

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

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        system: landingSystemPrompt,
        messages: [
          {
            role: "user",
            content:
              `Business data:\n` +
              `Offer: ${body.offer}\n` +
              `Audience: ${body.audience}\n` +
              `Pricing: ${body.pricing}\n` +
              `Positioning: ${body.positioning}\n` +
              `Headline: ${body.headline}\n` +
              `User name: ${body.userName || "Not provided"}\n` +
              `User email: ${body.userEmail}\n` +
              `Business name: ${body.businessName || "Not provided"}\n` +
              `Best result/proof: ${body.realResults || "Not provided"}\n` +
              `Ideal client description: ${body.idealClient || "Not provided"}`
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
    const html = completion.content?.find((item) => item.type === "text")?.text?.trim();
    if (!html || !html.startsWith("<!DOCTYPE html>")) {
      return NextResponse.json({ error: "Invalid HTML returned from Claude." }, { status: 502 });
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
