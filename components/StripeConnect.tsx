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

    const res = await fetch("/api/stripe/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        publishableKey,
        secretKey: secretKey.trim() || undefined,
        priceId,
        paymentType,
        buttonText
      })
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
    await supabase.from("stripe_settings").delete().eq("user_id", userId);
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

  const s: Record<string, CSSProperties> = {
    btn: {
      background: "#06B6D4",
      color: "#000",
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
        <button type="button" style={s.btn} onClick={() => setShowForm(true)}>
          + CONNECT STRIPE
        </button>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.5" }}>
          Add a payment button to your landing page. Visitors pay directly via Stripe.
        </div>
      </div>
    );
  }

  if (showForm) {
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

        <div>
          <span style={s.label}>STRIPE PUBLISHABLE KEY</span>
          <input
            style={s.input}
            placeholder="pk_live_... or pk_test_..."
            value={publishableKey}
            onChange={(e) => setPublishableKey(e.target.value)}
            autoComplete="off"
          />
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
            Find it at dashboard.stripe.com → Developers → API Keys
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
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
            Required for Checkout. Kept server-side only; never exposed on the public landing page.
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
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
            Create a product in Stripe → copy Price ID
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
