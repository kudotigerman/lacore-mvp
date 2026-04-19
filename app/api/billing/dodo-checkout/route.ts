import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { productId?: string };
  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  if (!productId) {
    return NextResponse.json({ error: "Missing productId" }, { status: 400 });
  }

  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Dodo not configured" }, { status: 500 });
  }

  const returnUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.lacore.ai"}/dashboard`;

  try {
    const environment = process.env.DODO_PAYMENTS_ENVIRONMENT ?? "live_mode";
    const baseUrl = environment === "test_mode"
      ? "https://test.dodopayments.com"
      : "https://live.dodopayments.com";

    const res = await fetch(`${baseUrl}/checkouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        product_cart: [{ product_id: productId, quantity: 1 }],
        customer: { email: user.email },
        return_url: returnUrl,
        metadata: { lacore_user_id: user.id },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Dodo API error:", res.status, err);
      return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
    }

    const data = await res.json() as { checkout_url?: string; payment_link?: string; url?: string };
    const url = data.checkout_url ?? data.payment_link ?? data.url;
    if (!url) {
      return NextResponse.json({ error: "No checkout URL returned" }, { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (e) {
    console.error("Dodo checkout error:", e);
    return NextResponse.json({ error: "Checkout error" }, { status: 500 });
  }
}
