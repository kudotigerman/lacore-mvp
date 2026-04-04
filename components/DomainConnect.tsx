"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";

interface DomainConnectProps {
  slug: string;
  userId: string;
}

async function authHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.access_token) {
    h.Authorization = `Bearer ${session.access_token}`;
  }
  return h;
}

export default function DomainConnect({ slug, userId }: DomainConnectProps) {
  const [domain, setDomain] = useState("");
  const [savedDomain, setSavedDomain] = useState<{ domain: string; verified: boolean } | null>(null);
  const [step, setStep] = useState<"idle" | "form" | "dns" | "done">("idle");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [, setDnsInfo] = useState<unknown>(null);

  const loadExisting = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("custom_domains")
      .select("domain, verified")
      .eq("user_id", userId)
      .eq("slug", slug)
      .maybeSingle();
    const row = data as { domain: string; verified: boolean } | null;
    if (row) {
      setSavedDomain({ domain: row.domain, verified: row.verified });
      setStep(row.verified ? "done" : "dns");
    }
  }, [slug, userId]);

  useEffect(() => {
    void loadExisting();
  }, [loadExisting]);

  async function handleAdd() {
    setLoading(true);
    setError("");
    const clean = domain
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");
    const res = await fetch("/api/domains/add", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ domain: clean, slug })
    });
    const data = (await res.json()) as { error?: string; verified?: boolean; verification?: unknown };
    setLoading(false);
    if (data.error) {
      setError(data.error);
      return;
    }
    setSavedDomain({ domain: clean, verified: Boolean(data.verified) });
    setDnsInfo(data);
    setStep(data.verified ? "done" : "dns");
  }

  async function handleVerify() {
    if (!savedDomain) return;
    setChecking(true);
    setError("");
    const res = await fetch("/api/domains/verify", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ domain: savedDomain.domain })
    });
    const data = (await res.json()) as { verified?: boolean };
    setChecking(false);
    if (data.verified) {
      setSavedDomain({ ...savedDomain, verified: true });
      setStep("done");
    } else {
      setError("Domain not verified yet. Check DNS settings and try again in a few minutes.");
    }
  }

  async function handleRemove() {
    if (!savedDomain) return;
    setLoading(true);
    setError("");
    await fetch("/api/domains/remove", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ domain: savedDomain.domain })
    });
    setSavedDomain(null);
    setStep("idle");
    setDomain("");
    setDnsInfo(null);
    setLoading(false);
  }

  const badgeStyle = (verified: boolean): CSSProperties => ({
    display: "inline-block",
    padding: "2px 8px",
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "0.08em",
    background: verified ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)",
    color: verified ? "#22c55e" : "#eab308",
    border: `1px solid ${verified ? "rgba(34,197,94,0.3)" : "rgba(234,179,8,0.3)"}`
  });

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
    dnsBox: {
      background: "var(--bg-input)",
      border: "1px solid var(--border-primary)",
      padding: "16px",
      fontSize: "12px",
      fontFamily: "monospace"
    },
    label: {
      fontSize: "11px",
      fontWeight: "700",
      letterSpacing: "0.1em",
      color: "var(--text-muted)",
      display: "block",
      marginBottom: "6px"
    },
    error: { fontSize: "12px", color: "#ef4444", marginTop: "8px" }
  };

  if (step === "idle") {
    return (
      <button type="button" style={s.btn} onClick={() => setStep("form")}>
        + CONNECT DOMAIN
      </button>
    );
  }

  if (step === "form") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <span style={s.label}>YOUR DOMAIN</span>
        <input
          style={s.input}
          placeholder="yourdomain.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleAdd();
          }}
        />
        {error ? <div style={s.error}>{error}</div> : null}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            style={s.btn}
            onClick={() => void handleAdd()}
            disabled={loading || !domain}
          >
            {loading ? "CONNECTING..." : "CONNECT →"}
          </button>
          <button type="button" style={s.btnGhost} onClick={() => setStep("idle")}>
            CANCEL
          </button>
        </div>
      </div>
    );
  }

  if (step === "dns") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
            {savedDomain?.domain}
          </span>
          <span style={badgeStyle(false)}>● PENDING</span>
        </div>

        <div style={s.dnsBox}>
          <div
            style={{
              color: "var(--text-muted)",
              marginBottom: "12px",
              fontSize: "11px",
              fontFamily: "inherit",
              fontWeight: "700",
              letterSpacing: "0.08em"
            }}
          >
            ADD THIS DNS RECORD AT YOUR DOMAIN REGISTRAR:
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "80px 80px 1fr",
              gap: "8px",
              color: "var(--text-secondary)"
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>TYPE</span>
            <span style={{ color: "var(--text-muted)" }}>NAME</span>
            <span style={{ color: "var(--text-muted)" }}>VALUE</span>
            <span style={{ color: "#06B6D4" }}>A</span>
            <span style={{ color: "var(--text-primary)" }}>@</span>
            <span style={{ color: "var(--text-primary)" }}>76.76.21.21</span>
            <span style={{ color: "#06B6D4", marginTop: "8px" }}>CNAME</span>
            <span style={{ color: "var(--text-primary)", marginTop: "8px" }}>www</span>
            <span style={{ color: "var(--text-primary)", marginTop: "8px" }}>cname.vercel-dns.com</span>
          </div>
        </div>

        <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.5" }}>
          DNS changes can take up to 24 hours. Click CHECK STATUS after adding the records.
        </div>

        {error ? <div style={s.error}>{error}</div> : null}

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            style={s.btn}
            onClick={() => void handleVerify()}
            disabled={checking}
          >
            {checking ? "CHECKING..." : "CHECK STATUS"}
          </button>
          <button
            type="button"
            style={s.btnGhost}
            onClick={() => void handleRemove()}
            disabled={loading}
          >
            REMOVE
          </button>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
            {savedDomain?.domain}
          </span>
          <span style={badgeStyle(true)}>● ACTIVE</span>
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
          Your landing page is live at{" "}
          <a
            href={`https://${savedDomain?.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#06B6D4", textDecoration: "none" }}
          >
            {savedDomain?.domain}
          </a>
        </div>
        <button
          type="button"
          style={s.btnGhost}
          onClick={() => void handleRemove()}
          disabled={loading}
        >
          {loading ? "REMOVING..." : "DISCONNECT DOMAIN"}
        </button>
      </div>
    );
  }

  return null;
}
