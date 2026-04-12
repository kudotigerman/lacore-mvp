import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const {
    data: { user },
    error: userError
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: row } = await admin
    .from("stripe_settings")
    .select("publishable_key, price_id, button_text, secret_key")
    .eq("user_id", user.id)
    .maybeSingle();

  const r = row as {
    publishable_key: string | null;
    price_id: string | null;
    button_text: string | null;
    secret_key: string | null;
  } | null;

  if (!r) {
    return NextResponse.json({ connected: false });
  }

  const connected = Boolean(
    r.publishable_key?.startsWith("pk_") && r.price_id?.trim() && r.secret_key?.startsWith("sk_")
  );

  const button_text = r.button_text?.trim() || undefined;

  return NextResponse.json(
    connected ? { connected: true, ...(button_text ? { button_text } : {}) } : { connected: false }
  );
}
