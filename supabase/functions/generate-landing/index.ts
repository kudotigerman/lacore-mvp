import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `You are an expert conversion copywriter. Call the render_landing tool once with complete landing page content.
Rules:
- niche one of [fitness|designer|developer|coach|consultant|agency|course|local|default]
- brand: use the provided business/brand name exactly as given; only infer from offer if brand name is "(not set)" — NEVER use email addresses or usernames as brand name
- headline: 4-6 words describing what you do (plain #FAFAFA color)
- headlineAccent: MUST be 2-4 words MAX, a different punchy outcome or timeframe — NEVER repeat or paraphrase headline words. BAD: headline="Transform Your Business With AI" accent="With AI Implementation" — GOOD: headline="Transform Your Business With AI" accent="In 90 Days"
- same language as offer
- no lorem ipsum
- testimonials and stats must include specific numbers
- for developer or default niche, brand/visual tone uses indigo accent #6366F1 (not cyan or teal)`;

const tools = [{
  name: "render_landing",
  description: "Render landing page content as structured JSON",
  input_schema: {
    type: "object",
    required: ["niche", "brand", "badge", "headline", "headlineAccent", "subheadline",
      "ctaPrimary", "ctaSecondary", "socialProof", "stats", "problemHeadline",
      "problems", "solutionHeadline", "features", "processHeadline", "steps",
      "testimonialsHeadline", "testimonials", "ctaHeadline", "ctaSubtext",
      "ctaButton", "formHeadline", "formButton"],
    properties: {
      niche: { type: "string", enum: ["fitness", "designer", "developer", "coach", "consultant", "agency", "course", "local", "default"] },
      brand: { type: "string", minLength: 1, maxLength: 50 },
      badge: { type: "string" },
      headline: { type: "string", minLength: 10, maxLength: 80 },
      headlineAccent: { type: "string", minLength: 2, maxLength: 40 },
      subheadline: { type: "string" },
      ctaPrimary: { type: "string" },
      ctaSecondary: { type: "string" },
      socialProof: { type: "string" },
      stats: {
        type: "array", minItems: 3, maxItems: 3,
        items: { type: "object", required: ["number", "label"],
          properties: { number: { type: "string" }, label: { type: "string" } },
        },
      },
      problemHeadline: { type: "string" },
      problems: {
        type: "array", minItems: 3, maxItems: 3,
        items: { type: "object", required: ["emoji", "title", "desc"],
          properties: { emoji: { type: "string" }, title: { type: "string" }, desc: { type: "string" } },
        },
      },
      solutionHeadline: { type: "string" },
      features: {
        type: "array", minItems: 3, maxItems: 3,
        items: { type: "object", required: ["icon", "title", "desc"],
          properties: { icon: { type: "string" }, title: { type: "string" }, desc: { type: "string" } },
        },
      },
      processHeadline: { type: "string" },
      steps: {
        type: "array", minItems: 3, maxItems: 3,
        items: { type: "object", required: ["title", "desc"],
          properties: { title: { type: "string" }, desc: { type: "string" } },
        },
      },
      testimonialsHeadline: { type: "string" },
      testimonials: {
        type: "array", minItems: 3, maxItems: 3,
        items: { type: "object", required: ["text", "name", "role"],
          properties: { text: { type: "string" }, name: { type: "string" }, role: { type: "string" } },
        },
      },
      ctaHeadline: { type: "string" },
      ctaSubtext: { type: "string" },
      ctaButton: { type: "string" },
      formHeadline: { type: "string" },
      formButton: { type: "string" },
    },
  },
}];

const nicheEnum = z.enum([
  "fitness",
  "designer",
  "developer",
  "coach",
  "consultant",
  "agency",
  "course",
  "local",
  "default",
]);

const renderLandingInputSchema = z.object({
  niche: nicheEnum,
  brand: z.string().min(1).max(50),
  badge: z.string(),
  headline: z.string().min(10).max(80),
  headlineAccent: z.string().min(2).max(40),
  subheadline: z.string(),
  ctaPrimary: z.string(),
  ctaSecondary: z.string(),
  socialProof: z.string(),
  stats: z.array(z.object({
    number: z.string(),
    label: z.string(),
  })).length(3),
  problemHeadline: z.string(),
  problems: z.array(z.object({
    emoji: z.string(),
    title: z.string(),
    desc: z.string(),
  })).length(3),
  solutionHeadline: z.string(),
  features: z.array(z.object({
    icon: z.string(),
    title: z.string(),
    desc: z.string(),
  })).length(3),
  processHeadline: z.string(),
  steps: z.array(z.object({
    title: z.string(),
    desc: z.string(),
  })).length(3),
  testimonialsHeadline: z.string(),
  testimonials: z.array(z.object({
    text: z.string(),
    name: z.string(),
    role: z.string(),
  })).length(3),
  ctaHeadline: z.string(),
  ctaSubtext: z.string(),
  ctaButton: z.string(),
  formHeadline: z.string(),
  formButton: z.string(),
});

function getModelForPlan(plan: string): string {
  const p = plan.toLowerCase().trim();
  if (p === "free") return "claude-haiku-4-5-20251001";
  if (p === "starter") return "claude-sonnet-4-6";
  if (p === "pro" || p === "scale") return "claude-opus-4-6";
  return "claude-sonnet-4-6";
}

type SupabaseAdmin = ReturnType<typeof createClient>;

async function refundCredits(
  supabase: SupabaseAdmin,
  userId: string,
  amount: number,
  action: string,
): Promise<void> {
  await supabase.rpc("deduct_credits", {
    p_user_id: userId,
    p_amount: -amount,
    p_action: `${action}_refund`,
  });
}

type AnthropicContentBlock = {
  type?: string;
  name?: string;
  input?: unknown;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let charged = false;
  let refundSupabase: SupabaseAdmin | null = null;
  let refundUserId: string | undefined;

  try {
    const body = await req.json();

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    let userId: string | undefined;
    let userEmail = "user";
    try {
      const base64Payload = token.split(".")[1];
      if (base64Payload) {
        const b64 = base64Payload.replace(/-/g, "+").replace(/_/g, "/");
        const pad = (4 - (b64.length % 4)) % 4;
        const payload = JSON.parse(atob(b64 + "=".repeat(pad))) as Record<string, unknown>;
        userId = typeof payload.sub === "string" ? payload.sub : undefined;
        userEmail = typeof payload.email === "string" && payload.email.length > 0 ? payload.email : "user";
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
    refundSupabase = supabase;
    refundUserId = userId;

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
    const profileDisplayName =
      typeof prof?.display_name === "string" ? prof.display_name.trim() : "";
    const brandNameLine = isDefaultProjectName
      ? (profileDisplayName.length > 0 ? profileDisplayName : "(not set)")
      : projectName;
    const displayName =
      profileDisplayName || body.businessName || userEmail.split("@")[0];
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
    charged = true;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model: getModelForPlan(prof?.plan ?? ""),
        max_tokens: 6000,
        tools,
        tool_choice: { type: "tool", name: "render_landing" },
        system: [{
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        }],
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!anthropicRes.ok) {
      try {
        await refundCredits(supabase, userId, 10, "generate_landing");
      } catch {
        /* best-effort refund */
      }
      charged = false;
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

    const parsed = await anthropicRes.json() as { content?: AnthropicContentBlock[] };
    const toolBlock = parsed.content?.find((b) => b.type === "tool_use" && b.name === "render_landing");
    if (toolBlock?.input === undefined || toolBlock?.input === null) {
      try {
        await refundCredits(supabase, userId, 10, "generate_landing");
      } catch {
        /* best-effort refund */
      }
      charged = false;
      return new Response(
        JSON.stringify({ error: "Generation failed. Invalid JSON output." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let toolInput: unknown = toolBlock.input;
    if (typeof toolInput === "string") {
      try {
        toolInput = JSON.parse(toolInput);
      } catch {
        try {
          await refundCredits(supabase, userId, 10, "generate_landing");
        } catch {
          /* best-effort refund */
        }
        charged = false;
        return new Response(
          JSON.stringify({ error: "Generation failed. Invalid JSON output." }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const zodResult = renderLandingInputSchema.safeParse(toolInput);
    if (!zodResult.success) {
      try {
        await refundCredits(supabase, userId, 10, "generate_landing");
      } catch {
        /* best-effort refund */
      }
      charged = false;
      return new Response(
        JSON.stringify({ error: "Generation failed. Invalid JSON output." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const jsonContent = zodResult.data as unknown as Record<string, unknown>;

    const emailBase = userEmail
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
      try {
        await refundCredits(supabase, userId, 10, "generate_landing");
      } catch {
        /* best-effort refund */
      }
      charged = false;
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

    charged = false;
    return new Response(JSON.stringify({ slug, success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    if (charged && refundSupabase && refundUserId) {
      try {
        await refundCredits(refundSupabase, refundUserId, 10, "generate_landing");
      } catch {
        /* best-effort refund */
      }
      charged = false;
    }
    return new Response(
      JSON.stringify({ error: "Failed to generate.", details: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
