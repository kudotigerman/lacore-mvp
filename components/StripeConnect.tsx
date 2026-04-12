"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { getSupabaseClient } from "@/lib/supabase";

interface StripeConnectProps {
  userId: string;
}

export default function StripeConnect({ userId }: StripeConnectProps) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [hasSecretOnServer, setHasSecretOnServer] = useState(false);

  const [publishableKey, setPublishableKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [priceId, setPriceId] = useState("");
  const [paymentType, setPaymentType] = useState<"one_time" | "subscription">("one_time");
  const [buttonText, setButtonText] = useState("Buy Now");

  const loadSettings = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setConnected(false);
        setPublishableKey("");
        setPriceId("");
        setPaymentType("one_time");
        setButtonText("Buy Now");
        setHasSecretOnServer(false);
        return;
      }

      const res = await fetch("/api/stripe/me", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const row = (await res.json()) as {
        connected?: boolean;
        publishable_key?: string;
        price_id?: string;
        payment_type?: string;
        button_text?: string;
        hasSecretKey?: boolean;
      };

      if (row.connected && row.publishable_key) {
        setConnected(true);
        setPublishableKey(row.publishable_key);
        setPriceId(row.price_id ?? "");
        setPaymentType(row.payment_type === "subscription" ? "subscription" : "one_time");
        setButtonText(row.button_text?.trim() || "Buy Now");
        setHasSecretOnServer(Boolean(row.hasSecretKey));
      } else {
        setConnected(false);
        setPublishableKey("");
        setPriceId("");
        setPaymentType("one_time");
        setButtonText("Buy Now");
        setHasSecretOnServer(false);
      }
      setSecretKey("");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess(false);

    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setSaving(false);
      setError("Sign in required.");
      return;
    }

    const body: Record<string, string> = {
      publishable_key: publishableKey,
      price_id: priceId,
      payment_type: paymentType,
      button_text: buttonText.trim() || "Book Now"
    };
    const sk = secretKey.trim();
    if (sk) body.secret_key = sk;

    const res = await fetch("/api/stripe/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify(body)
    });

    const data = (await res.json()) as { error?: string };
    setSaving(false);

    if (data.error) {
      setError(data.error);
      return;
    }
    setConnected(true);
    setShowForm(false);
    setSuccess(true);
    setSecretKey("");
    await loadSettings();
    window.setTimeout(() => setSuccess(false), 3000);
  }

  async function handleDisconnect() {
    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      await fetch("/api/stripe/disconnect", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
    }
    setConnected(false);
    setPublishableKey("");
    setSecretKey("");
    setPriceId("");
    setHasSecretOnServer(false);
    setShowForm(false);
  }

  function badgeStyle(ok: boolean): CSSProperties {
    return {
      display: "inline-block",
      padding: "2px 8px",
      fontSize: "10px",
      fontWeight: "700",
      letterSpacing: "0.08em",
      background: ok ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)",
      color: ok ? "#22c55e" : "#eab308",
      border: `1px solid ${ok ? "rgba(34,197,94,0.3)" : "rgba(234,179,8,0.3)"}`
    };
  }

  const guideBox: CSSProperties = {
    background: "rgba(99,102,241,0.05)",
    border: "1px solid rgba(99,102,241,0.15)",
    padding: "16px",
    marginBottom: "20px"
  };

  const s: Record<string, CSSProperties> = {
    btn: {
      background: "#6366F1",
      color: "#FFFFFF",
      border: "none",
      padding: "10px 20px",
      fontSize: "12px",
      fontWeight: "700",
      letterSpacing: "0.08em",
      cursor: "pointer",
      fontFamily: "inherit"
    },
    btnGhost: {
      background: "transparent",
      color: "var(--text-secondary)",
      border: "1px solid var(--border-primary)",
      padding: "10px 20px",
      fontSize: "12px",
      fontWeight: "600",
      cursor: "pointer",
      fontFamily: "inherit"
    },
    btnDanger: {
      background: "transparent",
      color: "#ef4444",
      border: "1px solid rgba(239,68,68,0.3)",
      padding: "10px 20px",
      fontSize: "12px",
      fontWeight: "600",
      cursor: "pointer",
      fontFamily: "inherit"
    },
    input: {
      width: "100%",
      padding: "12px 14px",
      fontSize: "13px",
      background: "var(--bg-input)",
      border: "1px solid var(--border-primary)",
      color: "var(--text-primary)",
      fontFamily: "inherit",
      outline: "none",
      boxSizing: "border-box"
    },
    label: {
      fontSize: "11px",
      fontWeight: "700",
      letterSpacing: "0.1em",
      color: "var(--text-muted)",
      display: "block",
      marginBottom: "6px"
    },
    select: {
      width: "100%",
      padding: "12px 14px",
      fontSize: "13px",
      background: "var(--bg-input)",
      border: "1px solid var(--border-primary)",
      color: "var(--text-primary)",
      fontFamily: "inherit",
      outline: "none",
      boxSizing: "border-box",
      cursor: "pointer"
    }
  };

  if (loading) {
    return <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Loading...</div>;
  }

  if (!connected && !showForm) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <button
          type="button"
          className="w-full rounded-lg border border-white/15 py-2 text-xs text-white/50 transition-colors hover:border-indigo-500/40 hover:text-white/70"
          onClick={() => setShowForm(true)}
        >
          + CONNECT STRIPE
        </button>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.5" }}>
          Add a payment button to your landing page. Visitors pay directly via Stripe.
        </div>
      </div>
    );
  }

  if (showForm) {
    const stepRow = (n: string, text: string) => (
      <div
        key={n}
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "flex-start",
          marginBottom: "10px"
        }}
      >
        <span
          style={{
            color: "#6366F1",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            flexShrink: 0,
            minWidth: "52px"
          }}
        >
          {n}
        </span>
        <span style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{text}</span>
      </div>
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: "700",
            color: "var(--text-primary)",
            letterSpacing: "0.05em"
          }}
        >
          CONNECT STRIPE
        </div>

        <div style={guideBox}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "#6366F1",
              marginBottom: "12px"
            }}
          >
            HOW TO CONNECT STRIPE
          </div>
          {stepRow("STEP 1", "Go to dashboard.stripe.com and create an account if you don't have one")}
          {stepRow(
            "STEP 2",
            "Developers → API Keys → copy your Publishable Key (pk_...) and Secret Key (sk_...)"
          )}
          {stepRow(
            "STEP 3",
            "Products → Create product → Add price → copy the Price ID (price_...)"
          )}
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              marginTop: "8px",
              fontSize: "12px",
              color: "#6366F1",
              textDecoration: "none"
            }}
          >
            Open Stripe Dashboard →
          </a>
        </div>

        <div>
          <span style={s.label}>STRIPE PUBLISHABLE KEY</span>
          <input
            style={s.input}
            placeholder="pk_live_... or pk_test_..."
            value={publishableKey}
            onChange={(e) => setPublishableKey(e.target.value)}
            autoComplete="off"
          />
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", lineHeight: 1.5 }}>
            Found in Stripe Dashboard → Developers → API Keys. Starts with pk_live_ or pk_test_
          </div>
        </div>

        <div>
          <span style={s.label}>STRIPE SECRET KEY</span>
          <input
            style={s.input}
            type="password"
            placeholder={hasSecretOnServer ? "•••••••• (leave blank to keep current)" : "sk_live_... or sk_test_..."}
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            autoComplete="off"
          />
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", lineHeight: 1.5 }}>
            Found in the same place. Starts with sk_live_ or sk_test_. Never shared publicly — stored securely.
          </div>
        </div>

        <div>
          <span style={s.label}>STRIPE PRICE ID</span>
          <input
            style={s.input}
            placeholder="price_1234..."
            value={priceId}
            onChange={(e) => setPriceId(e.target.value)}
            autoComplete="off"
          />
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", lineHeight: 1.5 }}>
            Go to Products → select your product → Pricing → copy the Price ID. Starts with price_
          </div>
        </div>

        <div>
          <span style={s.label}>PAYMENT TYPE</span>
          <select
            style={s.select}
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value as "one_time" | "subscription")}
          >
            <option value="one_time">One-time payment</option>
            <option value="subscription">Subscription (recurring)</option>
          </select>
        </div>

        <div>
          <span style={s.label}>BUTTON TEXT</span>
          <input
            style={s.input}
            placeholder="Buy Now"
            value={buttonText}
            onChange={(e) => setButtonText(e.target.value)}
          />
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", lineHeight: 1.5 }}>
            This text will appear on the payment button on your landing page. Example: Book a Call, Get Access, Buy
            Now
          </div>
        </div>

        {error && <div style={{ fontSize: "12px", color: "#ef4444" }}>{error}</div>}

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button type="button" style={s.btn} onClick={() => void handleSave()} disabled={saving || !publishableKey}>
            {saving ? "SAVING..." : "SAVE →"}
          </button>
          <button
            type="button"
            style={s.btnGhost}
            onClick={() => {
              setShowForm(false);
              setError("");
              void loadSettings();
            }}
          >
            CANCEL
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>Stripe</span>
        <span style={badgeStyle(true)}>● CONNECTED</span>
      </div>
      {success && <div style={{ fontSize: "12px", color: "#22c55e" }}>✓ Settings saved</div>}
      <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
        {hasSecretOnServer && priceId.trim() ? (
          <>
            Payment button is live on your landing page.
            <br />
          </>
        ) : (
          <>
            Add Secret key and Price ID to show the payment button on your site.
            <br />
          </>
        )}
        Type: {paymentType === "one_time" ? "One-time payment" : "Subscription"}
        <br />
        Button: &quot;{buttonText}&quot;
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button type="button" style={s.btnGhost} onClick={() => setShowForm(true)}>
          EDIT
        </button>
        <button type="button" style={s.btnDanger} onClick={() => void handleDisconnect()}>
          DISCONNECT
        </button>
      </div>
    </div>
  );
}
