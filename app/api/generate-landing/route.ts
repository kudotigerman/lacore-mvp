import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const landingSystemPrompt = `You are a world-class landing page designer. Generate a STUNNING, PROFESSIONAL, VISUALLY RICH single-page HTML landing page.

TECHNICAL STACK TO USE:
- Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Alpine.js via CDN: <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
- Google Fonts via <link> in head
- Real images from Unsplash (use direct URLs): https://images.unsplash.com/photo-[ID]?w=1200&q=80&fit=crop
  Choose photo IDs that match the business niche

UNSPLASH PHOTO IDs BY NICHE (use these exact IDs):
- Real estate: 1560518883-ce09059eeffa, 1570129477492-1f239a2278e7, 1449844908441-8d1a1f9ed1cc
- Fitness/coaching: 1571019613454-1cb2f99b2d8b, 1534438327276-14e5300c3a48, 1517836357463-d25dfeac3438
- Design/creative: 1558618666-fcd25c85cd64, 1561070791-2526b2e96498, 1572044162444-ad60f128bdea  
- Marketing/SMM: 1611162617213-7d7a39e9b1d7, 1432888498266-38ffec3eaf0a, 1553877522-43269d4ea984
- Education/courses: 1522202176988-66273c2fd55f, 1501504905252-473c47e087f8, 1434030216411-0b793f4b4173
- Tech/software: 1518770660439-4636190af475, 1461749280684-dccba630e2f6, 1555949963-ff9fe0c870cb
- Food/restaurant: 1504674900247-0877df9cc836, 1414235077428-338989a2e8c0, 1565299624946-b28dc8a6855c
- Health/wellness/beauty: 1544161515-4ab6ce6db874, 1571019613454-1cb2f99b2d8b, 1498842812179-c81a8f3ce35b
- General business: 1507003211169-0a1dd7228f2d, 1521737852567-6949f3f9f2b5, 1600880292203-757bb62b4baf

DESIGN REQUIREMENTS:
Choose the visual style based on business niche:

DARK PREMIUM (real estate, finance, luxury):
- bg-gray-950 or bg-slate-900 background
- Gold/amber accents: text-amber-400, bg-amber-500
- Font: Playfair Display for headings, Inter for body
- Hero: full-height with overlay on Unsplash background image

BOLD ENERGY (fitness, sports, motivation):
- bg-zinc-950 background
- Orange/red: text-orange-500, bg-orange-500
- Font: Oswald for headings (bold condensed)
- Hero: dark bg with large hero image

CLEAN MINIMAL (design, creative, photography):
- bg-white or bg-gray-50 background, dark text
- One bold accent: slate-900, with a pop color
- Font: DM Serif Display headings, DM Sans body
- Lots of whitespace, large typography

GRADIENT MODERN (marketing, SMM, growth):
- bg-slate-950 background
- Purple/pink gradient: from-purple-600 to-pink-600
- Font: Plus Jakarta Sans
- Glassmorphism cards: bg-white/5 backdrop-blur border border-white/10

WARM FRIENDLY (education, coaching, courses):
- bg-amber-50 or bg-white background
- Teal or indigo: text-teal-600, bg-teal-600
- Font: Poppins
- Rounded corners everywhere, friendly illustrations with CSS shapes

TECH DARK (software, SaaS, dev):
- bg-gray-950 background with subtle grid pattern
- Cyan/green: text-cyan-400, bg-cyan-500
- Font: Space Grotesk
- Code-like elements, terminal aesthetics

REQUIRED HTML STRUCTURE:

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Business Name]</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=[CHOSEN_FONT]:wght@400;600;700;900&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { display: ['[CHOSEN_FONT]', 'serif'] }
        }
      }
    }
  </script>
</head>

SECTIONS TO BUILD:

1. NAVBAR (sticky, with blur)
- Logo text left in accent color, font-display
- Nav links center (hidden on mobile)
- CTA button right
- x-data for mobile menu toggle

2. HERO (min-h-screen, with REAL Unsplash background image)
- Background: bg-[url('https://images.unsplash.com/photo-[ID]?w=1920&q=80&fit=crop')] bg-cover bg-center
- Dark overlay: bg-black/60 or gradient
- Huge headline: text-5xl md:text-7xl lg:text-8xl font-display font-black
- Subheadline: text-xl md:text-2xl
- Two CTA buttons
- Trust badges row (flex, gap)
- Entrance animation: add this CSS class and @keyframes fadeInUp

3. LOGOS BAR (social proof)
- "Trusted by 500+ professionals"
- 5 company name placeholders in muted style

4. PROBLEM SECTION
- Grid of 3 cards with emojis/icons
- Each pain point with title + description

5. SOLUTION/BENEFITS SECTION  
- Large section with Unsplash image on one side (md:grid-cols-2)
- 3 benefit items with checkmark icons

6. HOW IT WORKS
- 3 numbered steps in a row (md:grid-cols-3)
- Connected with subtle line

7. PRICING
- 1-3 cards based on pricing data
- Highlighted recommended plan with ring-2 ring-accent

8. TESTIMONIALS
- 3 cards with star ratings, avatar initials, quote, name
- Grid layout

9. FAQ (Alpine.js accordion)
- 5 questions with smooth toggle
- x-data, x-show, @click

10. FINAL CTA + CONTACT FORM
- Full-width section with Unsplash background
- Form: name, email, message, submit button
- @submit.prevent shows success message with x-show

11. FOOTER
- Logo + tagline
- 3 column links grid
- Copyright + social icons (SVG)

COPY: Use the provided business data throughout. Make it specific, compelling, benefit-driven.

Return ONLY complete HTML. No markdown. No explanation. No code blocks. Start with <!DOCTYPE html>`;

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
