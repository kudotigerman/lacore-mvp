import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `You are an expert conversion copywriter. Generate landing page content as a valid JSON object.
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderHtml(content: Record<string, unknown>, title: string): string {
  const brand = String(content.brand ?? "Brand");
  const headline = String(content.headline ?? "");
  const headlineAccent = String(content.headlineAccent ?? "");
  const subheadline = String(content.subheadline ?? "");
  const cta = String(content.ctaPrimary ?? "Get Started");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(subheadline)}"></head><body style="margin:0;background:#0A0A0D;color:#FAFAFA;font-family:Inter,system-ui,sans-serif"><main style="max-width:900px;margin:0 auto;padding:120px 24px"><p style="color:#6366F1">${escapeHtml(String(content.badge ?? ""))}</p><h1 style="font-size:56px;line-height:1.05">${escapeHtml(headline)}<br><span style="color:#818CF8">${escapeHtml(headlineAccent)}</span></h1><p style="color:#A1A1AA">${escapeHtml(subheadline)}</p><a href="#contact-form" style="display:inline-block;background:#6366F1;color:#fff;padding:14px 20px;border-radius:10px;text-decoration:none">${escapeHtml(cta)}</a><section id="contact-form" style="margin-top:64px"><h2>${escapeHtml(String(content.formHeadline ?? "Contact us"))}</h2></section><footer style="margin-top:64px;border-top:1px solid #1C1C22;padding-top:24px">${escapeHtml(brand)} · <a href="https://lacore.ai" target="_blank" rel="noopener noreferrer" style="color:#A1A1AA">Built with LACORE</a></footer></main></body></html>`;
}

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

    const projectId =
      typeof body.project_id === "string" && body.project_id.length > 0 ? body.project_id : null;

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("display_name, plan, landing_generations_count, credits_balance")
      .eq("user_id", userId)
      .maybeSingle();
    const prof = profileRow as {
      display_name?: string;
      plan?: string;
      landing_generations_count?: number;
      credits_balance?: number;
    } | null;
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
    const userMessage = `Generate JSON landing content.
Display name: ${brandNameLine}
Offer: ${body.offer}
Audience: ${body.audience}
Pricing: ${body.pricing}
Positioning: ${body.positioning}
Suggested headline: ${body.headline}
Primary CTA goal: ${body.primaryGoal || "Book a call"}
Site vibe: ${body.siteVibe || "Professional"}`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
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
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!anthropicRes.ok) {
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

    const parsed = await anthropicRes.json() as { content?: Array<{ text?: string }> };
    const text = parsed.content?.[0]?.text ?? "";
    const jsonRaw = cleanJson(text);
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

    const html = renderHtml(jsonContent, headlineRaw);

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
        html_content: html,
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
