"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getPaddleInstance, initializePaddle } from "@paddle/paddle-js";
import { createClient } from "@/lib/supabase/client";
import { PADDLE_PRICE_IDS, TOPUP_CREDITS } from "@/lib/paddle-config";
import type { User } from "@supabase/supabase-js";

type Cycle = "monthly" | "annual";

const PLANS: {
  key: string;
  name: string;
  blurb: string;
  monthly: number;
  annual: number;
  credits: number;
  features: string[];
  featured?: boolean;
  free?: boolean;
}[] = [
  {
    key: "free",
    name: "Free",
    blurb: "Try the full flow on us.",
    monthly: 0,
    annual: 0,
    credits: 20,
    free: true,
    features: ["20 credits (one-time)", "1 project", "1 landing generation (plan limit)", "AI offer + landing", "5 posts / month cap"]
  },
  {
    key: "starter",
    name: "Starter",
    blurb: "Serious freelancers getting consistent leads.",
    monthly: 29,
    annual: 22,
    credits: 100,
    features: ["100 credits / month", "1 project", "Unlimited landing iterations (fair use)", "Content machine", "Closing scripts"]
  },
  {
    key: "pro",
    name: "Pro",
    blurb: "Most popular for consultants & coaches.",
    monthly: 49,
    annual: 37,
    credits: 300,
    featured: true,
    features: ["300 credits / month", "Up to 5 projects", "Custom domain", "Everything in Starter", "Priority workflows"]
  },
  {
    key: "scale",
    name: "Scale",
    blurb: "Agencies and power sellers.",
    monthly: 99,
    annual: 74,
    credits: 1000,
    features: ["1,000 credits / month", "Unlimited projects", "White-glove limits", "Full stack", "Best for teams"]
  }
];

function priceIdForPlan(planKey: string, cycle: Cycle): string | null {
  if (planKey === "starter") return cycle === "monthly" ? PADDLE_PRICE_IDS.starter_monthly : PADDLE_PRICE_IDS.starter_annual;
  if (planKey === "pro") return cycle === "monthly" ? PADDLE_PRICE_IDS.pro_monthly : PADDLE_PRICE_IDS.pro_annual;
  if (planKey === "scale") return cycle === "monthly" ? PADDLE_PRICE_IDS.scale_monthly : PADDLE_PRICE_IDS.scale_annual;
  return null;
}

export function HomePricingSection() {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [user, setUser] = useState<User | null>(null);
  const [paddleReady, setPaddleReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) return;
    void initializePaddle({
      environment: process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox",
      token
    }).then(() => setPaddleReady(true));
  }, []);

  const openCheckout = useCallback(
    async (priceId: string) => {
      const paddle = paddleReady ? getPaddleInstance() : null;
      if (!paddle?.Checkout) {
        console.error("Paddle not initialized");
        alert("Payment system loading, please try again in a moment");
        return;
      }

      if (user) {
        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ priceId })
        });
        if (!res.ok) return;
        const { customerEmail, customerId, userId } = (await res.json()) as {
          customerEmail?: string;
          customerId?: string;
          userId?: string;
        };
        paddle.Checkout.open({
          items: [{ priceId, quantity: 1 }],
          customData: userId ? { lacore_user_id: userId } : undefined,
          customer: customerId ? { id: customerId } : { email: customerEmail ?? "" }
        });
        return;
      }

      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }]
      });
    },
    [paddleReady, user]
  );

  const openTopup = async (priceId: string) => {
    if (!user) {
      window.location.assign("/auth");
      return;
    }
    await openCheckout(priceId);
  };

  return (
    <section id="pricing" className="scroll-mt-20 px-5 py-10 sm:px-10 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center sm:mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-4 py-1.5 text-xs text-indigo-300">
            Simple pricing
          </div>
          <h2 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Start free. Scale when ready.</h2>
          <p className="text-lg text-white/45">Every plan includes credits for AI generations. Buy more anytime.</p>

          <div className="mt-8 inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
            <button
              type="button"
              onClick={() => setCycle("monthly")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                cycle === "monthly" ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white/80"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCycle("annual")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                cycle === "annual" ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white/80"
              }`}
            >
              Annual
              <span className="ml-2 rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                Save ~25%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((p) => {
            const price = cycle === "monthly" ? p.monthly : p.annual;
            const priceId = priceIdForPlan(p.key, cycle);
            return (
              <div
                key={p.key}
                className={`flex flex-col rounded-2xl border bg-[#0D0F1A] p-6 ${
                  p.featured ? "border-2 border-indigo-500/50 shadow-[0_0_40px_rgba(99,102,241,0.12)]" : "border-white/[0.08]"
                }`}
              >
                {p.featured ? (
                  <span className="mb-3 inline-flex w-fit rounded-full bg-indigo-600/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-200">
                    Most popular
                  </span>
                ) : null}
                <h3 className="text-lg font-semibold text-white">{p.name}</h3>
                <p className="mt-1 text-sm text-white/40">{p.blurb}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{price === 0 ? "$0" : `$${price}`}</span>
                  {price > 0 ? <span className="text-sm text-white/40">/mo</span> : null}
                </div>
                {cycle === "annual" && price > 0 ? (
                  <p className="mt-1 text-xs text-white/35">Billed annually (shown as effective monthly)</p>
                ) : null}
                <p className="mt-3 text-sm text-indigo-300/90">{p.credits} credits included</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-white/50">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {p.free ? (
                    <Link
                      href="/auth"
                      className="block w-full rounded-xl border border-white/15 py-3 text-center text-sm font-medium text-white/90 no-underline transition hover:bg-white/[0.06]"
                    >
                      Start free
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled={!paddleReady || !priceId}
                      onClick={() => {
                        if (priceId) void openCheckout(priceId);
                      }}
                      className={`w-full rounded-xl py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        p.featured
                          ? "bg-indigo-600 text-white hover:bg-indigo-500"
                          : "border border-white/15 text-white/90 hover:bg-white/[0.06]"
                      }`}
                    >
                      {!paddleReady ? "Loading…" : `Get ${p.name} →`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-white/35">
          All plans include: Credits that roll forward · Cancel anytime · Cards, Apple Pay &amp; Google Pay where available
        </p>

        <div className="mt-10 rounded-2xl border border-white/[0.08] bg-[#13151F] p-6">
          <h3 className="text-center text-sm font-semibold text-white">Credit top-ups — never expire</h3>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {Object.entries(TOPUP_CREDITS).map(([id, n]) => (
              <button
                key={id}
                type="button"
                onClick={() => void openTopup(id)}
                className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10"
              >
                +{n} credits
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
