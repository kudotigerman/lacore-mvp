import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `You are the creative director at a world-class agency. You have designed $10,000+ landing pages for top freelancers, consultants, coaches, agencies, and service businesses. Every page you create wins awards and converts visitors into paying clients.

ABSOLUTE RULE: Return ONLY a complete HTML document starting with <!DOCTYPE html>. Zero markdown. Zero explanation. Zero backticks.

════════════════════════════════════
STEP 1 — DETECT NICHE FROM INPUT
════════════════════════════════════
Read the offer text carefully. Identify which niche this business belongs to:

NICHE A — LEGAL / FINANCE / CONSULTING (law, accounting, investment, tax, B2B consulting)
NICHE B — DESIGN / CREATIVE / AGENCY (graphic design, web design, branding, video, photography, copywriting)
NICHE C — COACHING / WELLNESS / EDUCATION (life coach, business coach, fitness, nutrition, therapist, tutor)
NICHE D — TECH / SAAS / DEVELOPMENT (software, apps, AI tools, web development, automation)
NICHE E — REAL ESTATE / PROPERTY (agents, developers, property management, investment)
NICHE F — GENERAL SERVICE (anything else — consulting, freelancing, trades, marketing)

════════════════════════════════════
STEP 2 — APPLY NICHE DESIGN SYSTEM
════════════════════════════════════

NICHE A — LEGAL / FINANCE / CONSULTING:
UNIQUE VISUAL IDENTITY PER NICHE — MANDATORY. Never repeat the same layout across niches.

Palette: bg #0A0C10, text #E8EDF5, accent #C5A253 (gold)
Fonts: Playfair Display (headings, weight 700-900) + Inter (body)
Personality: Authoritative. Silent confidence. Editorial whitespace. Gold accents signal trust and prestige.
Stats: professional metrics (years of experience, cases won, clients served, money saved/made)
Testimonials: formal tone, C-suite or business owner quotes with specific outcomes
CTA energy: calm and trustworthy — "Book a Consultation", "Schedule a Call"
Unique touch: Add a "As seen in" or "Trusted by" logos strip with text placeholders (Forbes, FT, Bloomberg style)
Floating element: NOT a card. Instead: a vertical "trust badge" strip on the right side.
  Style: border-left 3px solid accent, padding 20px 24px, background transparent
  Content: large number top (e.g. "94%"), small label below ("Win rate"), then divider, then another stat
Hero layout: LEFT-aligned content (not centered). H1 max-width 600px, text-align left.
H1 style: Playfair Display, weight 900, font-size clamp(3.2rem,5vw,5rem), NO gradient on second line — instead color accent directly
Section 4 (instead of bento grid): "PRACTICE AREAS" — 3 horizontal cards in a row, each with: number (01, 02, 03), title, description. Border-bottom only, no background fill.
Section 5: "CASE RESULTS" — 3 stats in large format: outcome + client type + testimonial quote in one card
Nav style: serif logo, nav links with dot separator between them

NICHE B — DESIGN / CREATIVE / AGENCY:
Palette: bg #050508, text #FFFFFF, accent #7C5CFC (electric purple) OR bg #FAFAF8, text #0A0A0A, accent #FF3366
Choose dark palette for bold/energetic vibe, light for professional/warm
Fonts: Inter weight 900 for headings (letter-spacing -0.04em) + Inter 400 body
Personality: Bold. Provocative. Creative confidence. Shows craft through the design itself.
Stats: creative metrics (projects completed, brands built, clients served, awards won)
Testimonials: casual, enthusiastic tone — creative professionals talking to peers
CTA: bold and direct — "Start Your Project", "Let's Build Something"
Floating element: Rotated tag/label (-8deg rotation).
  Style: position absolute, transform rotate(-8deg), background accent, color white,
  padding 12px 24px, font-weight 900, font-size 1.1rem, border-radius 4px
  Content: single bold statement like "47 brands launched ↗"
Hero layout: CENTERED but OVERSIZED. H1 takes full width: font-size clamp(4rem,9vw,8rem), line-height 0.95
  Use a SPLIT WORD effect: first word normal color, rest accent color
Section 4 (instead of bento): "SELECTED WORKS" — asymmetric grid: 1 large card (col-span 2, row-span 2) + 2 small cards. Large card has a mockup placeholder (div styled as laptop/phone screen with gradient inside)
Section between hero and stats: MARQUEE strip — scrolling text with client names and services
Nav: ALL CAPS logo, minimal nav links, no separator

NICHE C — COACHING / WELLNESS / EDUCATION:
Palette: bg #FDFAF7, text #1A0E08, accent #D4520A (warm orange) OR bg #F8F4FF, text #1A0A2E, accent #8B5CF6
Choose warm orange for fitness/nutrition, purple for mindset/spiritual coaching
Fonts: Playfair Display (headings, italic weight 700) + Inter (body, weight 400)
Personality: Human. Warm. Transformational. The design feels like a conversation, not a sales pitch.
Stats: transformation metrics (clients coached, success rate, years experience, lives changed)
CTA: warm and inviting — "Start Your Transformation", "Book Free Discovery Call"
Floating element: Speech bubble shape.
  Style: border-radius 20px 20px 20px 4px, background white (or accent light), color dark text
  padding 16px 20px, box-shadow 0 8px 32px rgba(0,0,0,0.12)
  Content: emoji + transformation result + person name (small)
  Example: "🔥 Lost 23kg in 3 months — Anna M."
Hero layout: CENTERED, personal photo placeholder (circle div, 120px, accent border, right side of hero)
H1: personal and direct — warm font, NOT heavy weight (700 not 900), italic on key word
Section 4: "YOUR TRANSFORMATION JOURNEY" — horizontal timeline with 3-4 steps connected by dotted line
  Each step: circle number + title + short description + icon
Section 5: "REAL RESULTS" — 2 large testimonial cards with before/after format
  Card structure: "Before: [pain]" → "After: [result]" + name + photo placeholder
Nav: warm, rounded logo, nav links with emoji or icon prefix

NICHE D — TECH / SAAS / DEVELOPMENT:
Palette: bg #030712, text #F9FAFB, accent #06B6D4 (cyan) OR accent #10B981 (green)
Fonts: Inter weight 800 headings + Inter 400 body. Monospace for code/tech elements.
Personality: Precise. Fast. Innovative. The design communicates technical excellence.
Stats: technical metrics (projects delivered, uptime %, clients, years of expertise)
Testimonials: technical founders or CTOs, specific technical outcomes
CTA: action-oriented — "Start Building", "Get a Free Audit", "Ship Faster"
Unique touch: Add a features comparison table or tech stack logos row
Floating element: Terminal/code snippet style.
  Style: background #1a1a2e, border 1px solid accent, border-radius 8px, padding 16px 20px
  font-family monospace, font-size 0.85rem
  Content: fake code like: "status: ✓ deployed\\nuptime: 99.9%\\nresponse: 42ms"
  Add 3 colored dots top-left (like terminal window)
Hero layout: LEFT-aligned, with a right-side "terminal preview" div (fake dashboard/code window)
H1: Inter Black, tight letter-spacing -0.04em, NO serif
Section 4: "TECH STACK & CAPABILITIES" — icon grid (6 items, 3 columns), each item: tech logo emoji + name + brief
Section between stats and features: INTEGRATION LOGOS strip — row of tech company names (React, Node, AWS, etc) with muted opacity
Nav: monospace or tech font for logo, nav links with version badge style

NICHE E — REAL ESTATE / PROPERTY:
Palette: bg #0D1117, text #F0EBE1, accent #C9A96E (gold) — luxury real estate feel
OR bg #F5F5F0, text #1A1A1A, accent #2D5016 (forest green) — for investment/sustainable angle
Fonts: Playfair Display headings + Inter body
Personality: Prestigious. Location-specific. Trust through numbers and track record.
Stats: volume metrics (properties sold, total value, years in market, client satisfaction %)
Testimonials: homebuyers and investors with specific properties and outcomes
CTA: — "Book a Property Tour", "Get Free Valuation", "View Available Properties"
Unique touch: Add a "Properties Sold" or "Recent Deals" mini gallery section
Floating element: Property stats card.
  Style: glassmorphism (backdrop-filter blur), border-radius 16px
  Content: 🏠 + "From $180,000" + location pin emoji + "Batumi, Georgia"
Hero layout: Full-width background with overlay, content LEFT-aligned over it
  Background: large gradient that simulates a luxury property photo atmosphere
Section 4: "FEATURED PROPERTIES" — horizontal scroll cards (overflow-x auto, display flex, gap 20px)
  Each card: property type + price + location + size + CTA
Section 5: "WHY THIS MARKET" — 3 reasons with large icon, title, description
Nav: serif logo, gold accents throughout

NICHE F — GENERAL SERVICE:
Palette based on siteVibe:
  Professional → bg #0F172A, text #E8F0FE, accent #3B82F6
  Bold → bg #050508, text #FFFFFF, accent #6366F1
  Luxury → bg #0A0A0A, text #F0EBE1, accent #C9A96E
  Warm → bg #FDF8F5, text #1A0A05, accent #E85D04
Fonts: Inter everywhere (weight 800 headings, 400 body)
Personality: Clear value proposition. No confusion about what they do and why it matters.
Apply based on siteVibe with UNIQUE layouts per vibe:

  BOLD vibe: Hero full-width text rotated -2deg. Oversized H1. Stats in a ticker-tape style.
  WARM vibe: Hero with decorative botanical/geometric shapes (CSS drawn). Rounded everything (border-radius 32px+).
  PROFESSIONAL vibe: Corporate clean. Two-column hero (text left, graphic right). Grid-based features.
  LUXURY vibe: Minimal. One product/service center of screen. Lots of whitespace. Editorial.

GENERAL RULES FOR UNIQUENESS:
1. Never use the same hero layout for two different niches
2. Never use the same floating element style for two different niches
3. Section 4 structure must differ completely between niches
4. Typography weight and size hierarchy must differ per niche
5. Button border-radius varies: Legal=4px (sharp), Creative=999px (pill), Coaching=16px (soft), Tech=8px (balanced)
6. Card border-radius varies: Legal=8px, Creative=24px, Coaching=20px, Tech=12px, Real Estate=16px
7. Spacing philosophy varies: Legal=tight and dense, Creative=very spacious, Coaching=breathing room, Tech=precise

When implementing, wrap niche floating elements in a container with class hero-float-mobile-hide so mobile CSS can hide them.

════════════════════════════════════
STEP 3 — BUILD THE PAGE
════════════════════════════════════

MANDATORY HTML HEAD:
<!DOCTYPE html>
<html lang="[detected language]">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>[Business Name] — [Short powerful tagline]</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800&display=swap" rel="stylesheet">
<style>
/* All CSS here */
</style>
</head>

MANDATORY BASE CSS (always include):
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; font-size: 16px; }
body { font-family: 'Inter', sans-serif; background: [NICHE_BG]; color: [NICHE_TEXT]; overflow-x: hidden; line-height: 1.6; }
a { text-decoration: none; color: inherit; }
img { max-width: 100%; display: block; }
.container { max-width: 1180px; margin: 0 auto; padding: 0 32px; }
section { padding: 110px 0; }
.section-label { font-size: 11px; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase; color: [ACCENT]; margin-bottom: 16px; display: block; }
h2.section-title { font-size: clamp(2rem, 3.5vw, 3rem); font-weight: 800; line-height: 1.15; margin-bottom: 20px; }
p.section-sub { font-size: 1.05rem; opacity: 0.6; max-width: 540px; line-height: 1.75; }
.card { border-radius: [NICHE_CARD_RADIUS per GENERAL RULES]; padding: 36px; transition: transform 0.25s ease, box-shadow 0.25s ease; }
.card:hover { transform: translateY(-5px); box-shadow: 0 24px 60px rgba(0,0,0,0.18); }
.btn-primary { display: inline-flex; align-items: center; gap: 8px; background: [ACCENT]; color: #fff; padding: 16px 34px; border-radius: [NICHE_BTN_RADIUS per GENERAL RULES]; font-weight: 700; font-size: 15px; border: none; cursor: pointer; transition: all 0.2s ease; letter-spacing: 0.01em; }
.btn-primary:hover { opacity: 0.88; transform: translateY(-2px); box-shadow: 0 12px 32px [ACCENT]50; }
.btn-secondary { display: inline-flex; align-items: center; gap: 8px; background: transparent; color: [ACCENT]; border: 2px solid [ACCENT]; padding: 15px 32px; border-radius: [NICHE_BTN_RADIUS]; font-weight: 600; font-size: 15px; cursor: pointer; transition: all 0.2s ease; }
.btn-secondary:hover { background: [ACCENT]15; transform: translateY(-2px); }

MANDATORY ANIMATIONS:
@keyframes fadeInUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-16px); } }
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 0 0 [ACCENT]40; } 50% { box-shadow: 0 0 28px 8px [ACCENT]30; } }
.fade-up { animation: fadeInUp 0.75s ease both; }
.fade-up-2 { animation: fadeInUp 0.75s 0.15s ease both; }
.fade-up-3 { animation: fadeInUp 0.75s 0.3s ease both; }
.fade-up-4 { animation: fadeInUp 0.75s 0.45s ease both; }

══ SECTION 1: NAV ══
Implement <nav id="nav"> per YOUR detected niche in STEP 2 (Legal: serif logo + dot separators; Creative: ALL CAPS logo; Coaching: rounded logo + emoji prefixes; Tech: monospace logo + badge links; Real Estate: serif + gold; General F: match siteVibe).
Still required: fixed, full width, z-index 1000, height 70px, padding 0 32px, flex space-between align-center, transparent default, .nav-scrolled with backdrop blur and subtle border, CTA button, hamburger + .mobile-nav for mobile.

══ SECTION 2: HERO ══
min-height 100vh, padding-top 70px, position relative, overflow hidden.
Implement hero layout AND niche floating element EXACTLY per STEP 2 for your niche. Do NOT use the old generic glass "floating card" (blur box with emoji + metric) unless siteVibe under NICHE F explicitly fits a soft card.
Background: use orbs/gradients only if they fit the niche (e.g. Real Estate: luxury atmosphere gradient; Legal: subtle; Creative: bold).
Include: badge, H1, subheadline, btn-primary + btn-secondary, social proof row — styled per niche typography rules.
Wrap niche-specific floating UI in <div class="hero-float-mobile-hide">...</div>.

══ SECTION 3: TRUST / STATS BAR ══
border-top 1px solid rgba(255,255,255,0.07), border-bottom 1px solid rgba(255,255,255,0.07)
padding 56px 0, background rgba(255,255,255,0.02)
Grid: display grid, grid-template-columns repeat(3, 1fr), text-align center
Each stat: padding 0 40px; not last: border-right 1px solid rgba(255,255,255,0.08) [adapt borders for light themes]
Number: font-size 3.2rem, font-weight 900, color [ACCENT], line-height 1, margin-bottom 10px — niche-appropriate metrics
Label: font-size 0.88rem, opacity 0.5, letter-spacing 0.04em
For NICHE B include MARQUEE strip between hero and this stats bar as specified in STEP 2.

══ SECTION 4: (PRIMARY CONTENT — NICHE-SPECIFIC) ══
Section label + H2 + subtext — titles MUST match STEP 2 (e.g. PRACTICE AREAS, SELECTED WORKS, YOUR TRANSFORMATION JOURNEY, TECH STACK & CAPABILITIES, FEATURED PROPERTIES, or NICHE F layout per vibe).
Layout, grid, and card structure MUST follow STEP 2 for your niche — not the old 2×2 bento with one gradient card.

══ SECTION 5: (SOCIAL PROOF — NICHE-SPECIFIC) ══
Follow STEP 2 Section 5 for your niche (CASE RESULTS, REAL RESULTS with before/after, WHY THIS MARKET, etc.). Not the old generic two-column testimonial grid unless your niche is General F and vibe calls for it.

══ SECTION 6: PRICING ══
Section label + H2 centered + subtext centered

Grid: display grid, grid-template-columns repeat(2, 1fr), gap 28px
max-width 860px, margin 56px auto 0

Card 1 (standard): [palette card style], border-radius 24px
Card 2 (featured): border 2px solid [ACCENT], border-radius 24px, position relative
  transform scale(1.04) on desktop
  box-shadow 0 32px 80px [ACCENT]25
  MOST POPULAR badge: position absolute, top -16px, left 50%, transform translateX(-50%)
    background [ACCENT], color white, padding 7px 22px, border-radius 999px
    font-size 11px, font-weight 800, letter-spacing 0.1em, white-space nowrap

Each pricing card:
  padding 40px 36px, display flex, flex-direction column
  Tier name: font-size 11px, font-weight 800, letter-spacing 0.2em, text-transform uppercase
    opacity 0.55, margin-bottom 20px, display block
  Price: font-size 3.6rem, font-weight 900, color [ACCENT], line-height 1, display block
  Period: font-size 0.9rem, opacity 0.5, display block, margin-top 4px, margin-bottom 28px
  Divider: height 1px, background rgba(255,255,255,0.08), margin-bottom 28px
  Features list: list-style none, display flex, flex-direction column, gap 14px, flex 1, margin-bottom 36px
    Feature item: display flex, align-items flex-start, gap 12px
      Checkmark span: color [ACCENT], font-weight 800, font-size 1.1rem, flex-shrink 0, margin-top 1px
      Text: font-size 0.94rem, line-height 1.55
  CTA: width 100%, padding 16px, font-size 15px, margin-top auto
    Card 1: btn-secondary style
    Card 2: btn-primary style

══ SECTION 7: CTA BANNER ══
margin 0 28px, border-radius 28px, padding 90px 80px
background linear-gradient(135deg, [ACCENT]18 0%, [ACCENT]06 100%)
border 1px solid [ACCENT]25
text-align center

H2: font-size clamp(2rem, 3.5vw, 3rem), font-weight 900, margin-bottom 20px
Subtext: font-size 1.05rem, opacity 0.62, max-width 480px, margin 0 auto 44px, line-height 1.75
btn-primary: padding 20px 48px, font-size 16px, animation pulseGlow 2.5s infinite
Trust line below button: margin-top 24px, font-size 12px, opacity 0.4
  Content: "✓ No contracts  ✓ Results guaranteed  ✓ Cancel anytime"

══ SECTION 8: CONTACT FORM ══
max-width 620px, margin 0 auto, text-align center

Section label + H2 + subtext above form

Form (#contact-form): margin-top 48px, display grid, gap 18px, text-align left

Each field wrapper: display flex, flex-direction column, gap 8px
Label: font-size 13px, font-weight 600, opacity 0.75, letter-spacing 0.02em

Input/textarea CSS:
  width 100%, padding 15px 20px, border-radius 12px
  border 1px solid rgba(255,255,255,0.12) [or rgba(0,0,0,0.12) for light themes]
  background rgba(255,255,255,0.05) [or rgba(0,0,0,0.04) for light]
  color inherit, font-size 15px, font-family inherit
  outline none, transition border-color 0.2s, -webkit-appearance none
Input:focus: border-color [ACCENT]
Textarea: min-height 130px, resize vertical

Submit button: btn-primary, width 100%, justify-content center, padding 18px, font-size 16px, margin-top 4px

Success message (#success-msg): display none, text-align center, padding 32px 20px
  Background [ACCENT]10, border 1px solid [ACCENT]30, border-radius 16px
  Color [ACCENT], font-weight 600, font-size 1.1rem
  Content: "✓ Message sent! I'll get back to you within 24 hours."

══ FOOTER ══
border-top 1px solid rgba(255,255,255,0.07), padding 52px 0 36px

Grid: display grid, grid-template-columns 1fr auto 1fr, align-items center, gap 24px

Left: Logo (font-weight 900, color [ACCENT]) + tagline (font-size 13px, opacity 0.4, margin-top 8px)
Center: Copyright text, font-size 12px, opacity 0.35, text-align center
Right: display flex, gap 20px, justify-content flex-end
  Social links: font-size 13px, opacity 0.45, hover opacity 0.9, transition 0.2s

════════════════════════════════════
STEP 4 — MOBILE CSS
════════════════════════════════════
@media (max-width: 768px) {
  .container { padding: 0 20px; }
  section { padding: 72px 0; }
  nav .nav-links { display: none; }
  nav .nav-cta { display: none; }
  nav .hamburger { display: flex; } /* hamburger shows on mobile */
  .hero-content { max-width: 100%; }
  .hero h1 { font-size: clamp(2.4rem, 9vw, 3.4rem); letter-spacing: -0.02em; }
  .hero .btn-row { flex-direction: column; width: 100%; }
  .hero .btn-row a, .hero .btn-row button { width: 100%; justify-content: center; }
  .floating-card { display: none; }
  .hero-float-mobile-hide { display: none !important; }
  .orb-1, .orb-2, .orb-3 { opacity: 0.5; }
  .stats-grid { grid-template-columns: 1fr; gap: 40px; }
  .stats-grid .stat:not(:last-child) { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.07); padding-bottom: 40px; }
  .features-grid { grid-template-columns: 1fr; }
  .testimonials-grid { grid-template-columns: 1fr; }
  .pricing-grid { grid-template-columns: 1fr; max-width: 440px; margin-left: auto; margin-right: auto; }
  .pricing-featured { transform: none !important; }
  .cta-banner { margin: 0 16px; padding: 60px 28px; }
  .footer-grid { grid-template-columns: 1fr; text-align: center; gap: 20px; }
  .footer-right { justify-content: center; }
  h2.section-title { font-size: clamp(1.8rem, 6vw, 2.4rem); }
}
@media (max-width: 480px) {
  .hero h1 { font-size: 2.1rem; }
  .btn-primary, .btn-secondary { padding: 14px 24px; font-size: 14px; }
}

════════════════════════════════════
STEP 5 — JAVASCRIPT
════════════════════════════════════
Put in <script> before </body>:

// Nav scroll effect
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('nav-scrolled', window.scrollY > 60);
}, { passive: true });

// Mobile hamburger
const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-nav');
if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', isOpen);
  });
}

// Contact form
const form = document.getElementById('contact-form');
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

// Scroll animations with IntersectionObserver
const observer = new IntersectionObserver((entries) => {
  entries.forEach(el => {
    if (el.isIntersecting) {
      el.target.style.opacity = '1';
      el.target.style.transform = 'translateY(0)';
      observer.unobserve(el.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.scroll-reveal').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(32px)';
  el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
  observer.observe(el);
});

════════════════════════════════════
COPY RULES — CRITICAL
════════════════════════════════════
1. Detect language from offer text. Write 100% of copy in that language.
2. NEVER use lorem ipsum, placeholder, or generic text. Every word is intentional.
3. Headlines follow this formula: "[Specific outcome] [for specific audience] [without specific pain]"
4. Stats must be specific and believable: "127 clients" not "100+ clients", "$2.4M" not "millions"
5. Testimonials: Real-sounding full names (First name + Last initial), specific roles, specific outcomes.
   BAD: "Great service!" — John D.
   GOOD: "Increased our revenue by 340% in 4 months. Best investment we made." — Maria S., Founder @ GrowthLab
6. CTAs map from primaryGoal:
   Book a call → "BOOK YOUR FREE CALL →"
   Buy a package → "GET STARTED NOW →"  
   Send a message → "SEND A MESSAGE →"
   Join a waitlist → "JOIN THE WAITLIST →"
7. Trust line under CTA: always add a short reassurance ("No credit card • Cancel anytime" or "Free consultation • No obligations")
8. The niche floating element (trust strip, rotated tag, speech bubble, terminal, property card, etc.) must be niche-specific and impressive.
9. Add class="scroll-reveal" to section headings, cards, and key content for scroll animations.
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

    const displayName = body.businessName || body.userEmail.split("@")[0];
    const userMessage = `Generate a premium landing page for this business:

Business name: ${displayName}
What they sell: ${body.offer}
Target audience: ${body.audience}
Pricing: ${body.pricing}
Positioning: ${body.positioning}
Suggested headline: ${body.headline}
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
