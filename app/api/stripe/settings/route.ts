import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "No slug" }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ stripe: null });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: landing } = await supabase.from("landing_pages").select("user_id").eq("slug", slug).maybeSingle();

  if (!landing?.user_id) return NextResponse.json({ stripe: null });

  const { data: stripe } = await supabase
    .from("stripe_settings")
    .select("publishable_key, price_id, payment_type, button_text, secret_key")
    .eq("user_id", landing.user_id)
    .maybeSingle();

  const row = stripe as {
    publishable_key: string;
    price_id: string | null;
    payment_type: string | null;
    button_text: string | null;
    secret_key: string | null;
  } | null;

  if (!row) return NextResponse.json({ stripe: null });

  const checkoutReady = Boolean(
    row.publishable_key?.startsWith("pk_") && row.price_id?.trim() && row.secret_key?.startsWith("sk_")
  );

  return NextResponse.json({
    stripe: {
      publishable_key: row.publishable_key,
      price_id: row.price_id,
      payment_type: row.payment_type || "one_time",
      button_text: row.button_text || "Buy Now",
      checkout_ready: checkoutReady
    }
  });
}
