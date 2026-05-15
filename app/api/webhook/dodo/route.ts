import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { createServiceSupabase } from "@/lib/supabase/service";
import { addCredits } from "@/lib/credits";
import { PLAN_CREDITS, PRODUCT_TO_PLAN, TOPUP_CREDITS } from "@/lib/dodo-config";

export const dynamic = "force-dynamic";

type DodoPayload = {
  type: string;
  data: {
    payload_type?: string;
    customer?: { customer_id?: string; email?: string };
    product_id?: string;
    subscription_id?: string;
    status?: string;
    metadata?: Record<string, string>;
    next_billing_date?: string;
  };
};

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const rawBody = await req.text();
  const webhookId = req.headers.get("webhook-id") ?? "";
  const webhookSignature = req.headers.get("webhook-signature") ?? "";
  const webhookTimestamp = req.headers.get("webhook-timestamp") ?? "";

  try {
    const wh = new Webhook(webhookSecret);
    await wh.verify(rawBody, {
      "webhook-id": webhookId,
      "webhook-signature": webhookSignature,
      "webhook-timestamp": webhookTimestamp,
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: DodoPayload;
  try {
    payload = JSON.parse(rawBody) as DodoPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServiceSupabase();

  // Deduplicate by webhook-id
  const { error: insertErr } = await supabase
    .from("dodo_events")
    .insert({ event_id: webhookId, event_type: payload.type });
  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("dodo_events insert:", insertErr);
  }

  const customerId = payload.data.customer?.customer_id ?? null;
  const productId = payload.data.product_id ?? null;
  const metadata = payload.data.metadata ?? {};
  const lacoreUserId = metadata.lacore_user_id ?? null;

  async function getUserId(): Promise<string | null> {
    if (lacoreUserId) return lacoreUserId;
    if (!customerId) return null;
    const { data } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("dodo_customer_id", customerId)
      .maybeSingle();
    return (data as { user_id?: string } | null)?.user_id ?? null;
  }

  try {
    switch (payload.type) {
      case "subscription.active": {
        const plan = (productId && PRODUCT_TO_PLAN[productId]) || "starter";
        const credits = PLAN_CREDITS[plan] ?? 100;
        const userId = await getUserId();
        if (userId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("credits_balance")
            .eq("user_id", userId)
            .maybeSingle();
          const currentBalance =
            (profile as { credits_balance?: number } | null)?.credits_balance ?? 0;
          const newBalance = Math.max(currentBalance, credits);
          await supabase
            .from("profiles")
            .update({
              plan,
              subscription_status: "active",
              dodo_customer_id: customerId,
              dodo_subscription_id: payload.data.subscription_id ?? null,
              billing_cycle_end: payload.data.next_billing_date ?? null,
              credits_balance: newBalance,
            } as never)
            .eq("user_id", userId);
        }
        break;
      }

      case "subscription.cancelled":
      case "subscription.expired": {
        const userId = await getUserId();
        if (userId) {
          await supabase
            .from("profiles")
            .update({
              plan: "free",
              subscription_status: "canceled",
              dodo_subscription_id: null,
            } as never)
            .eq("user_id", userId);
        }
        break;
      }

      case "payment.succeeded": {
        if (!productId) break;
        const topup = TOPUP_CREDITS[productId];
        const userId = await getUserId();
        if (!userId) break;

        if (topup != null) {
          // One-time credits topup
          await addCredits(supabase, userId, topup, `topup_${topup}`);
          if (customerId) {
            await supabase
              .from("profiles")
              .update({ dodo_customer_id: customerId } as never)
              .eq("user_id", userId);
          }
        }
        break;
      }

      default:
        break;
    }
  } catch (e) {
    console.error("dodo webhook handler:", e);
  }

  return NextResponse.json({ received: true });
}
