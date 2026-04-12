"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

function StripeLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 25" width={60} height={25} aria-hidden fill="currentColor">
      <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.54 8.54 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.22 2.53-7.52 6.3-7.52 3.96 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.12 1.48zm-5.92-2.55c0-1.62-.66-2.96-2.06-2.96-1.32 0-2.17 1.22-2.3 2.96h4.36zM40.95 20.3c-1.32 0-2.28-.5-2.87-1.26l-.08 1.08h-4.14V5.57h4.66v5.22c.58-.66 1.44-1.1 2.6-1.1 2.65 0 4.56 2.3 4.56 5.42 0 3.38-1.85 5.19-4.73 5.19zm-1.1-8.5c-1.14 0-1.8.9-1.8 2.1v1.14c0 1.2.66 2.1 1.8 2.1 1.22 0 1.96-1.02 1.96-2.64 0-1.5-.74-2.7-1.96-2.7zm-15.77 8.5c-3.5 0-5.8-2.46-5.8-7.4 0-4.96 2.3-7.6 5.8-7.6 1.64 0 2.84.62 3.48 1.5l.08-1.2h4.14V25h-4.66v-4.86c-.64.9-1.84 1.46-3.04 1.46zm.96-11.9c-1.22 0-1.96 1.02-1.96 2.64v2.52c0 1.62.74 2.64 1.96 2.64 1.14 0 1.8-.9 1.8-2.1v-1.14c0-1.2-.66-2.1-1.8-2.1zM5.7 20.38C2.42 20.38 0 18.46 0 15.1c0-3.58 2.65-4.86 5.76-5.28l5.9-.86v-.86c0-1.2-.78-1.86-2.2-1.86-1.64 0-3.58.66-4.86 1.5L.96 4.1C2.65 2.9 5.3 2 8.3 2c4.44 0 6.7 2.1 6.7 5.7v8.5c0 .78.12 1.38.36 1.74H11.1c-.36-.36-.6-.96-.72-1.68-.96 1.08-2.46 1.82-4.68 1.82zm1.32-3.5c1.14 0 1.92-.54 2.28-1.26v-2.4l-2.52.36c-1.38.2-2.1.78-2.1 1.74 0 1.02.78 1.56 2.34 1.56z" />
    </svg>
  );
}

async function authJsonHeaders(): Promise<HeadersInit> {
  const supabase = getSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.access_token) h.Authorization = `Bearer ${session.access_token}`;
  return h;
}

type MeRow = {
  connected?: boolean;
  publishable_key?: string;
  price_id?: string;
  payment_type?: string;
  button_text?: string;
  hasSecretKey?: boolean;
};

type Props = { userId: string | null };

export function ConnectStripeSettings({ userId }: Props) {
  const [loadingMe, setLoadingMe] = useState(true);
  const [connected, setConnected] = useState(false);
  const [publishableKey, setPublishableKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [priceId, setPriceId] = useState("");
  const [paymentType, setPaymentType] = useState<"one_time" | "subscription">("one_time");
  const [buttonText, setButtonText] = useState("Book Now");
  const [hasSecretOnServer, setHasSecretOnServer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectMeta, setConnectMeta] = useState<{ price_name: string; currency: string; amount: string } | null>(
    null
  );

  const loadMe = useCallback(async () => {
    if (!userId) {
      setLoadingMe(false);
      setConnected(false);
      return;
    }
    setLoadingMe(true);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setConnected(false);
        return;
      }
      const res = await fetch("/api/stripe/me", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const row = (await res.json()) as MeRow;
      if (row.connected && row.publishable_key) {
        setConnected(true);
        setPublishableKey(row.publishable_key);
        setPriceId(row.price_id ?? "");
        setPaymentType(row.payment_type === "subscription" ? "subscription" : "one_time");
        setButtonText(row.button_text?.trim() || "Book Now");
        setHasSecretOnServer(Boolean(row.hasSecretKey));
      } else {
        setConnected(false);
        setPublishableKey("");
        setPriceId("");
        setPaymentType("one_time");
        setButtonText("Book Now");
        setHasSecretOnServer(false);
        setConnectMeta(null);
      }
      setSecretKey("");
    } finally {
      setLoadingMe(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  async function handleConnect() {
    setError(null);
    setConnectMeta(null);
    setSubmitting(true);
    try {
      const secret = secretKey.trim();
      if (!secret && !hasSecretOnServer) {
        setError("Secret key is required.");
        setSubmitting(false);
        return;
      }
      const body: Record<string, string> = {
        publishable_key: publishableKey.trim(),
        price_id: priceId.trim(),
        payment_type: paymentType,
        button_text: buttonText.trim() || "Book Now"
      };
      if (secret) body.secret_key = secret;

      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: await authJsonHeaders(),
        body: JSON.stringify(body)
      });
      const data = (await res.json()) as {
        error?: string;
        success?: boolean;
        price_name?: string;
        currency?: string;
        amount?: string;
      };
      if (!res.ok || data.error) {
        setError(data.error ?? "Could not connect Stripe.");
        return;
      }
      setConnectMeta({
        price_name: data.price_name ?? "—",
        currency: data.currency ?? "",
        amount: data.amount ?? "—"
      });
      setConnected(true);
      setSecretKey("");
      await loadMe();
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/disconnect", {
        method: "POST",
        headers: await authJsonHeaders()
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setError(j.error ?? "Disconnect failed.");
        return;
      }
      setConnected(false);
      setConnectMeta(null);
      setPublishableKey("");
      setSecretKey("");
      setPriceId("");
      setHasSecretOnServer(false);
      setButtonText("Book Now");
    } finally {
      setDisconnecting(false);
    }
  }

  const inputClass =
    "dash-focusable w-full rounded-xl border border-white/10 bg-[#0a0a12] px-4 py-3 text-sm text-white placeholder:text-white/25 transition-colors focus:border-indigo-500/50 focus:outline-none";

  const toggleBtn = (on: boolean) =>
    on
      ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-300"
      : "border-white/10 bg-transparent text-white/50";

  if (!userId) {
    return <p className="text-sm text-white/40">Sign in to connect Stripe.</p>;
  }

  if (loadingMe) {
    return <p className="text-sm text-white/40">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-white/80">
        <StripeLogo className="text-indigo-300" />
        <p className="text-xs leading-relaxed text-white/40">
          Keys are encrypted and stored securely. Only your checkout flow uses them on the server.
        </p>
      </div>

      {connected && connectMeta ? (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/90">✓ Stripe connected</p>
          <p className="mt-2 text-white/90">
            <span className="text-white/50">Price: </span>
            {connectMeta.price_name}
          </p>
          <p className="text-white/80">
            <span className="text-white/50">Amount: </span>
            {connectMeta.amount} {connectMeta.currency}
          </p>
        </div>
      ) : connected ? (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/90">✓ Stripe connected</p>
          <p className="mt-2 text-white/70">
            Price ID: <code className="text-indigo-300">{priceId || "—"}</code>
          </p>
          <p className="text-white/60">
            {paymentType === "subscription" ? "Subscription" : "One-time payment"} · Button: {buttonText}
          </p>
        </div>
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">Publishable key</span>
        <input
          type="text"
          autoComplete="off"
          value={publishableKey}
          onChange={(e) => setPublishableKey(e.target.value)}
          placeholder="pk_live_… or pk_test_…"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">Secret key</span>
        <input
          type="password"
          autoComplete="off"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          placeholder={hasSecretOnServer ? "•••••••• (leave blank to keep)" : "sk_live_… or sk_test_…"}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">Price ID</span>
        <input
          type="text"
          value={priceId}
          onChange={(e) => setPriceId(e.target.value)}
          placeholder="price_…"
          className={inputClass}
        />
      </label>

      <div>
        <span className="mb-2 block text-xs uppercase tracking-wider text-white/40">Payment type</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPaymentType("one_time")}
            className={`flex-1 rounded-xl border px-4 py-2.5 text-sm transition-colors ${toggleBtn(paymentType === "one_time")}`}
          >
            One-time payment
          </button>
          <button
            type="button"
            onClick={() => setPaymentType("subscription")}
            className={`flex-1 rounded-xl border px-4 py-2.5 text-sm transition-colors ${toggleBtn(paymentType === "subscription")}`}
          >
            Subscription
          </button>
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">Button text</span>
        <input
          type="text"
          value={buttonText}
          onChange={(e) => setButtonText(e.target.value)}
          placeholder="Book Now"
          className={inputClass}
        />
      </label>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={submitting || !publishableKey.trim() || !priceId.trim() || (!secretKey.trim() && !hasSecretOnServer)}
          onClick={() => void handleConnect()}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {submitting ? "Testing…" : "Test & connect"}
        </button>
        {connected ? (
          <button
            type="button"
            disabled={disconnecting}
            onClick={() => void handleDisconnect()}
            className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-white/70 transition-colors hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
