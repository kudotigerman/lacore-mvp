import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type StripePaymentLinkResponse = {
  url?: string;
  error?: { message?: string };
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const {
    data: { user },
    error: userErr
  } = await supabase.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { lead_id?: string; amount?: number; description?: string; send_email?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const leadId = typeof body.lead_id === "string" ? body.lead_id.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const amount = typeof body.amount === "number" ? body.amount : Number.NaN;
  const sendEmail = body.send_email === true;
  if (!leadId || !description || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "lead_id, amount, and description are required." }, { status: 400 });
  }

  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("id, user_id, email")
    .eq("id", leadId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (leadErr || !lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  const { data: stripeSettings } = await supabase
    .from("stripe_settings")
    .select("publishable_key, secret_key")
    .eq("user_id", user.id)
    .maybeSingle();

  const settings = stripeSettings as { publishable_key?: string | null; secret_key?: string | null } | null;
  if (!settings?.publishable_key?.startsWith("pk_") || !settings.secret_key?.startsWith("sk_")) {
    return NextResponse.json(
      { error: "Connect Stripe first", redirect: "/dashboard/settings#stripe" },
      { status: 400 }
    );
  }

  const amountCents = Math.round(amount * 100);
  const form = new URLSearchParams();
  form.set("line_items[0][price_data][currency]", "usd");
  form.set("line_items[0][price_data][unit_amount]", String(amountCents));
  form.set("line_items[0][price_data][product_data][name]", description);
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

  const invoiceSentAt = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("leads")
    .update({ payment_link: stripeJson.url, invoice_sent_at: invoiceSentAt } as never)
    .eq("id", leadId)
    .eq("user_id", user.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  if (sendEmail) {
    const leadEmail = (lead as { email?: string | null }).email?.trim() ?? "";
    const resendKey = process.env.RESEND_API_KEY;
    if (leadEmail && resendKey) {
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
      const displayName =
        (typeof (profile as { display_name?: string | null } | null)?.display_name === "string" &&
          (profile as { display_name: string }).display_name.trim()) ||
        "LACORE user";
      const safeName = escapeHtml(displayName);
      const safeDescription = escapeHtml(description);
      const safeAmount = `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "LACORE <leads@lacore.ai>",
          to: [leadEmail],
          subject: `Invoice from ${displayName}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
              <h2>Invoice from ${safeName}</h2>
              <p><strong>Amount:</strong> ${safeAmount}</p>
              <p><strong>Description:</strong> ${safeDescription}</p>
              <p style="margin-top:24px;">
                <a href="${stripeJson.url}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;">
                  Pay Now →
                </a>
              </p>
            </div>
          `
        })
      });
    }
  }

  return NextResponse.json({ success: true, payment_link: stripeJson.url });
}
