import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number | string };
    from?: { username?: string };
  };
};

async function sendTelegramReply(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text
      })
    });
  } catch {
    // Always return 200 to Telegram, ignore reply errors.
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TelegramUpdate;
    const text = body.message?.text?.trim() ?? "";
    const chatIdRaw = body.message?.chat?.id;
    const username = body.message?.from?.username?.trim();
    const chatId = chatIdRaw == null ? "" : String(chatIdRaw).trim();

    if (text.startsWith("/start") && chatId) {
      const payload = text.replace(/^\/start\s*/i, "").trim();
      const userId = payload;

      if (userId) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (supabaseUrl && serviceKey) {
          const supabase = createClient(supabaseUrl, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false }
          });
          await supabase
            .from("profiles")
            .update({
              telegram_chat_id: chatId,
              ...(username ? { telegram: `@${username.replace(/^@/, "")}` } : {})
            } as never)
            .eq("user_id", userId);
        }
      }

      await sendTelegramReply(
        chatId,
        "✅ LACORE notifications connected! You'll receive alerts for new leads and won deals."
      );
    }
  } catch {
    // Telegram requires 200 even on malformed updates.
  }

  return NextResponse.json({ ok: true });
}
