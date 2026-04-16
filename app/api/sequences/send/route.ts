import { NextResponse } from "next/server";
import { createClient as createSupabaseJsClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import type { SequenceMessage } from "@/types/dashboard-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function applyPlaceholders(content: string, recipientName: string | undefined, yourName: string) {
  const rn = recipientName?.trim() ? recipientName.trim() : "there";
  const yn = yourName.trim() ? yourName.trim() : "LACORE user";
  return content
    .replace(/\[Name\]/gi, rn)
    .replace(/\[Your name\]/gi, yn);
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function isSequenceMessage(value: unknown): value is SequenceMessage {
  if (!value || typeof value !== "object") return false;
  return (
    typeof (value as SequenceMessage).timing === "string" &&
    typeof (value as SequenceMessage).content === "string" &&
    ((value as SequenceMessage).subject === null || typeof (value as SequenceMessage).subject === "string")
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message?: SequenceMessage;
      recipientEmail?: string;
      recipientName?: string;
      projectId?: string;
      channel?: string;
      goal?: string;
      leadName?: string;
      leadContext?: string;
    };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const authHeader = request.headers.get("authorization");

    const supabase = createClient();
    let supabaseForDb: SupabaseClient = supabase as SupabaseClient;
    let {
      data: { user },
      error: authErr
    } = await supabase.auth.getUser();

    if ((!user || authErr) && authHeader?.startsWith("Bearer ") && supabaseUrl && supabaseAnonKey) {
      const bearerClient = createSupabaseJsClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const r = await bearerClient.auth.getUser();
      if (!r.error && r.data.user) {
        user = r.data.user;
        authErr = null;
        supabaseForDb = bearerClient;
      }
    }

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channel = typeof body.channel === "string" ? body.channel.trim() : "";
    if (channel !== "email") {
      return NextResponse.json({ error: "Only email sequences can be sent from here." }, { status: 400 });
    }

    const message = body.message;
    if (!isSequenceMessage(message)) {
      return NextResponse.json({ error: "Valid message is required." }, { status: 400 });
    }

    const projectId = typeof body.projectId === "string" ? body.projectId.trim() : "";
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required." }, { status: 400 });
    }

    const { data: projectRow, error: projErr } = await supabaseForDb
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (projErr || !projectRow) {
      return NextResponse.json({ error: "Project not found." }, { status: 403 });
    }

    const recipientEmail = typeof body.recipientEmail === "string" ? body.recipientEmail.trim() : "";
    if (!recipientEmail || !isValidEmail(recipientEmail)) {
      return NextResponse.json({ error: "Valid recipient email is required." }, { status: 400 });
    }

    const recipientName =
      typeof body.recipientName === "string" && body.recipientName.trim().length > 0
        ? body.recipientName.trim()
        : undefined;

    const { data: profile } = await supabaseForDb
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle();
    const displayName =
      (typeof (profile as { display_name?: string | null } | null)?.display_name === "string" &&
        (profile as { display_name: string }).display_name.trim()) ||
      "LACORE user";

    const subjectRaw = message.subject?.trim() || "Message from LACORE";
    const bodyText = applyPlaceholders(message.content, recipientName, displayName);
    const subject = applyPlaceholders(subjectRaw, recipientName, displayName);

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: "Email sending is not configured." }, { status: 500 });
    }

    const htmlBody = escapeHtml(bodyText).replace(/\r\n|\n|\r/g, "<br/>");

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "LACORE <noreply@lacore.ai>",
        to: [recipientEmail],
        subject,
        html: `<div style="font-family:sans-serif;max-width:640px;margin:0 auto;line-height:1.6;color:#111">${htmlBody}</div>`
      })
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text().catch(() => "");
      console.error("Resend sequence send:", resendRes.status, errText);
      return NextResponse.json({ error: "Failed to send email." }, { status: 502 });
    }

    const goal = typeof body.goal === "string" ? body.goal.trim() : "";
    const leadName = typeof body.leadName === "string" ? body.leadName.trim() : "";
    const leadContext = typeof body.leadContext === "string" ? body.leadContext.trim() : "";
    const lastSequenceSend = {
      sentAt: new Date().toISOString(),
      recipientEmail,
      recipientName: recipientName ?? null,
      messagesSent: 1,
      totalMessages: 1
    };

    const sequenceInput: Record<string, unknown> = {
      channel: "email",
      goal,
      ...(leadName ? { leadName } : {}),
      ...(leadContext ? { leadContext } : {})
    };

    const { error: saveErr } = await supabaseForDb.from("saved_results").upsert(
      {
        user_id: user.id,
        project_id: projectId,
        type: "sequence",
        input: sequenceInput,
        result: { messages: [message], lastSequenceSend },
        updated_at: new Date().toISOString()
      } as never,
      { onConflict: "user_id,project_id,type" }
    );

    if (saveErr) {
      console.error("saved_results sequence send:", saveErr.message);
    }

    return NextResponse.json({
      success: true,
      messagesSent: 1,
      totalMessages: 1
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
