import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
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

  let body: {
    publishableKey?: string;
    priceId?: string;
    secretKey?: string | null;
    paymentType?: string;
    buttonText?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const publishableKey = typeof body.publishableKey === "string" ? body.publishableKey.trim() : "";
  if (!publishableKey) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!publishableKey.startsWith("pk_")) {
    return NextResponse.json({ error: "Invalid Stripe Publishable Key" }, { status: 400 });
  }

  const secretKey =
    typeof body.secretKey === "string" && body.secretKey.trim().length > 0 ? body.secretKey.trim() : null;
  if (secretKey && !secretKey.startsWith("sk_")) {
    return NextResponse.json({ error: "Invalid Stripe Secret Key" }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: existing } = await admin
    .from("stripe_settings")
    .select("secret_key")
    .eq("user_id", user.id)
    .maybeSingle();

  const existingRow = existing as { secret_key: string | null } | null;
  const secretToStore = secretKey ?? existingRow?.secret_key ?? null;

  const { error } = await admin.from("stripe_settings").upsert(
    {
      user_id: user.id,
      publishable_key: publishableKey,
      secret_key: secretToStore,
      price_id: typeof body.priceId === "string" && body.priceId.trim() ? body.priceId.trim() : null,
      payment_type: body.paymentType === "subscription" ? "subscription" : "one_time",
      button_text:
        typeof body.buttonText === "string" && body.buttonText.trim()
          ? body.buttonText.trim()
          : "Buy Now"
    } as never,
    { onConflict: "user_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
