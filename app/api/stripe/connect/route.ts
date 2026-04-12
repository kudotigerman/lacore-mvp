import { NextRequest, NextResponse } from "next/server";
import { requireUser, serviceSupabase } from "../../domains/_auth";

type StripePriceResponse = {
  id?: string;
  nickname?: string | null;
  currency?: string;
  unit_amount?: number | null;
  unit_amount_decimal?: string | null;
  error?: { message?: string };
};

function formatAmount(currency: string, unitAmount: number | null | undefined): string {
  if (unitAmount == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase()
    }).format(unitAmount / 100);
  } catch {
    return `${(unitAmount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

export async function POST(req: NextRequest) {
  const token = await requireUser(req);
  if (!token.ok) return token.response;

  let body: {
    publishable_key?: string;
    secret_key?: string;
    price_id?: string;
    payment_type?: string;
    button_text?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const publishableKey = typeof body.publishable_key === "string" ? body.publishable_key.trim() : "";
  let secretKey = typeof body.secret_key === "string" ? body.secret_key.trim() : "";
  const priceId = typeof body.price_id === "string" ? body.price_id.trim() : "";
  const paymentType = body.payment_type === "subscription" ? "subscription" : "one_time";
  const buttonTextRaw = typeof body.button_text === "string" ? body.button_text.trim() : "";
  const buttonText = buttonTextRaw || "Book Now";

  if (!publishableKey || !priceId) {
    return NextResponse.json({ error: "Missing publishable_key or price_id." }, { status: 400 });
  }
  if (!publishableKey.startsWith("pk_")) {
    return NextResponse.json({ error: "Invalid publishable key (expected pk_…)." }, { status: 400 });
  }
  if (!priceId.startsWith("price_")) {
    return NextResponse.json({ error: "Invalid price id (expected price_…)." }, { status: 400 });
  }

  const service = serviceSupabase();
  if (!service) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  if (!secretKey) {
    const { data: existing } = await service
      .from("stripe_settings")
      .select("secret_key")
      .eq("user_id", token.user.id)
      .maybeSingle();
    const sk = (existing as { secret_key?: string | null } | null)?.secret_key?.trim() ?? "";
    if (sk.startsWith("sk_")) secretKey = sk;
  }

  if (!secretKey || !secretKey.startsWith("sk_")) {
    return NextResponse.json({ error: "Secret key is required (or reconnect with sk_…)." }, { status: 400 });
  }

  const priceUrl = new URL(`https://api.stripe.com/v1/prices/${encodeURIComponent(priceId)}`);
  priceUrl.searchParams.append("expand[]", "product");
  const priceRes = await fetch(priceUrl.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${secretKey}` }
  });

  const priceJson = (await priceRes.json()) as StripePriceResponse & {
    product?: string | { name?: string };
  };

  if (!priceRes.ok || priceJson.error) {
    return NextResponse.json(
      { error: priceJson.error?.message || "Could not validate price with Stripe." },
      { status: 400 }
    );
  }

  const currency = typeof priceJson.currency === "string" ? priceJson.currency : "usd";
  const unitAmount = typeof priceJson.unit_amount === "number" ? priceJson.unit_amount : null;
  const product = priceJson.product;
  const productName =
    typeof product === "object" && product !== null && typeof product.name === "string"
      ? product.name
      : null;
  const priceName =
    (typeof priceJson.nickname === "string" && priceJson.nickname.trim()) || productName || priceId;
  const amount = formatAmount(currency, unitAmount);

  const { error } = await service.from("stripe_settings").upsert(
    {
      user_id: token.user.id,
      publishable_key: publishableKey,
      secret_key: secretKey,
      price_id: priceId,
      payment_type: paymentType,
      button_text: buttonText,
      connected_at: new Date().toISOString()
    } as never,
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    price_name: priceName,
    currency: currency.toUpperCase(),
    amount
  });
}
