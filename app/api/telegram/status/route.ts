import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("profiles")
    .select("telegram_chat_id, telegram")
    .eq("user_id", user.id)
    .maybeSingle();

  const chatId = typeof data?.telegram_chat_id === "string" ? data.telegram_chat_id.trim() : "";
  const username = typeof data?.telegram === "string" ? data.telegram.trim() : "";

  return NextResponse.json({
    connected: /^-?\d+$/.test(chatId),
    ...(chatId ? { chat_id: chatId } : {}),
    ...(username ? { username } : {})
  });
}

export async function DELETE() {
  const supabase = createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ telegram_chat_id: null } as never)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
