import { NextRequest, NextResponse } from "next/server";
import {
  Environment,
  EventName,
  Paddle,
  type SubscriptionNotification,
  type TransactionNotification
} from "@paddle/paddle-node-sdk";
import { createServiceSupabase } from "@/lib/supabase/service";
import { addCredits } from "@/lib/credits";
import { PLAN_CREDITS, PRICE_TO_PLAN, TOPUP_CREDITS } from "@/lib/paddle-config";

export const dynamic = "force-dynamic";

function lacoreUserIdFromCustomData(custom: unknown): string | null {
  if (!custom || typeof custom !== "object") return null;
  const o = custom as Record<string, unknown>;
  const v = o.lacore_user_id;
  return typeof v === "string" && v.length > 0 ? v : null;
}

function priceIdFromSubscription(sub: SubscriptionNotification): string | undefined {
  const id = sub.items[0]?.price?.id;
  return typeof id === "string" ? id : undefined;
}

function priceIdFromTransaction(tx: TransactionNotification): string | undefined {
  const id = tx.items[0]?.price?.id;
  return typeof id === "string" ? id : undefined;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.PADDLE_API_KEY;
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!apiKey || !secret) {
    return NextResponse.json({ error: "Paddle not configured." }, { status: 500 });
  }

  const signature = req.headers.get("paddle-signature") ?? "";
  const rawBody = await req.text();

  const paddle = new Paddle(apiKey, {
    environment: process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? Environment.production : Environment.sandbox
  });

  let event: Awaited<ReturnType<Paddle["webhooks"]["unmarshal"]>>;
  try {
    event = await paddle.webhooks.unmarshal(rawBody, secret, signature);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const supabase = createServiceSupabase();

  const { error: insertErr } = await supabase.from("paddle_events").insert({
    event_id: event.eventId,
    event_type: String(event.eventType)
  });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("paddle_events insert:", insertErr);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  async function getUserIdByCustomer(customerId: string): Promise<string | null> {
    const { data } = await supabase.from("profiles").select("user_id").eq("paddle_customer_id", customerId).maybeSingle();
    return (data as { user_id?: string } | null)?.user_id ?? null;
  }

  try {
    switch (event.eventType) {
      case EventName.SubscriptionActivated: {
        const sub = event.data as SubscriptionNotification;
        const priceId = priceIdFromSubscription(sub);
        const plan = (priceId && PRICE_TO_PLAN[priceId]) || "starter";
        const credits = PLAN_CREDITS[plan] ?? 100;
        const fromCustom = lacoreUserIdFromCustomData(sub.customData);
        let userId = fromCustom ?? (await getUserIdByCustomer(sub.customerId));

        if (userId) {
          await supabase
            .from("profiles")
            .update({
              plan,
              subscription_status: "active",
              paddle_customer_id: sub.customerId,
              paddle_subscription_id: sub.id,
              billing_cycle_end: sub.currentBillingPeriod?.endsAt ?? null,
              credits_balance: credits
            } as never)
            .eq("user_id", userId);
        }
        break;
      }

      case EventName.SubscriptionUpdated: {
        const sub = event.data as SubscriptionNotification;
        const priceId = priceIdFromSubscription(sub);
        const plan = (priceId && PRICE_TO_PLAN[priceId]) || "starter";
        const userId = await getUserIdByCustomer(sub.customerId);
        if (userId) {
          await supabase
            .from("profiles")
            .update({
              plan,
              subscription_status: String(sub.status),
              billing_cycle_end: sub.currentBillingPeriod?.endsAt ?? null,
              paddle_subscription_id: sub.id
            } as never)
            .eq("user_id", userId);
        }
        break;
      }

      case EventName.SubscriptionCanceled: {
        const sub = event.data as SubscriptionNotification;
        const userId = await getUserIdByCustomer(sub.customerId);
        if (userId) {
          await supabase
            .from("profiles")
            .update({
              plan: "free",
              subscription_status: "canceled",
              paddle_subscription_id: null
            } as never)
            .eq("user_id", userId);
        }
        break;
      }

      case EventName.SubscriptionPastDue: {
        const sub = event.data as SubscriptionNotification;
        const userId = await getUserIdByCustomer(sub.customerId);
        if (userId) {
          await supabase.from("profiles").update({ subscription_status: "past_due" } as never).eq("user_id", userId);
        }
        break;
      }

      case EventName.TransactionCompleted: {
        const tx = event.data as TransactionNotification;
        const priceId = priceIdFromTransaction(tx);
        if (!priceId || !tx.customerId) break;

        const topup = TOPUP_CREDITS[priceId];
        let userId = lacoreUserIdFromCustomData(tx.customData) ?? (await getUserIdByCustomer(tx.customerId));

        if (topup != null && userId) {
          await addCredits(supabase, userId, topup, `topup_${topup}`);
          if (tx.customerId) {
            await supabase.from("profiles").update({ paddle_customer_id: tx.customerId } as never).eq("user_id", userId);
          }
        } else if (PRICE_TO_PLAN[priceId] && userId) {
          const plan = PRICE_TO_PLAN[priceId];
          const grant = PLAN_CREDITS[plan] ?? 100;
          await supabase
            .from("profiles")
            .update({
              credits_balance: grant,
              billing_cycle_end: tx.billingPeriod?.endsAt ?? null,
              paddle_customer_id: tx.customerId
            } as never)
            .eq("user_id", userId);
        }
        break;
      }

      default:
        break;
    }
  } catch (e) {
    console.error("paddle webhook handler:", e);
  }

  return NextResponse.json({ received: true });
}
