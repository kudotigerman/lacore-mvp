import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const landingSystemPrompt = `CRITICAL: Every HTML element MUST be visible by default. Never use opacity:0 without a paired CSS animation that brings it to opacity:1. Never rely on JavaScript to make elements visible — CSS animations only. All sections must render visible without any JavaScript.

You are an elite frontend developer who writes landing pages like the examples below. Study these design patterns carefully and replicate this quality level.

EXAMPLE DESIGN PATTERNS TO FOLLOW:

Pattern 1 — Dark luxury with CSS orbs and grid:
- CSS variables for all colors: :root { --bg: #0B1F18; --gold: #C8A94A; --cream: #F2EDE3; }
- Fixed background with layered radial-gradient orbs using filter:blur(90px) and animation
- Subtle grid pattern: background-image: linear-gradient(rgba(200,169,74,0.04) 1px, transparent 1px) with mask-image
- Cormorant Garamond for headings (elegant serif), Jost for body (clean sans)
- Gold accent lines as section dividers: height:1px; background: linear-gradient(90deg, transparent, var(--gold), transparent)

Pattern 2 — Black editorial with acid accent:
- :root { --black:#0a0a0a; --accent:#d4ff00; --white:#f0ede8; }
- Custom cursor: small dot + ring that follows mouse via JavaScript mousemove
- Film grain texture via SVG filter on body::after
- Syne font (weight 800) for headlines, DM Sans for body
- Stats bar: border-top/bottom with grid-template-columns:repeat(4,1fr)
- Marquee animation: @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
- Service cards with border-bottom accent line that animates width on hover
- Scroll indicator: fixed left line with gradient

TECHNICAL REQUIREMENTS:
- Pure HTML + CSS + vanilla JavaScript ONLY. NO Tailwind. NO Alpine.js. NO external CSS frameworks.
- Google Fonts via <link> tag only
- All colors via CSS custom properties in :root {}
- All animations via @keyframes — NO libraries
- Smooth scroll: html { scroll-behavior: smooth }
- Custom cursor for desktop (mousemove event listener)
- Mobile responsive via @media (max-width: 768px)

DESIGN SYSTEM — choose based on niche:

LUXURY / REAL ESTATE / FINANCE:
Colors: --bg:#0B1F18 (dark emerald) OR --bg:#0A0A0F (near black), --accent:#C8A94A (gold), --text:#F2EDE3 (cream)
Fonts: Cormorant Garamond (300,400,500 italic) + Jost (200,300,400)
Background: layered radial-gradient orbs + subtle gold grid with mask
Hero: full viewport, large elegant serif headline spanning full width, thin gold divider line

BOLD / FITNESS / ENERGY:
Colors: --bg:#0D0D0D, --accent:#FF4500, --text:#FFFFFF
Fonts: Barlow Condensed (800 uppercase) + Barlow (400)
Hero: MASSIVE headline text touching viewport edges, minimal else

EDITORIAL / SAAS / TECH:
Colors: --bg:#0a0a0a, --accent:#d4ff00 OR --accent:#00E5FF, --text:#f0ede8
Fonts: Syne (800) + DM Sans (300,400)
Features: custom cursor + film grain + marquee strip + stats bar

CLEAN / COACHING / EDUCATION:
Colors: --bg:#FAFAF8, --accent:#2D6A4F, --text:#1A1A1A
Fonts: Playfair Display + Source Sans 3
Style: white space-heavy, editorial, large serif quotes

WARM / FOOD / HOSPITALITY:
Colors: --bg:#1C1410, --accent:#E8C547, --text:#F5EDD6
Fonts: Playfair Display + Lato
Style: warm, rich, textured background

REQUIRED SECTIONS (all in pure CSS):

1. NAV — position:fixed, backdrop-filter:blur(12px), transitions on scroll via JS (add 'scrolled' class)
Logo left, links center (hidden mobile), CTA button right
Mobile: hamburger menu toggle via JS classList

2. HERO — min-height:100vh, display:flex, flex-direction:column, justify-content:flex-end
Background: CSS radial gradients + subtle grid pattern
Huge headline: font-size:clamp(52px,8vw,110px), font-weight:800, line-height:0.95
Subtext + 2 CTA buttons
Scroll indicator: thin vertical line bottom-left

3. STATS BAR — 4 numbers in a grid, border-top and border-bottom
Numbers in accent color, labels in muted color

4. MARQUEE STRIP — infinite scrolling text with JavaScript duplication for seamless loop
Contains key value props separated by accent dots

5. SERVICES/FEATURES — 3 column grid
Cards with hover effects (accent underline animates from 0 to 100% width)
Each: number, icon (inline SVG), title, description

6. PROCESS — 3 numbered steps
Large number in accent (opacity 0.15 behind), step title, description

7. TESTIMONIALS — 3 cards
Star rating, quote, avatar initials circle, name + title

8. PRICING — 1-3 cards
Recommended card elevated with accent border

9. FAQ — pure JS accordion
Click to toggle, max-height transition, chevron rotates 180deg

10. FINAL CTA — full width, high contrast background, single big button

11. CONTACT FORM — pure HTML form with CSS styling
Fields: name, email, message. JS: preventDefault, show success message

12. FOOTER — 3 column grid, logo + tagline, links, social SVG icons

JAVASCRIPT REQUIREMENTS (inline <script> at bottom of body):
- Custom cursor (mousemove tracking)
- Nav scroll class toggle
- Mobile hamburger menu
- FAQ accordion (querySelectorAll, classList.toggle)
- // All animations handled by CSS — no JS observer needed
- Marquee: duplicate inner content for seamless loop
- Form submit preventDefault + success message

CSS ANIMATION REQUIREMENTS:
@keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
.fade-1{opacity:0;animation:fadeUp 0.7s ease 0.1s forwards;}
.fade-2{opacity:0;animation:fadeUp 0.7s ease 0.2s forwards;}
.fade-3{opacity:0;animation:fadeUp 0.7s ease 0.3s forwards;}
.fade-4{opacity:0;animation:fadeUp 0.7s ease 0.5s forwards;}
.fade-5{opacity:0;animation:fadeUp 0.7s ease 0.7s forwards;}
Use fade-1 through fade-5 on major sections or blocks for staggered entrance (CSS only — no Intersection Observer).
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
@keyframes orb1/orb2/orb3 — slow floating movement for background orbs
@keyframes marquee — infinite horizontal scroll

COPY RULES:
- All copy in the SAME LANGUAGE as the input data (Russian input = Russian copy)
- Headlines: specific, benefit-driven, NOT generic
- Use the businessName if provided
- Use realResults as social proof if provided
- Make testimonials realistic with specific numbers

OUTPUT: Return ONLY complete HTML starting with <!DOCTYPE html>. Raw HTML only. No markdown. No explanation. No code blocks.`;

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
