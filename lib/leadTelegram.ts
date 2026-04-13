import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const TELEGRAM_OPEN_LEADS_URL = "https://www.lacore.ai/dashboard/leads";

function escapeTelegramHtml(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getServiceClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function resolveTelegramChatId(client: SupabaseClient, userId: string): Promise<string> {
  const { data } = await client
    .from("profiles")
    .select("telegram_chat_id")
    .eq("user_id", userId)
    .maybeSingle();

  const raw = typeof data?.telegram_chat_id === "string" ? data.telegram_chat_id.trim() : "";
  return /^-?\d+$/.test(raw) ? raw : "";
}

async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "Open in LACORE", url: TELEGRAM_OPEN_LEADS_URL }]]
      }
    })
  });

  return res.ok;
}

export async function sendNewLeadTelegramNotification(input: {
  userId: string;
  name?: string | null;
  email: string;
  phone?: string | null;
  message?: string | null;
  slug: string;
}): Promise<boolean> {
  try {
    const client = getServiceClient();
    if (!client) return false;

    const chatId = await resolveTelegramChatId(client, input.userId);
    if (!chatId) return false;

    const name = escapeTelegramHtml((input.name || "Unknown").trim() || "Unknown");
    const email = escapeTelegramHtml(input.email.trim());
    const phone = escapeTelegramHtml((input.phone || "").trim());
    const message = escapeTelegramHtml((input.message || "").trim() || "No message");
    const slug = escapeTelegramHtml(input.slug.trim());

    const text = [
      `🔥 <b>New lead: ${name}</b>`,
      `📧 ${email}`,
      phone ? `📱 ${phone}` : "",
      `💬 "${message}"`,
      `🌐 From: ${slug} 👉 Open LACORE → leads`
    ]
      .filter(Boolean)
      .join("\n");

    return sendTelegramMessage(chatId, text);
  } catch (error) {
    console.error("sendNewLeadTelegramNotification:", error);
    return false;
  }
}

export async function sendWonDealTelegramNotification(input: {
  userId: string;
  name?: string | null;
  dealValue?: number | null;
}): Promise<boolean> {
  try {
    const client = getServiceClient();
    if (!client) return false;

    const chatId = await resolveTelegramChatId(client, input.userId);
    if (!chatId) return false;

    const name = escapeTelegramHtml((input.name || "Unknown").trim() || "Unknown");
    const hasDealValue = typeof input.dealValue === "number" && Number.isFinite(input.dealValue);
    const dealValueText = hasDealValue ? `$${input.dealValue!.toLocaleString("en-US")}` : "—";
    const text = `🎉 <b>Deal Won: ${name}</b>\n💰 Value: ${escapeTelegramHtml(dealValueText)}`;

    return sendTelegramMessage(chatId, text);
  } catch (error) {
    console.error("sendWonDealTelegramNotification:", error);
    return false;
  }
}

export async function sendTestTelegramNotification(input: {
  userId: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = getServiceClient();
    if (!client) {
      return { ok: false, error: "Server configuration error." };
    }
    const chatId = await resolveTelegramChatId(client, input.userId);
    if (!chatId) {
      return { ok: false, error: "No Telegram chat ID saved in your profile." };
    }
    const sent = await sendTelegramMessage(
      chatId,
      "✅ <b>Telegram test notification</b>\nYour LACORE Telegram setup is working."
    );
    return sent ? { ok: true } : { ok: false, error: "Telegram API request failed." };
  } catch {
    return { ok: false, error: "Failed to send test notification." };
  }
}
