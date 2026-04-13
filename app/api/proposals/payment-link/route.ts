import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type StripePaymentLinkResponse = {
  url?: string;
  error?: { message?: string };
};

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  let body: { proposal_id?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const proposalId = typeof body.proposal_id === "string" ? body.proposal_id.trim() : "";
  if (!proposalId) return NextResponse.json({ error: "proposal_id is required." }, { status: 400 });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: proposal, error: proposalErr } = await supabase
    .from("proposals")
    .select("id, user_id, client_name, lead_id, is_public, signed_at")
    .eq("id", proposalId)
    .maybeSingle();
  if (proposalErr) return NextResponse.json({ error: proposalErr.message }, { status: 500 });
  if (!proposal) return NextResponse.json({ error: "Proposal not found." }, { status: 404 });

  const row = proposal as {
    id: string;
    user_id: string;
    client_name: string;
    lead_id?: string | null;
    is_public?: boolean | null;
    signed_at?: string | null;
  };
  if (row.is_public === false) return NextResponse.json({ error: "Proposal is not public." }, { status: 403 });
  if (!row.signed_at) return NextResponse.json({ error: "Proposal must be signed first." }, { status: 400 });
  if (!row.lead_id) return NextResponse.json({ error: "No lead linked to proposal." }, { status: 400 });

  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("deal_value")
    .eq("id", row.lead_id)
    .eq("user_id", row.user_id)
    .maybeSingle();
  if (leadErr) return NextResponse.json({ error: leadErr.message }, { status: 500 });
  const dealValue = typeof (lead as { deal_value?: number | null } | null)?.deal_value === "number"
    ? (lead as { deal_value: number }).deal_value
    : null;
  if (!dealValue || dealValue <= 0) {
    return NextResponse.json({ error: "Deal value is not set." }, { status: 400 });
  }

  const { data: stripeSettings } = await supabase
    .from("stripe_settings")
    .select("publishable_key, secret_key")
    .eq("user_id", row.user_id)
    .maybeSingle();
  const settings = stripeSettings as { publishable_key?: string | null; secret_key?: string | null } | null;
  if (!settings?.publishable_key?.startsWith("pk_") || !settings.secret_key?.startsWith("sk_")) {
    return NextResponse.json({ error: "Stripe not connected for this proposal owner." }, { status: 400 });
  }

  const amountCents = Math.round(dealValue * 100);
  const form = new URLSearchParams();
  form.set("line_items[0][price_data][currency]", "usd");
  form.set("line_items[0][price_data][unit_amount]", String(amountCents));
  form.set("line_items[0][price_data][product_data][name]", `Proposal payment: ${row.client_name}`);
  form.set("line_items[0][quantity]", "1");

  const stripeRes = await fetch("https://api.stripe.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.secret_key}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: form
  });
  const stripeJson = (await stripeRes.json()) as StripePaymentLinkResponse;
  if (!stripeRes.ok || !stripeJson.url) {
    return NextResponse.json(
      { error: stripeJson.error?.message || "Could not create Stripe payment link." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    payment_link: stripeJson.url,
    amount: dealValue
  });
}
