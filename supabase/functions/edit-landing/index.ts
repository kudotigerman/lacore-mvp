import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const systemPrompt =
  "You are editing an HTML landing page. Return the COMPLETE updated HTML document starting with <!DOCTYPE html>. Make ONLY the requested change. No markdown, no backticks.";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json() as {
      slug?: string;
      instruction?: string;
      currentHtml?: string;
    };

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

    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const instruction = typeof body.instruction === "string"
      ? body.instruction.trim()
      : "";
    const currentHtml = typeof body.currentHtml === "string"
      ? body.currentHtml.trim()
      : "";

    if (!slug || !instruction || !currentHtml) {
      return new Response(
        JSON.stringify({ error: "Missing required fields." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row, error: rowError } = await supabase
      .from("landing_pages")
      .select("user_id")
      .eq("slug", slug)
      .maybeSingle();

    if (rowError || !row || row.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized or page not found." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userMessage = `Here is the current page:
${currentHtml}

Make this change: ${instruction}

Return the complete updated HTML.`;

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
        JSON.stringify({ error: "Invalid HTML returned from Claude." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { error: saveError } = await supabase
      .from("landing_pages")
      .update({ html_content: html })
      .eq("slug", slug)
      .eq("user_id", userId);

    if (saveError) {
      return new Response(
        JSON.stringify({
          error: "Failed to save edited page.",
          details: saveError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ success: true, html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to edit.", details: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
