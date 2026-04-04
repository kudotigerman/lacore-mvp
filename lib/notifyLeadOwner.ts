import { createClient } from "@supabase/supabase-js";

export type LeadNotifyInput = {
  userId: string;
  name: string;
  email: string;
  message: string;
  slug: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeTelegramHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendOwnerEmail(
  ownerEmail: string,
  name: string,
  leadEmail: string,
  message: string,
  slug: string
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  const safeName = escapeHtml(name || "Lead");
  const safeLeadEmail = escapeHtml(leadEmail);
  const safeMessage = escapeHtml(message || "No message");
  const safeSlug = escapeHtml(slug);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "LACORE <leads@lacore.ai>",
      to: [ownerEmail],
      subject: `New lead from ${name || "someone"} — ${slug}`,
      html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #06B6D4;">New Lead on LACORE</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> <a href="mailto:${encodeURIComponent(leadEmail)}">${safeLeadEmail}</a></p>
        <p><strong>Message:</strong> ${safeMessage}</p>
        <p><strong>Landing page:</strong> ${safeSlug}</p>
        <p><strong>Time:</strong> ${escapeHtml(new Date().toLocaleString())}</p>
        <hr />
        <p style="color: #888; font-size: 12px;">Sent by LACORE — lacore.ai</p>
      </div>
    `
    })
  });

  return res.ok;
}

async function sendTelegramNotify(
  chatId: string,
  name: string,
  leadEmail: string,
  message: string,
  slug: string
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  const n = escapeTelegramHtml(name || "—");
  const e = escapeTelegramHtml(leadEmail);
  const m = escapeTelegramHtml(message || "No message");
  const s = escapeTelegramHtml(slug);

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `🔔 <b>New Lead!</b>\n\n👤 ${n}\n📧 ${e}\n💬 ${m}\n🔗 ${s}\n\n⚡ Sent via LACORE`,
      parse_mode: "HTML"
    })
  });

  return res.ok;
}

export async function runLeadNotifications(input: LeadNotifyInput): Promise<{
  emailSent: boolean;
  telegramSent: boolean;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { emailSent: false, telegramSent: false };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: adminUser, error: adminErr } = await supabase.auth.admin.getUserById(input.userId);
  const ownerEmail = adminUser?.user?.email?.trim() ?? "";

  const { data: profile } = await supabase
    .from("profiles")
    .select("email_notifications, telegram_chat_id, telegram")
    .eq("user_id", input.userId)
    .maybeSingle();

  const row = profile as {
    email_notifications?: boolean | null;
    telegram_chat_id?: string | null;
    telegram?: string | null;
  } | null;

  const emailOn = row?.email_notifications !== false;

  const rawChat =
    (typeof row?.telegram_chat_id === "string" && row.telegram_chat_id.trim()) ||
    (typeof row?.telegram === "string" && row.telegram.trim()) ||
    "";
  const telegramChatId = /^-?\d+$/.test(rawChat) ? rawChat : "";

  const emailTask = async (): Promise<boolean> => {
    if (!emailOn || !ownerEmail) return false;
    return sendOwnerEmail(ownerEmail, input.name, input.email, input.message, input.slug);
  };

  const telegramTask = async (): Promise<boolean> => {
    if (!telegramChatId) return false;
    return sendTelegramNotify(telegramChatId, input.name, input.email, input.message, input.slug);
  };

  const [emailSettled, telegramSettled] = await Promise.allSettled([emailTask(), telegramTask()]);

  if (adminErr) {
    console.error("notifyLeadOwner: admin getUser", adminErr.message);
  }

  return {
    emailSent: emailSettled.status === "fulfilled" && emailSettled.value,
    telegramSent: telegramSettled.status === "fulfilled" && telegramSettled.value
  };
}
