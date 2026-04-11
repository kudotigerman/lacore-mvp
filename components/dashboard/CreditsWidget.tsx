"use client";

import { useCallback, useEffect, useState } from "react";
import { getPaddleInstance, initializePaddle } from "@paddle/paddle-js";
import { PADDLE_PRICE_IDS } from "@/lib/paddle-config";

const TOPUP_PACKS = [
  { label: "50 credits", price: "$9", priceId: PADDLE_PRICE_IDS.credits_50, credits: 50 },
  { label: "150 credits", price: "$19", priceId: PADDLE_PRICE_IDS.credits_150, credits: 150, best: true },
  { label: "300 credits", price: "$34", priceId: PADDLE_PRICE_IDS.credits_300, credits: 300 },
  { label: "600 credits", price: "$59", priceId: PADDLE_PRICE_IDS.credits_600, credits: 600 }
];

type BalancePayload = { credits_balance: number; plan: string };

export function CreditsWidget() {
  const [balance, setBalance] = useState<number | null>(null);
  const [plan, setPlan] = useState("free");
  const [showModal, setShowModal] = useState(false);
  const [paddleReady, setPaddleReady] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/credits/balance", {
        method: "GET",
        credentials: "include",
        cache: "no-store"
      });
      if (res.status === 401) {
        setBalance(0);
        setPlan("free");
        return;
      }
      if (!res.ok) {
        setBalance(0);
        setPlan("free");
        return;
      }
      const json = (await res.json()) as BalancePayload;
      setBalance(typeof json.credits_balance === "number" ? json.credits_balance : 0);
      setPlan(typeof json.plan === "string" ? json.plan : "free");
    } catch {
      setBalance(0);
      setPlan("free");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) return;
    void initializePaddle({
      environment: process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox",
      token
    }).then(() => setPaddleReady(true));
  }, []);

  const planLimit: Record<string, number> = { free: 20, starter: 100, pro: 300, scale: 1000 };
  const limit = planLimit[plan] ?? 20;
  const pct = balance !== null ? Math.min((balance / limit) * 100, 100) : 0;
  const isLow = balance !== null && balance < 20;
  const isEmpty = balance === 0;

  const handleTopup = async (priceId: string) => {
    const paddle = paddleReady ? getPaddleInstance() : null;
    if (!paddle?.Checkout) return;
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
    setShowModal(false);
    void reload();
  };

  if (balance === null) {
    return (
      <div className="mx-3 mb-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <span className="text-xs text-white/35">Credits…</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-3 mb-3 cursor-pointer" onClick={() => setShowModal(true)} role="presentation">
        <div
          className={`rounded-lg border p-3 transition-colors ${
            isEmpty
              ? "border-red-500/30 bg-red-500/10"
              : isLow
                ? "border-amber-500/30 bg-amber-500/10"
                : "border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06]"
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-white/50">Credits</span>
            <span
              className={`text-xs font-medium ${
                isEmpty ? "text-red-400" : isLow ? "text-amber-400" : "text-white/70"
              }`}
            >
              {balance}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all ${
                isEmpty ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-indigo-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {isEmpty ? <p className="mt-1 text-xs text-red-400">Buy credits to continue</p> : null}
          {isLow && !isEmpty ? <p className="mt-1 text-xs text-amber-400">Running low — buy more</p> : null}
        </div>
      </div>

      {showModal ? (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60"
          onClick={() => setShowModal(false)}
          role="presentation"
        >
          <div
            className="mx-4 w-80 rounded-2xl border border-white/10 bg-[#0D0F1A] p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="credits-modal-title"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 id="credits-modal-title" className="font-semibold text-white">
                Buy credits
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-lg text-white/40 hover:text-white"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="mb-4 text-sm text-white/50">Credits never expire and carry over each month.</p>
            <div className="flex flex-col gap-2">
              {TOPUP_PACKS.map((pack) => (
                <button
                  key={pack.priceId}
                  type="button"
                  onClick={() => void handleTopup(pack.priceId)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
                    pack.best
                      ? "border-indigo-400/30 bg-indigo-600 text-white hover:bg-indigo-500"
                      : "border-white/[0.08] bg-white/[0.05] text-white hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{pack.label}</span>
                    {pack.best ? (
                      <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs">Best value</span>
                    ) : null}
                  </div>
                  <span className="font-semibold">{pack.price}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
