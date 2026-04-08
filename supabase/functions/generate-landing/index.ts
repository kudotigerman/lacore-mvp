import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function escapeHtmlTitleText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function injectDocumentTitle(html: string, rawTitle: string): string {
  const normalized = rawTitle.replace(/\s+/g, " ").trim();
  const inner = escapeHtmlTitleText(normalized.length > 0 ? normalized : "Landing");
  if (/<title[^>]*>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${inner}</title>`);
  }
  return html.replace(/<head[^>]*>/i, (open) => `${open}<title>${inner}</title>`);
}

/** Keep in sync with app/api/generate-landing/system-prompt.txt */
const systemPrompt = `════════════════════════════════════
MANDATORY CSS & LAYOUT (EVERY PAGE)
════════════════════════════════════
MANDATORY CSS — include this exact block inside every landing page’s first <style> tag, BEFORE any other rules (niche colors, fonts, etc.):

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
}

body {
  min-height: 100vh;
  overflow-x: hidden;
  line-height: 1.6;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}

.container {
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  padding: 0 24px;
}

section {
  width: 100%;
  overflow: hidden;
}

/* Cards grid - never overflow */
.cards-grid, .features-grid, .testimonials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  width: 100%;
}

.card {
  width: 100%;
  min-width: 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* Nav */
nav {
  width: 100%;
  overflow: hidden;
}

nav ul {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  list-style: none;
  align-items: center;
}

/* Buttons */
.btn, button, [class*='btn'] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  cursor: pointer;
  text-decoration: none;
}

/* Mobile */
@media (max-width: 768px) {
  h1 { font-size: clamp(28px, 8vw, 56px) !important; }
  h2 { font-size: clamp(22px, 6vw, 36px) !important; }

  .cards-grid, .features-grid, .testimonials-grid {
    grid-template-columns: 1fr !important;
  }

  nav {
    padding: 12px 16px;
  }

  nav ul {
    gap: 8px;
  }

  section {
    padding-left: 16px !important;
    padding-right: 16px !important;
  }

  .container {
    padding: 0 16px;
  }
}

@media (max-width: 480px) {
  h1 { font-size: clamp(24px, 7vw, 40px) !important; }

  .btn, button {
    width: 100% !important;
    max-width: 100% !important;
  }
}

LAYOUT RULES (enforce together with the block above):
- All multi-column grids: CSS Grid only with repeat(auto-fit, minmax(...)) — never float.
- All images: max-width: 100%, height: auto.
- All sections: overflow: hidden (or equivalent containment).
- Text inside cards: word-wrap / overflow-wrap break-word.
- Mobile: primary CTAs and buttons full width (covered by the mandatory @media rules; do not override with narrower fixed widths on small screens).

════════════════════════════════════
STEP 0 — MANDATORY PREMIUM TECH REQUIREMENTS (EVERY PAGE)
════════════════════════════════════
These requirements are mandatory for every generated landing page and must be implemented together with all existing niche/template/color/section rules.

MANDATORY CSS / ASSETS IN <head>:
1) GOOGLE FONTS — always include:
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

Typography usage:
- body { font-family: 'Inter', sans-serif; }
- h1, h2 { font-family: 'Plus Jakarta Sans', sans-serif; }

2) AOS ANIMATIONS — always include:
<link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">
<script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
<script>AOS.init({ duration: 800, once: true, offset: 100 });</script>

Apply data-aos attributes:
- Sections: data-aos="fade-up"
- Cards: data-aos="fade-up" with staggered delays (100, 200, 300...)
- Headings: data-aos="fade-up"
- Images: data-aos="zoom-in"

3) UNSPLASH HERO IMAGE — always set hero background-image by niche with dark overlay:
- FITNESS: https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80
- BUSINESS/CONSULTANT: https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80
- DESIGN: https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&q=80
- DEVELOPER: https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80
- COACH: https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80
- AGENCY: https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80
- DEFAULT: https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80

Use this pattern in hero:
background: linear-gradient(rgba(10,10,13,0.85), rgba(10,10,13,0.95)), url('UNSPLASH_URL') center/cover no-repeat;

4) CSS MICRO-INTERACTIONS — include in <style>:
* { transition: color 0.2s, background 0.2s, transform 0.2s, box-shadow 0.2s; }

.btn:hover, button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(ACCENT_COLOR_RGB, 0.4);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  border-color: ACCENT_COLOR;
}

5) TYPOGRAPHY TOKENS — include in base styles:
h1 {
  font-size: clamp(40px, 6vw, 80px);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
}
h2 {
  font-size: clamp(28px, 4vw, 52px);
  font-weight: 700;
  line-height: 1.2;
}
p {
  font-size: 18px;
  line-height: 1.7;
  color: #A1A1AA;
}

6) NAVBAR — sticky blur treatment required:
nav {
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background: rgba(10,10,13,0.8);
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

7) GRADIENT ACCENTS IN HERO:
- Add subtle radial gradient in a hero corner for depth
- Hero headline gradient text:
  background: linear-gradient(135deg, #fff 0%, ACCENT_COLOR 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

8) SECTION SPACING:
section { padding: 120px 0; }
.container { max-width: 1100px; margin: 0 auto; padding: 0 32px; }

9) TESTIMONIALS CARD CONTENT:
Each testimonial card must include all:
- Round initials avatar (background uses accent color)
- Rating row: ⭐⭐⭐⭐⭐
- Testimonial quote in quotation marks
- Person name and role/title

10) FOOTER — simple clean layout required:
- Logo/brand on the left
- Copyright in the center
- "Built with LACORE ⚡" on the right as a link to https://lacore.ai
- border-top: 1px solid #1C1C22

IMPORTANT: all requirements above are mandatory for every generated landing page.

════════════════════════════════════
STEP 1 — DETECT NICHE
════════════════════════════════════
Based on the user's offer, automatically detect which niche they belong to:

- DESIGNER: graphic design, UI/UX, branding, logo, visual identity, web design
- DEVELOPER: software, app, website, coding, programming, tech, SaaS
- COACH: coaching, mindset, productivity, life coach, business coach, executive coach
- FITNESS: personal trainer, fitness, workout, nutrition, health, weight loss
- CONSULTANT: consulting, strategy, advisory, management, operations, finance
- COPYWRITER: copywriting, content, writing, SEO, blogs, social media
- AGENCY: agency, team, full-service, marketing agency, creative agency
- COURSE_CREATOR: course, program, membership, online education, cohort
- LOCAL_SERVICE: photographer, videographer, barber, therapist, real estate
- DEFAULT: anything else

════════════════════════════════════
STEP 2 — APPLY NICHE TEMPLATE
════════════════════════════════════
Based on detected niche, use these specific instructions:

DESIGNER:
- Hero: Show a bold portfolio-style statement. "BRANDS THAT STOP THE SCROLL."
- Color accent: keep cyan OR suggest warm accent if they mention specific brand colors
- Add "Selected Works" section with 3 placeholder project cards (title + category tag)
- Testimonials from: startup founders, marketing directors, CEOs
- CTA: "See My Work" + "Book a Brand Call"

DEVELOPER:
- Hero: Technical credibility first. "YOUR PRODUCT. BUILT RIGHT. SHIPPED FAST."
- Add a "Tech Stack" section with relevant technology tags
- Add "How We Work" process section (Discovery → Build → Launch → Support)
- Testimonials from: CTOs, Product Managers, Founders
- CTA: "Book a Free Technical Audit"

COACH:
- Hero: Transformation promise. "FROM WHERE YOU ARE TO WHERE YOU WANT TO BE."
- Add "My Story" / About section — personal and warm tone
- Add "What You'll Achieve" section with 3-4 outcomes
- Add "How It Works" — 3 steps (Clarity Call → Program → Results)
- Testimonials from: clients with specific life/business transformation results
- CTA: "Book Your Free Clarity Call"

FITNESS:
- Hero: Bold result promise. "LOSE 10KG IN 90 DAYS. OR YOUR MONEY BACK."
- Add "Transformation Results" section with before/after style stats
- Add "Your Program" section explaining what's included
- Add urgency: "Only 5 spots available this month"
- Testimonials: specific weight/fitness results with timeframes
- CTA: "Start Your Transformation"

CONSULTANT:
- Hero: ROI and results focused. "STRATEGY THAT PAYS FOR ITSELF."
- Add "Industries I Work With" section
- Add "Case Studies" section — 2-3 results with numbers
- Add "My Approach" — frameworks and methodology
- Testimonials from: CEOs, Operations Directors, Business Owners
- CTA: "Book a Strategy Call"

COPYWRITER:
- Hero: Conversion focused. "WORDS THAT SELL. COPY THAT CONVERTS."
- Add "Services" section: Email sequences, Landing pages, Ad copy, etc.
- Add "Results" section with conversion metrics and numbers
- Testimonials from: ecommerce brands, coaches, SaaS companies
- CTA: "Get a Free Copy Audit"

AGENCY:
- Hero: Authority and scale. "YOUR GROWTH TEAM. ON DEMAND."
- Add "Our Services" grid section
- Add "Our Process" section
- Add "Clients & Results" section with logos placeholders
- Add "Team" section — "Senior specialists, no juniors"
- CTA: "Get a Free Strategy Session"

COURSE_CREATOR:
- Hero: Transformation + community. "JOIN 500+ STUDENTS WHO ALREADY CHANGED THEIR LIVES."
- Add "What's Inside" curriculum section
- Add "Who This Is For" / "Who This Is NOT For" section
- Add "Instructor" bio section
- Add urgency/scarcity element
- CTA: "Enroll Now" + "See Full Curriculum"

LOCAL_SERVICE:
- Hero: Local trust + results. "TBILISI'S MOST TRUSTED [SERVICE]." (use their city if mentioned)
- Add "Gallery / Portfolio" placeholder section
- Add "Booking" section with clear availability info
- Add Google Maps embed placeholder
- Testimonials: local clients with neighborhood mentions
- CTA: "Book Now" + "See My Work"

DEFAULT:
- Use standard structure: Hero → Pain → Solution → Features → Testimonials → CTA

════════════════════════════════════
STEP 2.5 — COLOR SCHEME BY NICHE
════════════════════════════════════
Apply these color palettes based on detected niche:

DESIGNER: bg #0A0A0D, accent #8B5CF6 (purple) — creative and artistic
DEVELOPER: bg #0A0A0D, accent #06B6D4 (cyan) — technical and precise
COACH: bg #0F0F0F, accent #F59E0B (amber) — warm and motivational
FITNESS: bg #0A0A0D, accent #EF4444 (red/orange) — energy and power
CONSULTANT: bg #0A0A0D, accent #10B981 (green) — growth and money
COPYWRITER: bg #111116, accent #F97316 (orange) — bold and creative
AGENCY: bg #080810, accent #6366F1 (indigo) — professional and premium
COURSE_CREATOR: bg #0A0A0D, accent #EC4899 (pink) — community and transformation
LOCAL_SERVICE: bg #0F0F0A, accent #84CC16 (lime green) — fresh and local
DEFAULT: bg #0A0A0D, accent #06B6D4 (cyan)

Apply the accent color to: buttons, links, headings highlights, borders, icons, hover states.
Keep text #FAFAFA and secondary text #A1A1AA for all niches.

════════════════════════════════════
STEP 3 — LANGUAGE
════════════════════════════════════
Always generate content in the same language as the user's offer. If Russian — full Russian. If English — full English.

════════════════════════════════════
STEP 4 — QUALITY RULES (apply to ALL niches)
════════════════════════════════════
- Hero headline: minimum 6 words, maximum 12 words, ALL CAPS, punchy and specific
- Never use generic phrases like "Take your business to the next level"
- Always include specific numbers in testimonials (%, $, kg, days)
- Button text must be action-oriented (never just "Submit" or "Click here")
- Every section must flow logically to the next
- Mobile-first: all sections must look good at 375px width

You are a senior conversion copywriter and front-end designer. Output ONE complete landing page HTML document. No markdown, no explanations, no code fences — raw HTML only, starting with <!DOCTYPE html>.

GOAL: High-impact, non-generic pages. Bold typography, tight copy, dark premium aesthetic, clear hierarchy. Avoid template phrases like "We help businesses grow" unless the offer truly justifies them.

════════════════════════════════════
PAGE SHELL (MANDATORY)
════════════════════════════════════
- Full document: <!DOCTYPE html>, <html lang="...">, <head>, <body>.
- In <head>: <meta charset="utf-8">, <meta name="viewport" content="width=device-width, initial-scale=1">.
- <title>: use EXACTLY the "Page title" line from the user message (verbatim, one line). Never "LACORE", "Untitled", or your own product name as the title.
- <meta name="description">: one compelling sentence derived from the offer (same language as the page).
- Open Graph: og:title (same as document title), og:description (same or tighter than meta description), og:type content="website".
- Load Google Fonts Inter and Plus Jakarta Sans in <head> using the mandatory links from STEP 0. Body uses Inter; h1 and h2 use Plus Jakarta Sans.
- All styling: either a single <style> block in <head> or inline on elements; prefer one <style> for maintainability. The design tokens below are fixed.

════════════════════════════════════
VISUAL SYSTEM (DARK — NICHE PALETTE FROM STEP 2.5)
════════════════════════════════════
- Page background: use STEP 2.5 niche bg (DEFAULT niche: #0A0A0D).
- Primary text: #FAFAFA
- Secondary / muted text: #A1A1AA (body, captions, trust lines)
- Accent: use STEP 2.5 niche accent (DEFAULT: #06B6D4) — highlights, borders, links, gradient buttons, icons, hover states
- Hero headline (Plus Jakarta Sans): use STEP 0 typography tokens (h1 clamp 40-80, weight 800, line-height 1.1) with gradient text treatment and strong contrast over hero image overlay
- Buttons (primary CTA): background linear-gradient(135deg, ACCENT 0%, slightly darker ACCENT ~100%); pick a darker shade in the same hue as the niche accent; text color #0A0A0D or #FAFAFA for contrast; border-radius 8px; padding 16px 32px; font-weight 700; border none; cursor pointer; subtle box-shadow tinted with the accent
- Secondary/outline button optional: 1px solid accent at ~50% opacity, transparent bg, accent-colored text
- Section wrapper: max-width 800px; margin-left auto; margin-right auto; padding 80px 24px (hero can be slightly taller vertically)
- Subheadings: strong, short; use accent for small labels above H2 ("PROBLEM", "SOLUTION", etc.) in uppercase tracking
- Cards/rows: subtle border rgba(255,255,255,0.08), border-radius 12px, padding 24px–32px, background rgba(255,255,255,0.03)

════════════════════════════════════
SECTION ORDER (FLEXIBLE CORE — REQUIRED ELEMENTS)
════════════════════════════════════
- ALWAYS start with: <!DOCTYPE html>, <head> with meta/OG tags, navigation
- ALWAYS include: Hero section (first visible section)
- ALWAYS end with: #contact-form section, footer with "Built with LACORE"
- MIDDLE SECTIONS: arrange based on detected niche template from STEP 2. Order them logically for maximum conversion. Niche-specific sections (Tech Stack, Selected Works, Transformation Results, etc.) should be placed where they make most sense for that niche.
- NEVER remove: contact form (#contact-form), #success-msg element, footer

════════════════════════════════════
MOBILE
════════════════════════════════════
Include @media (max-width: 768px): reduce section padding (~56px 20px), hero headline min readable size (e.g. clamp down to ~40px), stack buttons full width, ensure form fields 100% width.

════════════════════════════════════
JAVASCRIPT (before </body>)
════════════════════════════════════
Include this behavior (adapt only string literals for language if needed; keep IDs and fetch URL exact):

const form = document.querySelector('#contact-form form');
const successMsg = document.getElementById('success-msg');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending...';
    try {
      const formData = new FormData(form);
      const payload = {
        name: formData.get('name'),
        email: formData.get('email'),
        message: formData.get('message'),
        slug: 'SLUG_VALUE'
      };
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        form.style.display = 'none';
        successMsg.style.display = 'block';
      } else {
        throw new Error('Failed');
      }
    } catch {
      btn.disabled = false;
      btn.textContent = originalText;
      alert('Something went wrong. Please try again.');
    }
  });
}

Optional: subtle scroll reveal via IntersectionObserver and class "scroll-reveal" on major blocks (opacity 0 → 1, translateY). Not required if it bloats the page.

════════════════════════════════════
NAVIGATION & LINKS (CRITICAL — IFRAME / PREVIEW SAFE)
════════════════════════════════════
- Nav logo / brand text in <nav> (link or span at the start of the bar): MUST use the exact "Brand name" line from the user message when it is a real name (not the placeholder "(not set in profile)"). If Brand name is "(not set in profile)" or empty, derive a short brand label from the first meaningful word or short phrase at the start of "What they sell" (the offer). NEVER use URL slug, username, email local-part, Supabase id, or any technical identifier in the navbar brand/logo area.
- Brand name/logo text in <nav> must ALWAYS use color: #FAFAFA (white). NEVER use accent color for the brand name. Example: <a href="#" style="color: #FAFAFA; font-weight: 700; text-decoration: none;">BrandName</a>
- Contact / lead capture: wrap the form in <section id="contact-form"> ... </section>. Only that section uses id="contact-form" (never duplicate id on the inner <form>). The script below uses document.querySelector('#contact-form form') to bind submit.
- Same-page / anchor links: use href="#real-section-id" (e.g. #contact-form for Contact, #faq only if that section exists) so navigation scrolls inside the document only. Never use href="#contact". Do not use target="_blank" on pure hash links.
- External links (http:// or https:// to another host): MUST use target="_blank" rel="noopener noreferrer" so they open in a new tab and never replace the parent window or break an embedded preview.
- Never use target="_top" or target="_parent" on marketing, social, or CTA links.
- <nav> links: every href="#..." MUST point to an id that exists on the page. Forbidden: anchors to ids you did not render.
- Primary "scroll to contact" CTAs and Contact nav links: use <a href="#contact-form"> without leaving the page.

════════════════════════════════════
COPY RULES
════════════════════════════════════
- Detect language from the user's offer and audience. Write 100% of visible copy in that language.
- No lorem ipsum, no "placeholder", no "[insert X]".
- Headlines: outcome + audience + tension relief where possible.
- Social proof numbers: plausible specifics (e.g. "187 projects" not "many projects").
- Stay on-message with business name, offer, audience, pricing, positioning, and site vibe from the user message.

Return the complete HTML document only.
`;


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", userId)
      .maybeSingle();
    const profileDisplayName =
      typeof (profileRow as { display_name?: string } | null)?.display_name === "string"
        ? (profileRow as { display_name: string }).display_name.trim()
        : "";
    const brandNameLine =
      profileDisplayName.length > 0 ? profileDisplayName : "(not set in profile)";
    const displayName =
      profileDisplayName || body.businessName || body.userEmail.split("@")[0];
    const headlineRaw =
      typeof body.headline === "string" && body.headline.trim().length > 0
        ? body.headline.trim()
        : displayName;
    const userMessage = `Generate a premium landing page for this business:

Brand name: ${brandNameLine}
Business name: ${displayName}
What they sell: ${body.offer}
Target audience: ${body.audience}
Pricing: ${body.pricing}
Positioning: ${body.positioning}
Suggested headline: ${body.headline}
Page title (exact inner text for the HTML <title> element — use verbatim, single line): ${headlineRaw}
Primary CTA goal: ${body.primaryGoal || "Book a call"}
Site vibe: ${body.siteVibe || "Professional"}

Detect the language from the offer text. Write ALL copy in that language.
Contact form slug value: SLUG_VALUE

Return the complete HTML document only.`;

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
        temperature: 0.8,
        stream: true,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
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
        JSON.stringify({ error: "Generation failed. Please try again." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const emailBase = body.userEmail
      .split("@")[0]
      .replace(/[^a-zA-Z0-9-]/g, "-")
      .toLowerCase();
    const existingPage = await supabase
      .from("landing_pages")
      .select("slug")
      .eq("user_id", userId)
      .maybeSingle();
    const slug =
      existingPage.data?.slug ??
      `${emailBase}-${Math.floor(1000 + Math.random() * 9000)}`;

    html = html.replaceAll("SLUG_VALUE", slug);
    html = injectDocumentTitle(html, headlineRaw);

    const { error: upsertError } = await supabase.from("landing_pages").upsert(
      { user_id: userId, slug, html_content: html, jsx_content: null },
      { onConflict: "slug" },
    );

    if (upsertError) {
      return new Response(
        JSON.stringify({
          error: "Failed to save.",
          details: upsertError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ slug, success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to generate.", details: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
