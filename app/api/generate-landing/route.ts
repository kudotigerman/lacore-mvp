import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 120;

const systemPrompt = `You are the world's best landing page designer. You create complete HTML landing pages that look like they cost $10,000 from a top agency. Think Stripe, Linear, Vercel — clean, bold, premium.

CRITICAL OUTPUT RULES:
- Return ONLY a complete HTML document starting with <!DOCTYPE html>
- No markdown, no backticks, no explanation
- All CSS in a <style> tag in <head>
- All JS in a <script> tag before </body>
- No external CSS frameworks — pure custom CSS only
- Google Fonts allowed via <link>

DESIGN SYSTEM — pick ONE based on siteVibe:

LUXURY: bg #0A0A0A, text #F5F0E8, accent #C9A96E. Fonts: Playfair Display + Inter
BOLD: bg #060610, text #FFFFFF, accent #6366F1. Fonts: Inter Black + Inter  
PROFESSIONAL: bg #0F172A, text #F1F5F9, accent #3B82F6. Fonts: Inter + Inter
WARM: bg #FFF8F3, text #1C0F0A, accent #E85D04. Fonts: Playfair Display + Inter

REQUIRED SECTIONS:

1. NAV — fixed top, logo left, 3 nav links center, CTA button right. Transparent → solid on scroll (JS).

2. HERO — 100vh, centered content:
- Badge pill with accent border
- H1: two lines, second line in accent color, font-size clamp(3rem,7vw,6rem), font-weight 900
- Subheadline: max-width 560px, opacity 0.7
- 2 CTA buttons (primary accent + secondary outline)
- Background: 3 radial gradient orbs (position:absolute, filter:blur(120px), opacity 0.25)
- 1 floating glassmorphism card (position:absolute, top-right area)

3. STATS — 3 impressive numbers in a row, separator lines between them

4. FEATURES — CSS grid 2x2, 4 cards with emoji icon, title, description. One card has accent background.

5. TESTIMONIALS — 2 cards side by side, star rating, quote, avatar initials, name, role

6. PRICING — 2 tiers side by side. One featured with accent border and "MOST POPULAR" badge. Each has: tier name, price, 5 features with ✓, CTA button.

7. CTA + CONTACT + FOOTER — 
   - Full-width accent gradient section with big headline and button
   - Contact form: name, email, message, submit. JS fetch POST to /api/leads with {name, email, message, slug: 'SLUG_VALUE'}
   - Footer: logo, tagline, copyright

CSS ANIMATIONS (in <style>):
@keyframes fadeInUp { from { opacity:0; transform:translateY(30px) } to { opacity:1; transform:translateY(0) } }
@keyframes float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-12px) } }
@keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 accentColor40 } 50% { box-shadow: 0 0 20px 8px accentColor40 } }

Apply fadeInUp to hero content. Apply float to floating card.

MOBILE (media queries in <style>):
@media (max-width: 768px) — stack grids to 1 column, reduce font sizes, hide floating card, full-width buttons

JS (in <script>):
- Nav scroll effect
- Contact form submit with fetch
- Simple show/hide for mobile menu

COPY RULES:
- ALL text in same language as input
- No lorem ipsum, no placeholder text
- Power words: "finally", "without", "guaranteed"
- CTA maps to primaryGoal: Book a call→"BOOK FREE CALL →", Buy→"GET STARTED →", Message→"GET IN TOUCH →", Waitlist→"JOIN WAITLIST →"
- Stats: realistic numbers for the niche
- Testimonials: specific results, real-sounding names`;

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
