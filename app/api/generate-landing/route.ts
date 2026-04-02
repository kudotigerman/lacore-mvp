import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const landingSystemPrompt = `You are a world-class landing page designer and conversion copywriter. You design pages that win Awwwards, convert at 15%+, and make people say 'wow' when they open them.

Generate a COMPLETE, STUNNING, HIGH-CONVERTING single-page HTML landing page personalized for this specific business.

DESIGN PHILOSOPHY:
- Every page must feel custom-designed for THIS business, not a template
- Use design trends from 2025: bold typography, micro-animations, glassmorphism or noise textures where appropriate
- The page should feel premium, trustworthy, and emotionally resonant

COLOR & STYLE — choose based on business niche:
- Real estate / luxury / finance → deep navy #0A1628 background, gold #C9A84C accent, cream text, serif display font (Playfair Display)
- Fitness / sports / coaching → near-black background, electric orange #FF4D00 or red #E63946 accent, bold condensed font (Oswald or Barlow Condensed)
- Creative / design / photography / art → pure white or #FAFAFA background, black text, one unexpected accent (electric blue or warm yellow), elegant font (DM Serif Display or Cormorant)
- Marketing / SMM / growth → dark #0D0D0D with purple-to-pink gradient accents (#7C3AED to #EC4899), modern font (Plus Jakarta Sans)
- Education / teaching / courses / coaching → warm off-white #FFFBF5 background, deep teal #0D9488 or indigo #4F46E5 accent, friendly font (Nunito or Poppins)
- Tech / dev / software / SaaS → dark #0A0A0F background, electric green #00FF94 or cyan #00D4FF accent, monospace elements, font (Space Grotesk or Inter)
- Food / restaurant / culinary → dark #1A0A00 or warm cream #FFF8F0, rich orange #D4622A or deep red accent, font (Lora or Merriweather)
- Health / wellness / beauty / skincare → soft white #FEFEFE or sage #F0F4F0, rose #E8B4B8 or sage green #6B8F71 accent, clean font (Josefin Sans or Raleway)
- Real person / freelancer / consultant → professional dark or light depending on field, trust-building colors, font that matches personality
- Default → sophisticated dark #080C14, electric blue #2563EB accent, modern font (Cabinet Grotesk)

REQUIRED SECTIONS (make each one visually distinct and stunning):

1. NAVIGATION
   - Logo (business name in accent color) left
   - 3-4 nav links center (hidden on mobile, hamburger menu)
   - CTA button right (filled, accent color)
   - Fixed/sticky, with blur backdrop on scroll

2. HERO (most important section)
   - Full viewport height
   - Massive display headline (from the provided headline field) — make it HUGE, 80-120px on desktop
   - Compelling subheadline (2-3 sentences, from the offer field)
   - Two buttons: primary CTA (filled) + secondary (outlined)
   - Trust indicators row: 3 stats or badges (e.g. "50+ clients" "5★ rating" "Money-back guarantee")
   - Background: gradient, subtle pattern, or atmospheric effect that fits the niche
   - Add a subtle entrance animation (fade + slide up) using CSS @keyframes

3. SOCIAL PROOF BAR
   - "Trusted by professionals in [city/industry]"
   - 5 placeholder company logos (use text abbreviations styled as logos)
   - Scrolling ticker animation

4. PROBLEM SECTION
   - Headline: "Does this sound familiar?"
   - 3 pain points from the audience's perspective (based on audience field)
   - Each with an icon (use emoji or CSS shapes), short title, 1-2 sentence description
   - Dark/light contrast section

5. SOLUTION SECTION  
   - Headline: "Introducing [business name]"
   - The offer explained clearly (from offer field)
   - 3 core benefits with icons
   - One highlighted quote or bold statement

6. HOW IT WORKS
   - 3 simple numbered steps
   - Timeline or card layout
   - CTA button at bottom

7. PRICING SECTION
   - Based on the pricing field
   - 1-3 pricing tiers if applicable, or one clear offer
   - Highlight the recommended option
   - Money-back guarantee badge
   - CTA button

8. TESTIMONIALS
   - 3 testimonials with placeholder names and photos (use CSS avatar initials)
   - Star ratings
   - Mark as [TESTIMONIAL 1], [TESTIMONIAL 2], [TESTIMONIAL 3] in HTML comments

9. FAQ
   - 5 common questions with accordion toggle (CSS/JS)
   - Questions relevant to the business niche

10. FINAL CTA SECTION
    - Full-width, accent color background
    - Bold headline: urgent, benefit-focused
    - Lead capture form: Name + Email + Message fields + Submit button
    - Form shows success message on submit (no backend needed yet)
    - Privacy note below form

11. FOOTER
    - Logo + tagline
    - 3 columns: Services, Company, Contact
    - Copyright
    - Social media icon links (placeholder hrefs)

TECHNICAL REQUIREMENTS:
- Import Google Fonts via <link> in <head>
- All CSS in one <style> block in <head> — no external CSS files
- All JS in one <script> block before </body>
- CSS variables for colors: --primary, --accent, --text, --bg, --surface
- Mobile-first responsive: breakpoints at 768px and 1024px
- Smooth scroll behavior
- Hover states on all interactive elements
- Page load animations (stagger children with animation-delay)
- Hamburger menu for mobile
- Accordion FAQ with smooth height transition
- Form validation (required fields)
- Performance: no heavy external resources

COPY GUIDELINES:
- Use the provided data: offer, audience, pricing, positioning, headline
- Write copy that speaks directly to the target audience
- Use power words, social proof language, urgency
- Every CTA should be action-oriented and specific
- Headlines should be bold, specific, benefit-driven

Return ONLY the complete HTML document starting with <!DOCTYPE html>. No markdown. No explanation. No code blocks.`;

type LandingInput = {
  offer: string;
  audience: string;
  pricing: string;
  positioning: string;
  headline: string;
  userName?: string;
  userEmail: string;
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
            content: JSON.stringify(body)
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
