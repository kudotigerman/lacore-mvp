import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  let slug: string;
  let customerEmail: string | undefined;
  try {
    const body = (await req.json()) as { slug?: string; customer_email?: string };
    slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const em = typeof body.customer_email === "string" ? body.customer_email.trim() : "";
    customerEmail = em.length > 0 ? em : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!slug) return NextResponse.json({ error: "Missing slug." }, { status: 400 });

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: landing } = await supabase.from("landing_pages").select("user_id").eq("slug", slug).maybeSingle();
  if (!landing?.user_id) {
    return NextResponse.json({ error: "Landing not found." }, { status: 404 });
  }

  const { data: settings } = await supabase
    .from("stripe_settings")
    .select("secret_key, price_id, payment_type")
    .eq("user_id", landing.user_id)
    .maybeSingle();

  const row = settings as {
    secret_key: string | null;
    price_id: string | null;
    payment_type: string | null;
  } | null;

  if (!row?.secret_key?.startsWith("sk_") || !row.price_id?.trim()) {
    return NextResponse.json({ error: "Stripe checkout is not configured." }, { status: 400 });
  }

  const origin =
    req.headers.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "https://www.lacore.ai";

  const basePath = `/p/${slug}`;
  const successUrl = `${origin}${basePath}?success=true`;
  const cancelUrl = `${origin}${basePath}`;

  try {
    const stripe = new Stripe(row.secret_key);
    const session = await stripe.checkout.sessions.create({
      mode: row.payment_type === "subscription" ? "subscription" : "payment",
      line_items: [{ price: row.price_id.trim(), quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail
    });

    const checkoutUrl = session.url;
    if (!checkoutUrl) {
      return NextResponse.json({ error: "Checkout session has no URL." }, { status: 502 });
    }

    return NextResponse.json({ checkout_url: checkoutUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
