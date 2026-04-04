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
    .select("publishable_key, price_id, payment_type, button_text, secret_key")
    .eq("user_id", user.id)
    .maybeSingle();

  const r = row as {
    publishable_key: string;
    price_id: string | null;
    payment_type: string | null;
    button_text: string | null;
    secret_key: string | null;
  } | null;

  if (!r) {
    return NextResponse.json({
      connected: false,
      publishable_key: "",
      price_id: "",
      payment_type: "one_time" as const,
      button_text: "Buy Now",
      hasSecretKey: false
    });
  }

  return NextResponse.json({
    connected: true,
    publishable_key: r.publishable_key,
    price_id: r.price_id ?? "",
    payment_type: r.payment_type === "subscription" ? "subscription" : "one_time",
    button_text: r.button_text?.trim() || "Buy Now",
    hasSecretKey: Boolean(r.secret_key?.startsWith("sk_"))
  });
}
