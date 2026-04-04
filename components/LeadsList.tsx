"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { getSupabaseClient } from "@/lib/supabase";

export type LeadRow = {
  id: string;
  user_id: string;
  slug: string;
  name: string | null;
  email: string;
  message: string | null;
  created_at: string;
};

function formatRelativeTime(iso: string): string {
  const seconds = Math.floor((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(seconds / 3600);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  const days = Math.round(seconds / 86400);
  if (Math.abs(days) < 7) return rtf.format(days, "day");
  const weeks = Math.round(seconds / 604800);
  if (Math.abs(weeks) < 5) return rtf.format(weeks, "week");
  const months = Math.round(seconds / 2629800);
  if (Math.abs(months) < 12) return rtf.format(months, "month");
  return rtf.format(Math.round(seconds / 31557600), "year");
}

function isNewLead(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000;
}

const btnGhost: CSSProperties = {
  border: "1px solid var(--border-primary)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.1em",
  padding: "12px 24px",
  cursor: "pointer",
  fontFamily: "inherit",
  borderRadius: 0
};

type LeadsListProps = {
  userId: string;
  showToolbar?: boolean;
  variant?: "list" | "cards";
  refreshNonce?: number;
  onLeadsLoaded?: (count: number) => void;
};

export default function LeadsList({
  userId,
  showToolbar = true,
  variant = "list",
  refreshNonce = 0,
  onLeadsLoaded
}: LeadsListProps) {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Sign in required.");
        setLeads([]);
        return;
      }
      const res = await fetch("/api/leads/list", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = (await res.json()) as { leads?: LeadRow[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to load leads.");
        setLeads([]);
        return;
      }
      setLeads(data.leads ?? []);
    } catch {
      setError("Network error.");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load, refreshNonce]);

  const count = leads.length;

  useEffect(() => {
    if (!loading && onLeadsLoaded) onLeadsLoaded(count);
  }, [loading, count, onLeadsLoaded]);

  const badgeText = `${count} lead${count === 1 ? "" : "s"}`;

  const replyStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.08em",
    color: "var(--accent)",
    textDecoration: "none",
    border: "1px solid var(--border-primary)",
    padding: "8px 14px",
    borderRadius: 0,
    whiteSpace: "nowrap",
    alignSelf: "flex-start"
  };

  return (
    <div style={{ fontFamily: "inherit", maxWidth: variant === "cards" ? 900 : 640 }}>
      {showToolbar ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 20,
            flexWrap: "wrap"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text-primary)"
              }}
            >
              LEADS
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                color: "var(--accent)"
              }}
            >
              {badgeText}
            </span>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} style={btnGhost}>
            REFRESH
          </button>
        </div>
      ) : null}

      {error ? (
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "#f87171" }}>{error}</p>
      ) : null}

      {loading ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Loading…</p>
      ) : count === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 16px",
            color: "var(--text-muted)",
            fontSize: 14,
            lineHeight: 1.6
          }}
        >
          No leads yet.
          <br />
          Share your landing page to start getting leads.
        </div>
      ) : variant === "cards" ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 16 }}>
          {leads.map((lead) => (
            <li
              key={lead.id}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-primary)",
                padding: 20,
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "flex-start",
                flexWrap: "wrap"
              }}
            >
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  {isNewLead(lead.created_at) ? (
                    <span style={{ color: "#22c55e", fontSize: 10 }} aria-hidden>
                      ●
                    </span>
                  ) : null}
                  <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                    {lead.name?.trim() || "—"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginBottom: lead.message?.trim() ? 8 : 0
                  }}
                >
                  <span style={{ color: "var(--text-secondary)", wordBreak: "break-all" }}>{lead.email}</span>
                  <span style={{ color: "var(--text-muted)" }}>·</span>
                  <span>{formatRelativeTime(lead.created_at)}</span>
                  <span style={{ color: "var(--text-muted)" }}>·</span>
                  <span>/p/{lead.slug}</span>
                </div>
                {lead.message?.trim() ? (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "var(--text-secondary)",
                      whiteSpace: "pre-wrap"
                    }}
                  >
                    {lead.message}
                  </p>
                ) : null}
              </div>
              <a
                href={`mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent("Re: your inquiry")}`}
                style={replyStyle}
              >
                REPLY →
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {leads.map((lead) => (
            <li
              key={lead.id}
              style={{
                borderBottom: "1px solid var(--border-primary)",
                padding: "16px 0",
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "flex-start",
                flexWrap: "wrap"
              }}
            >
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  {isNewLead(lead.created_at) ? (
                    <span style={{ color: "#22c55e", fontSize: 10, lineHeight: 1 }} aria-hidden>
                      ●
                    </span>
                  ) : null}
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                    {lead.name?.trim() || "—"}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", wordBreak: "break-all" }}>
                  {lead.email}
                </p>
                {lead.message?.trim() ? (
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 13,
                      color: "var(--text-muted)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}
                  >
                    {lead.message}
                  </p>
                ) : null}
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text-muted)" }}>/p/{lead.slug}</p>
              </div>
              <div
                style={{
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 8
                }}
              >
                <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {formatRelativeTime(lead.created_at)}
                </span>
                <a
                  href={`mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent("Re: your inquiry")}`}
                  style={replyStyle}
                >
                  REPLY →
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
