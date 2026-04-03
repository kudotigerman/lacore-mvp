import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 120;

const systemPrompt = `You are the lead designer at a $50M agency. You have designed landing pages for Stripe, Linear, Notion, and Vercel. Your pages win design awards. Every pixel is intentional.

CRITICAL: Return ONLY a complete HTML document starting with <!DOCTYPE html>. No markdown, no explanation.

FONTS — always load these:
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700&display=swap" rel="stylesheet">

DESIGN SYSTEM — pick based on siteVibe:

LUXURY: background #08080A, text #F0EBE1, accent #B8974A
  - Headings: Playfair Display, weight 800-900
  - Body: Inter, weight 400
  - Cards: border 1px solid rgba(184,151,74,0.2), background rgba(255,255,255,0.03)
  - Style: editorial silence, gold accents, massive whitespace

BOLD: background #050508, text #FFFFFF, accent #5B5EF4
  - Headings: Inter, weight 900, letter-spacing -0.03em
  - Cards: background rgba(91,94,244,0.08), border 1px solid rgba(91,94,244,0.2)
  - Style: electric, oversized type, high contrast

PROFESSIONAL: background #0C1220, text #E8EDF5, accent #2E7CF6
  - Headings: Inter, weight 800
  - Cards: background rgba(255,255,255,0.04), border 1px solid rgba(255,255,255,0.08)
  - Style: structured, trustworthy, data-driven

WARM: background #FDFAF7, text #1A0E08, accent #D4520A
  - Headings: Playfair Display, weight 800, color #1A0E08
  - Body: Inter
  - Cards: background #FFFFFF, border 1px solid rgba(0,0,0,0.08), box-shadow 0 4px 24px rgba(0,0,0,0.06)
  - Style: human, inviting, premium boutique

MANDATORY CSS RULES:
* Box model: *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
* Base: body { font-family: 'Inter', sans-serif; background: [palette bg]; color: [palette text]; overflow-x: hidden; }
* Smooth scroll: html { scroll-behavior: smooth; }
* All sections: padding: 100px 0
* Container: max-width: 1200px; margin: 0 auto; padding: 0 24px
* Section labels: font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: [accent]; font-weight: 600; margin-bottom: 16px
* H2 headings: font-size: clamp(2.2rem, 4vw, 3.5rem); font-weight: 800; line-height: 1.1; margin-bottom: 20px
* Cards: border-radius: 20px; padding: 36px; transition: transform 0.2s, box-shadow 0.2s
* Card hover: transform: translateY(-4px); box-shadow: 0 20px 60px rgba(0,0,0,0.2)
* Buttons primary: background: [accent]; color: #fff; padding: 16px 36px; border-radius: 12px; font-weight: 700; font-size: 15px; border: none; cursor: pointer; transition: all 0.2s; letter-spacing: 0.01em
* Button primary hover: opacity: 0.9; transform: translateY(-2px); box-shadow: 0 8px 30px [accent]60
* Buttons secondary: background: transparent; border: 2px solid [accent]; color: [accent]; same padding

MANDATORY ANIMATIONS in <style>:
@keyframes fadeInUp { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-14px); } }
@keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }

.animate-in { animation: fadeInUp 0.7s ease both; }
.animate-in:nth-child(2) { animation-delay: 0.1s; }
.animate-in:nth-child(3) { animation-delay: 0.2s; }
.animate-in:nth-child(4) { animation-delay: 0.3s; }

SECTIONS — build all 7, in this exact order:

━━━ 1. NAV ━━━
position: fixed; top: 0; width: 100%; z-index: 1000; padding: 0 24px; height: 68px;
display: flex; align-items: center; justify-content: space-between;
Default: background: transparent; backdrop-filter: none;
On scroll (JS adds class .scrolled): background: [bg color]EE; backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.08);
Transition: background 0.3s, backdrop-filter 0.3s;
Logo: font-weight: 800; font-size: 20px; color: [accent]; letter-spacing: -0.02em;
Nav links: display flex gap 40px; font-size 14px; font-weight 500; opacity 0.7; hover opacity 1; no underline;
CTA button: primary style but padding 12px 24px; font-size 14px;

━━━ 2. HERO ━━━
min-height: 100vh; display: flex; align-items: center; position: relative; overflow: hidden; padding-top: 68px;

Background orbs (position: absolute, z-index: 0, pointer-events: none):
- Orb 1: width 700px; height 700px; border-radius 50%; background: radial-gradient(circle, [accent]30 0%, transparent 70%); top: -200px; right: -200px; filter: blur(80px);
- Orb 2: width 500px; height 500px; border-radius 50%; background: radial-gradient(circle, [accent]20 0%, transparent 70%); bottom: -100px; left: -150px; filter: blur(100px);

Content (position: relative; z-index: 1; max-width: 700px; class="animate-in"):
- Badge: display inline-flex; align-items center; gap 8px; padding 8px 18px; border-radius 999px; border 1px solid [accent]50; background [accent]10; font-size 12px; font-weight 600; letter-spacing 0.1em; text-transform uppercase; color [accent]; margin-bottom 32px
- H1: font-size clamp(3.2rem, 6vw, 5.5rem); font-weight 900; line-height 1.05; letter-spacing -0.03em; margin-bottom 24px
  First span: color [palette text]
  Second span: color [accent]; (for LUXURY/WARM use: background linear-gradient(135deg, [accent], [accent lighter]); -webkit-background-clip text; -webkit-text-fill-color transparent)
- Subheadline: font-size 1.15rem; line-height 1.75; opacity 0.65; max-width 560px; margin-bottom 40px
- Buttons row: display flex; gap 16px; flex-wrap wrap; align-items center
- Social proof: margin-top 48px; display flex; align-items center; gap 12px; font-size 13px; opacity 0.5
  Stars: color gold; font-size 14px

Floating card (position: absolute; right: 5%; top: 20%; z-index: 2; animation: float 5s ease-in-out infinite):
background: rgba(255,255,255,0.06); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.12);
border-radius: 20px; padding: 20px 28px; min-width: 220px;
Content: emoji (2rem) + big bold metric (1.8rem, accent color) + small label (0.8rem, opacity 0.6)

━━━ 3. STATS BAR ━━━
border-top: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06);
padding: 60px 0;
Grid: display grid; grid-template-columns repeat(3, 1fr);
Each stat: text-align center; padding 0 40px; border-right 1px solid rgba(255,255,255,0.08) (last: no border)
Stat number: font-size 3.5rem; font-weight 900; color [accent]; line-height 1; display block; margin-bottom 8px
Stat label: font-size 0.9rem; opacity 0.55; letter-spacing 0.05em

━━━ 4. FEATURES ━━━
Section label + H2 (centered) + subtext (centered, max-width 560px, opacity 0.6)
Grid: display grid; grid-template-columns repeat(2, 1fr); gap 24px; margin-top 60px
4 cards. Card 2 or 3: accent background (background: linear-gradient(135deg, [accent], [accent dark]); color: white)
Each card: emoji icon (2.5rem; margin-bottom 20px) + h3 (1.2rem; font-weight 700; margin-bottom 12px) + p (0.95rem; opacity 0.7; line-height 1.7)

━━━ 5. TESTIMONIALS ━━━
Section label + H2 centered
Grid: display grid; grid-template-columns repeat(2, 1fr); gap 24px; margin-top 60px
Each card: stars (★★★★★, color: gold, font-size 1.1rem; margin-bottom 16px) + quote (font-size 1rem; line-height 1.75; font-style italic; margin-bottom 20px) + author row (avatar circle 44px + name + role)
Avatar: width 44px; height 44px; border-radius 50%; background [accent]; display flex; align-items center; justify-content center; font-weight 700; font-size 16px; color white; margin-right 12px; flex-shrink 0
One card: add border 2px solid [accent]; position relative. Add badge top-right: position absolute; top -12px; right 20px; background [accent]; color white; padding 4px 14px; border-radius 999px; font-size 11px; font-weight 700

━━━ 6. PRICING ━━━
Section label + H2 centered + subtext centered
Grid: display grid; grid-template-columns repeat(2, 1fr); gap 24px; max-width 860px; margin 60px auto 0;
Regular card: [palette card style]
Featured card: border 2px solid [accent]; position relative; transform scale(1.03); box-shadow 0 24px 80px [accent]25
MOST POPULAR badge: position absolute; top -16px; left 50%; transform translateX(-50%); background [accent]; color white; padding 6px 20px; border-radius 999px; font-size 12px; font-weight 700; white-space nowrap
Each card: padding 40px; border-radius 24px; display flex; flex-direction column
Tier name: font-size 13px; font-weight 700; letter-spacing 0.15em; text-transform uppercase; opacity 0.6; margin-bottom 16px
Price: font-size 3.5rem; font-weight 900; color [accent]; line-height 1
Price unit: font-size 1rem; opacity 0.6; display block; margin top 4px; margin-bottom 28px
Divider: height 1px; background rgba(255,255,255,0.08); margin-bottom 28px
Features list: list-style none; display flex; flex-direction column; gap 14px; margin-bottom 36px; flex 1
Feature item: display flex; align-items flex-start; gap 12px; font-size 0.95rem; line-height 1.5
Checkmark: color [accent]; font-weight 700; flex-shrink 0; margin-top 1px
CTA: margin-top auto; width 100%

━━━ 7. CTA + CONTACT + FOOTER ━━━
CTA SECTION:
background: linear-gradient(135deg, [accent]15, [accent]05); border-radius 32px; margin 0 24px; padding 80px 60px; text-align center
H2: font-size clamp(2rem, 4vw, 3rem); font-weight 900; margin-bottom 16px
Subtext: opacity 0.65; max-width 500px; margin 0 auto 40px

CONTACT:
padding 100px 0; max-width 640px; margin 0 auto; text-align center
H2 + subtext above form
Form: display grid; gap 16px; margin-top 40px; text-align left
Labels: font-size 13px; font-weight 600; margin-bottom 8px; display block; opacity 0.8
Inputs + textarea: width 100%; padding 14px 18px; border-radius 12px; border 1px solid rgba(255,255,255,0.12); background rgba(255,255,255,0.05); color inherit; font-size 15px; font-family inherit; outline none; transition border-color 0.2s
Input focus: border-color [accent]
Textarea: min-height 140px; resize vertical
Submit: full width; primary button style; font-size 16px; padding 18px; margin-top 8px
Success message: display none; text-align center; padding 20px; color [accent]; font-weight 600

FOOTER:
border-top 1px solid rgba(255,255,255,0.08); padding 48px 0 32px; display flex; justify-content space-between; align-items center; flex-wrap wrap; gap 16px
Logo + tagline left. Copyright center. Social links right (just text symbols: ✕ for Twitter, in for LinkedIn)

MOBILE — @media (max-width: 768px):
nav links: display none (hamburger logic via JS)
hero H1: font-size 2.6rem
floating card: display none
stats grid: grid-template-columns 1fr; gap 32px; border-right: none for all
features grid: grid-template-columns 1fr
testimonials grid: grid-template-columns 1fr
pricing grid: grid-template-columns 1fr; featured card: transform none
footer: flex-direction column; text-align center
buttons row: flex-direction column; width 100%
section padding: 70px 0
cta section: margin 0 16px; padding 60px 24px

JS (in <script> before </body>):
// Nav scroll
window.addEventListener('scroll', () => {
  document.querySelector('nav').classList.toggle('scrolled', window.scrollY > 50);
});
// Contact form
document.querySelector('#contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Sending...';
  const data = Object.fromEntries(new FormData(e.target));
  data.slug = 'SLUG_VALUE';
  try {
    await fetch('/api/leads', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
    document.querySelector('#success-msg').style.display = 'block';
    e.target.style.display = 'none';
  } catch { btn.disabled = false; btn.textContent = 'Try again'; }
});
// Mobile menu
const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-menu');
if (hamburger) hamburger.addEventListener('click', () => mobileMenu.classList.toggle('open'));

COPY RULES:
- Detect language from input, write ALL copy in that language
- Headlines: power words, specific, emotional
- Stats: realistic niche-specific numbers with + or %
- Testimonials: first name + last initial, specific role, specific measurable result in quote
- No lorem ipsum anywhere
- CTA maps: Book a call→"BOOK FREE CALL →", Buy→"GET STARTED →", Message→"GET IN TOUCH →", Waitlist→"JOIN WAITLIST →"`;

type LandingInput = {
  offer: string;
  audience: string;
  pricing: string;
  positioning: string;
  headline: string;
  userEmail: string;
  businessName?: string;
  primaryGoal?: string;
  siteVibe?: string;
};

function randomFourDigits() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function injectSlug(html: string, slug: string): string {
  return html.replaceAll("SLUG_VALUE", slug);
}

function cleanHtml(raw: string): string {
  return raw
    .replace(/^```(?:html)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LandingInput;
    if (!body.offer || !body.audience || !body.userEmail) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!apiKey || !supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Missing environment variables." }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Missing auth token." }, { status: 401 });

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

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

Return the complete HTML document only. No explanation.`;

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 12000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!anthropicResponse.ok) {
      const details = await anthropicResponse.text();
      return NextResponse.json({ error: "Claude request failed.", details }, { status: 502 });
    }

    const completion = (await anthropicResponse.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    const rawText =
      completion.content?.find((i) => i.type === "text")?.text?.trim() || "";
    const html = cleanHtml(rawText);

    if (!html.startsWith("<!DOCTYPE html>") && !html.startsWith("<html")) {
      return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 502 });
    }

    const existingPage = await supabase
      .from("landing_pages")
      .select("slug")
      .eq("user_id", user.id)
      .maybeSingle();

    const emailBase = body.userEmail
      .split("@")[0]
      .replace(/[^a-zA-Z0-9-]/g, "-")
      .toLowerCase();
    const slug = existingPage.data?.slug ?? `${emailBase}-${randomFourDigits()}`;
    const htmlWithSlug = injectSlug(html, slug);

    const { error: upsertError } = await supabase
      .from("landing_pages")
      .upsert(
        { user_id: user.id, slug, html_content: htmlWithSlug, jsx_content: null } as never,
        { onConflict: "slug" }
      );

    if (upsertError) {
      return NextResponse.json(
        { error: "Failed to save.", details: upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ slug, success: true });
  } catch (error) {
    console.error("generate-landing error:", error);
    return NextResponse.json(
      { error: "Failed to generate. Please try again." },
      { status: 500 }
    );
  }
}
