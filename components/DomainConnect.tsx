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
  const [accNamecheap, setAccNamecheap] = useState(false);
  const [accGodaddy, setAccGodaddy] = useState(false);
  const [accCloudflare, setAccCloudflare] = useState(false);

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
    try {
      const res = await fetch("/api/domains/verify", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ domain: savedDomain.domain })
      });
      const data = (await res.json()) as { verified?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error || "Could not check domain status.");
        return;
      }
      if (data.verified) {
        await loadExisting();
        setStep("done");
      } else {
        setError("Domain not verified yet. Check DNS settings and try again in a few minutes.");
      }
    } finally {
      setChecking(false);
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

  const guideBox: CSSProperties = {
    background: "rgba(99,102,241,0.05)",
    border: "1px solid rgba(99,102,241,0.15)",
    padding: "16px",
    marginBottom: "20px"
  };

  if (step === "idle") {
    return (
      <button
        type="button"
        className="w-full rounded-lg border border-white/15 py-2 text-xs text-white/50 transition-colors hover:border-indigo-500/40 hover:text-white/70"
        onClick={() => setStep("form")}
      >
        + CONNECT DOMAIN
      </button>
    );
  }

  if (step === "form") {
    const domainStepRow = (n: string, text: string) => (
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
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
            HOW TO CONNECT YOUR DOMAIN
          </div>
          {domainStepRow(
            "STEP 1",
            "Enter your domain below (example: yourbrand.com). Don't include https://"
          )}
          {domainStepRow(
            "STEP 2",
            "Click CONNECT — we'll give you DNS records to add at your domain registrar"
          )}
          {domainStepRow(
            "STEP 3",
            "Add the records at Namecheap / GoDaddy / Cloudflare → click CHECK STATUS"
          )}
          <p
            style={{
              margin: "12px 0 0",
              fontSize: "12px",
              color: "var(--text-muted)",
              lineHeight: 1.6
            }}
          >
            DNS changes usually take 5–30 minutes. Sometimes up to 24 hours.
          </p>
        </div>

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
          <span style={badgeStyle(false)}>PENDING</span>
        </div>

        <div style={s.dnsBox}>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "12px",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              fontFamily: "inherit"
            }}
          >
            Add these records at your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.)
          </p>
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
            <span style={{ color: "#6366F1" }}>A</span>
            <span style={{ color: "var(--text-primary)" }}>@</span>
            <span style={{ color: "var(--text-primary)" }}>76.76.21.21</span>
            <span style={{ color: "#6366F1", marginTop: "8px" }}>CNAME</span>
            <span style={{ color: "var(--text-primary)", marginTop: "8px" }}>www</span>
            <span style={{ color: "var(--text-primary)", marginTop: "8px" }}>cname.vercel-dns.com</span>
          </div>
        </div>

        <div style={{ marginTop: "4px" }}>
          {(
            [
              {
                id: "namecheap" as const,
                open: accNamecheap,
                set: setAccNamecheap,
                title: "Namecheap",
                lines: [
                  "Login → Domain List → Manage → Advanced DNS",
                  "Delete existing A Record and CNAME if they exist",
                  "Add New Record: Type=A, Host=@, Value=76.76.21.21",
                  "Add New Record: Type=CNAME, Host=www, Value=cname.vercel-dns.com",
                  "Save All Changes"
                ]
              },
              {
                id: "godaddy" as const,
                open: accGodaddy,
                set: setAccGodaddy,
                title: "GoDaddy",
                lines: [
                  "Login → My Products → DNS",
                  "Edit existing A Record: Value=76.76.21.21",
                  "Edit CNAME www: Value=cname.vercel-dns.com",
                  "Save"
                ]
              },
              {
                id: "cloudflare" as const,
                open: accCloudflare,
                set: setAccCloudflare,
                title: "Cloudflare",
                lines: [
                  "Login → select domain → DNS → Records",
                  "Add A record: Name=@, IPv4=76.76.21.21, Proxy=DNS only (grey cloud)",
                  "Add CNAME: Name=www, Target=cname.vercel-dns.com, Proxy=DNS only",
                  "Save"
                ]
              }
            ] as const
          ).map((acc) => (
            <div key={acc.id}>
              <button
                type="button"
                onClick={() => acc.set(!acc.open)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  padding: "8px 0",
                  border: "none",
                  borderBottom: "1px solid var(--border-primary)",
                  background: "transparent",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <span aria-hidden style={{ flexShrink: 0 }}>
                  {acc.open ? "▼" : "▶"}
                </span>
                {acc.title}
              </button>
              {acc.open ? (
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    lineHeight: 1.8,
                    paddingLeft: "16px",
                    paddingTop: "8px",
                    paddingBottom: "8px"
                  }}
                >
                  {acc.lines.map((line, i) => (
                    <div key={i}>
                      {i + 1}. {line}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
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
          <span style={badgeStyle(true)}>VERIFIED</span>
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
          Your landing page is live at{" "}
          <a
            href={`https://${savedDomain?.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#6366F1", textDecoration: "none" }}
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
