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
- brand: use the provided business/brand name exactly as given; only infer from offer if brand name is "(not set)" — NEVER use email addresses or usernames as brand name
- headline: 4-6 words describing what you do (plain #FAFAFA color)
- headlineAccent: MUST be 2-4 words MAX, a different punchy outcome or timeframe — NEVER repeat or paraphrase headline words. BAD: headline="Transform Your Business With AI" accent="With AI Implementation" — GOOD: headline="Transform Your Business With AI" accent="In 90 Days"
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
    const requestedStyle = typeof body.style === "string" ? body.style : "dark-indigo";

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("display_name, plan, landing_generations_count, credits_balance")
      .eq("user_id", userId)
      .maybeSingle();
    const { data: projectRow } = await supabase
      .from("projects")
      .select("name")
      .eq("id", projectId ?? "")
      .maybeSingle();

    const projectName = typeof (projectRow as { name?: string } | null)?.name === "string"
      ? (projectRow as { name: string }).name.trim()
      : "";

    const isDefaultProjectName = !projectName || projectName === "My Project" || projectName === "";
    const prof = profileRow as {
      display_name?: string;
      plan?: string;
      landing_generations_count?: number;
      credits_balance?: number;
    } | null;
    const generationCount = Number(prof?.landing_generations_count ?? 0);
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
    const brandNameLine = isDefaultProjectName
      ? (profileDisplayName.length > 0 ? profileDisplayName : "(not set)")
      : projectName;
    const displayName =
      profileDisplayName || body.businessName || body.userEmail.split("@")[0];
    const headlineRaw =
      typeof body.headline === "string" && body.headline.trim().length > 0
        ? body.headline.trim()
        : displayName;
    const userMessage = `Generate JSON landing content.
Business/brand name: ${brandNameLine}${isDefaultProjectName ? " (not set — infer a short brand name from the offer, 2-3 words MAX, NO email addresses)" : ""}
Offer: ${body.offer}
Audience: ${body.audience}
Pricing: ${body.pricing}
Positioning: ${body.positioning}
Suggested headline: ${body.headline}
Primary CTA goal: ${body.primaryGoal || "Book a call"}
Site vibe: ${body.siteVibe || "Professional"}
Style preference: ${requestedStyle}`;

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
        json_content: jsonContent,
        html_content: null,
        jsx_content: null,
        style: requestedStyle,
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
