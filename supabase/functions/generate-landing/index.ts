import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SYSTEM_PROMPT_HTML } from "./promptHtml.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const styleConfigs = {
  dark_pro: {
    bg: "#07080F",
    bg2: "#0D0F1A",
    bg3: "#111116",
    text: "#FAFAFA",
    textMuted: "#A1A1AA",
    accent: "#6366F1",
    accentHover: "#4F46E5",
    accentLight: "#818CF8",
    border: "#1C1C22",
    cardBg: "#111116",
    fontHeading: "Plus Jakarta Sans",
    fontBody: "Inter",
    borderRadius: "20px",
    sectionPadding: "120px 40px",
  },
  light_clean: {
    bg: "#FAFAFA",
    bg2: "#F4F4F5",
    bg3: "#FFFFFF",
    text: "#111111",
    textMuted: "#71717A",
    accent: "#6366F1",
    accentHover: "#4F46E5",
    accentLight: "#A5B4FC",
    border: "#E4E4E7",
    cardBg: "#FFFFFF",
    fontHeading: "Plus Jakarta Sans",
    fontBody: "Inter",
    borderRadius: "16px",
    sectionPadding: "100px 40px",
  },
  bold_black: {
    bg: "#000000",
    bg2: "#0A0A0A",
    bg3: "#111111",
    text: "#FFFFFF",
    textMuted: "#888888",
    accent: "#FFFFFF",
    accentHover: "#E5E5E5",
    accentLight: "#CCCCCC",
    border: "#222222",
    cardBg: "#111111",
    fontHeading: "Plus Jakarta Sans",
    fontBody: "Inter",
    borderRadius: "4px",
    sectionPadding: "120px 40px",
  },
  warm_cream: {
    bg: "#FAF7F2",
    bg2: "#F0EBE3",
    bg3: "#FFFFFF",
    text: "#1A1410",
    textMuted: "#78716C",
    accent: "#C2410C",
    accentHover: "#9A3412",
    accentLight: "#EA580C",
    border: "#E7E5E4",
    cardBg: "#FFFFFF",
    fontHeading: "Plus Jakarta Sans",
    fontBody: "Inter",
    borderRadius: "12px",
    sectionPadding: "100px 40px",
  },
  tech_modern: {
    bg: "#0F0720",
    bg2: "#1A0F35",
    bg3: "#1E1040",
    text: "#FFFFFF",
    textMuted: "#A78BFA",
    accent: "#A855F7",
    accentHover: "#9333EA",
    accentLight: "#C084FC",
    border: "#2D1B69",
    cardBg: "rgba(168,85,247,0.08)",
    fontHeading: "Plus Jakarta Sans",
    fontBody: "Inter",
    borderRadius: "16px",
    sectionPadding: "120px 40px",
  },
  natural_green: {
    bg: "#F7FAF5",
    bg2: "#EEF5EA",
    bg3: "#FFFFFF",
    text: "#1A2E1A",
    textMuted: "#6B8F6B",
    accent: "#16A34A",
    accentHover: "#15803D",
    accentLight: "#22C55E",
    border: "#D1FAE5",
    cardBg: "#FFFFFF",
    fontHeading: "Plus Jakarta Sans",
    fontBody: "Inter",
    borderRadius: "12px",
    sectionPadding: "100px 40px",
  },
} as const;

type StyleKey = keyof typeof styleConfigs;

const nicheHints: Record<string, string> = {
  Designer:
    "NICHE FOCUS: Portfolio-style. Emphasize visual work quality, aesthetics, case studies section. Hero should feel like a portfolio piece.",
  Consultant:
    "NICHE FOCUS: Authority and expertise. Emphasize methodology, ROI numbers, proven framework, client results.",
  Coach:
    "NICHE FOCUS: Transformation journey. Emphasize before/after results, personal story, specific outcomes achieved by clients.",
  Developer:
    "NICHE FOCUS: Technical credibility. Emphasize tech stack, specific results, reliability, integrations.",
  Agency:
    "NICHE FOCUS: Scale and portfolio. Emphasize team, case studies with results, client logos, scale of work.",
  "Real Estate Agent":
    "NICHE FOCUS: Trust and local expertise. Emphasize local market knowledge, transaction numbers, availability.",
};

const jsonSystemPrompt = `You are an expert conversion copywriter. Generate landing page content as a valid JSON object.
Output ONLY JSON with this schema:
{ niche, brand, badge, headline, headlineAccent, subheadline, ctaPrimary, ctaSecondary, socialProof, stats:[{number,label}x3], problemHeadline, problems:[{emoji,title,desc}x3], solutionHeadline, features:[{icon,title,desc}x3], processHeadline, steps:[{title,desc}x3], testimonialsHeadline, testimonials:[{text,name,role}x3], ctaHeadline, ctaSubtext, ctaButton, formHeadline, formButton }
Rules:
- niche one of [fitness|designer|developer|coach|consultant|agency|course|local|default]
- same language as offer
- no lorem ipsum
- testimonials and stats must include specific numbers
- for developer or default niche, brand/visual tone uses indigo accent #6366F1 (not cyan or teal)`;

function randomFourDigits() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function cleanJson(raw: string) {
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function cleanHtml(raw: string): string {
  return raw
    .replace(/^```(?:html)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();
}

function injectSlug(html: string, slug: string): string {
  return html.replaceAll("SLUG_VALUE", slug);
}

function injectStripeCheckoutHtml(
  html: string,
  opts: { slug: string; buttonText: string; siteOrigin: string },
): string {
  const origin = opts.siteOrigin.replace(/\/$/, "");
  const slugJson = JSON.stringify(opts.slug);
  const safeBtn = opts.buttonText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");

  const snippet = `
<div id="lacore-stripe-fab" style="position:fixed;bottom:20px;left:20px;z-index:2147483647;font-family:system-ui,sans-serif;">
<button type="button" id="lacore-stripe-pay-btn" style="border:none;background:#6366f1;color:#fff;border-radius:6px;padding:14px 22px;font-size:13px;font-weight:800;letter-spacing:0.06em;cursor:pointer;box-shadow:0 12px 40px rgba(0,0,0,0.35);">${safeBtn}</button>
</div>
<script>
(function(){
  var b=document.getElementById('lacore-stripe-pay-btn');
  if(!b)return;
  b.addEventListener('click',function(){
    fetch(${JSON.stringify(`${origin}/api/stripe/checkout`)},{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:${slugJson}})})
      .then(function(r){return r.json();})
      .then(function(j){
        if(j.checkout_url){window.location.href=j.checkout_url;}
        else if(j.error){alert(j.error);}
      }).catch(function(){alert('Checkout failed');});
  });
})();
</script>`;

  const trimmed = html.trim();
  if (/<\/body>/i.test(trimmed)) {
    return trimmed.replace(/<\/body>/i, `${snippet}</body>`);
  }
  return `${trimmed}${snippet}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    const body = await req.json();

    const projectId =
      typeof body.project_id === "string" && body.project_id.length > 0 ? body.project_id : null;

    const { data: profileRow } = await supabase
      .from("profiles")
      .select(
        "display_name, plan, landing_generations_count, credits_balance, role",
      )
      .eq("user_id", userId)
      .maybeSingle();
    const prof = profileRow as {
      display_name?: string;
      plan?: string;
      landing_generations_count?: number;
      credits_balance?: number;
      role?: string | null;
    } | null;

    const styleRaw =
      typeof body.style === "string" && body.style.trim().length > 0
        ? body.style.trim()
        : "dark_pro";
    const styleKey: StyleKey = styleRaw in styleConfigs
      ? (styleRaw as StyleKey)
      : "dark_pro";
    const styleConfig = styleConfigs[styleKey];

    const userRoleFromBody =
      typeof body.userRole === "string" && body.userRole.trim().length > 0
        ? body.userRole.trim()
        : "";
    const userRole =
      userRoleFromBody ||
      (typeof prof?.role === "string" ? prof.role.trim() : "");

    const planName = typeof prof?.plan === "string" ? prof.plan : "free";
    const genLimit =
      planName === "free"
        ? 1
        : planName === "starter" || planName === "pro" || planName === "scale"
          ? 999
          : 1;
    const generationCount = Number(prof?.landing_generations_count ?? 0);
    if (generationCount >= genLimit) {
      return new Response(
        JSON.stringify({ error: "Generation limit reached. Upgrade your plan." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const creditsBal = Number(prof?.credits_balance ?? 0);
    if (creditsBal < 10) {
      return new Response(
        JSON.stringify({
          error: "insufficient_credits",
          message: "Not enough credits. Please upgrade your plan or buy more credits.",
        }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const profileDisplayName =
      typeof prof?.display_name === "string" ? prof.display_name.trim() : "";
    const brandNameLine =
      profileDisplayName.length > 0 ? profileDisplayName : "(not set in profile)";
    const displayName =
      profileDisplayName || body.businessName || body.userEmail.split("@")[0];
    const headlineRaw =
      typeof body.headline === "string" && body.headline.trim().length > 0
        ? body.headline.trim()
        : displayName;

    const jsonUserMessage = `Generate JSON landing content.
Display name: ${brandNameLine}
Offer: ${body.offer}
Audience: ${body.audience}
Pricing: ${body.pricing}
Positioning: ${body.positioning}
Suggested headline: ${body.headline}
Primary CTA goal: ${body.primaryGoal || "Book a call"}
Site vibe: ${body.siteVibe || "Professional"}`;

    const anthropicJsonRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 6000,
        temperature: 0.8,
        stream: false,
        system: jsonSystemPrompt,
        messages: [{ role: "user", content: jsonUserMessage }],
      }),
    });

    if (!anthropicJsonRes.ok) {
      return new Response(
        JSON.stringify({
          error: "Our AI is temporarily busy. Please try again in a moment.",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const parsedJson = await anthropicJsonRes.json() as {
      content?: Array<{ text?: string }>;
    };
    const jsonText = parsedJson.content?.[0]?.text ?? "";
    const jsonRaw = cleanJson(jsonText);
    let jsonContent: Record<string, unknown>;
    try {
      jsonContent = JSON.parse(jsonRaw) as Record<string, unknown>;
    } catch {
      return new Response(
        JSON.stringify({ error: "Generation failed. Invalid JSON output." }),
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
    let landingQuery = supabase.from("landing_pages").select("slug").eq("user_id", userId);
    landingQuery = projectId
      ? landingQuery.eq("project_id", projectId)
      : landingQuery.is("project_id", null);
    const existingPage = await landingQuery.maybeSingle();
    const slug =
      existingPage.data?.slug ??
      `${emailBase}-${Math.floor(1000 + Math.random() * 9000)}`;

    const nicheLine = nicheHints[userRole] ?? "";
    const htmlUserMessage =
      `Generate a premium landing page for this business:

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

Use EXACTLY this content to generate the HTML landing page:
${JSON.stringify(jsonContent)}

Detect the language from the offer text. Write ALL copy in that language.
Contact form slug value: SLUG_VALUE

Return the complete HTML document only. No explanation.
STYLE CONFIG: ${JSON.stringify(styleConfig)}
${nicheLine}
IMPORTANT: Use the style config colors throughout ALL inline styles. Replace all hardcoded dark colors with the provided config values. The bg value is the main background, accent is button/highlight color, text is main text color.`;

    const anthropicHtmlRes = await fetch("https://api.anthropic.com/v1/messages", {
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
        stream: false,
        system: SYSTEM_PROMPT_HTML,
        messages: [{ role: "user", content: htmlUserMessage }],
      }),
    });

    if (!anthropicHtmlRes.ok) {
      return new Response(
        JSON.stringify({
          error: "Our AI is temporarily busy. Please try again in a moment.",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const parsedHtml = await anthropicHtmlRes.json() as {
      content?: Array<{ text?: string }>;
    };
    const htmlRaw = parsedHtml.content?.[0]?.text ?? "";
    const html = cleanHtml(htmlRaw);

    if (!html.startsWith("<!DOCTYPE html>") && !html.toLowerCase().startsWith("<html")) {
      return new Response(
        JSON.stringify({ error: "Generation failed. Invalid HTML output." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let htmlWithSlug = injectSlug(html, slug);

    const { data: stripeRow } = await supabase
      .from("stripe_settings")
      .select("publishable_key, secret_key, price_id, button_text")
      .eq("user_id", userId)
      .maybeSingle();
    const sr = stripeRow as {
      publishable_key?: string;
      secret_key?: string | null;
      price_id?: string | null;
      button_text?: string | null;
    } | null;
    const stripeReady =
      sr &&
      sr.publishable_key?.startsWith("pk_") &&
      sr.secret_key?.startsWith("sk_") &&
      Boolean(sr.price_id?.trim());
    if (stripeReady) {
      const siteOrigin =
        Deno.env.get("PUBLIC_SITE_URL")?.trim() || "https://www.lacore.ai";
      htmlWithSlug = injectStripeCheckoutHtml(htmlWithSlug, {
        slug,
        buttonText: sr.button_text?.trim() || "Book Now",
        siteOrigin,
      });
    }

    const { data: deducted, error: deductErr } = await supabase.rpc("deduct_credits", {
      p_user_id: userId,
      p_amount: 10,
      p_action: "generate_landing",
    });
    if (deductErr || deducted !== true) {
      return new Response(
        JSON.stringify({
          error: "insufficient_credits",
          message: "Not enough credits. Please upgrade your plan or buy more credits.",
        }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { error: upsertError } = await supabase.from("landing_pages").upsert(
      {
        user_id: userId,
        project_id: projectId,
        slug,
        html_content: htmlWithSlug,
        json_content: jsonContent,
        jsx_content: null,
      },
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

    await supabase
      .from("profiles")
      .update({ landing_generations_count: generationCount + 1 })
      .eq("user_id", userId);

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
