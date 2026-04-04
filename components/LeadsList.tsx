"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { dash } from "@/components/dashboard/dashTokens";
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

const replyLinkStyle: CSSProperties = {
  ...dash.btnGhostSm,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  flexShrink: 0
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
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>Leads</h2>
            <span style={{ ...dash.badgeLive, textTransform: "none", letterSpacing: "normal" }}>{badgeText}</span>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} style={dash.btnGhost}>
            Refresh
          </button>
        </div>
      ) : null}

      {error ? (
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--danger)" }}>{error}</p>
      ) : null}

      {loading ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Loading…</p>
      ) : count === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "56px 16px",
            color: "var(--text-muted)"
          }}
        >
          <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 16, color: "var(--text-muted)" }} aria-hidden>
            ◎
          </div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>No leads yet</p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
            Share your landing page to start receiving leads
          </p>
        </div>
      ) : variant === "cards" ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {leads.map((lead) => (
            <li
              key={lead.id}
              style={{
                ...dash.cardCompact,
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "flex-start",
                flexWrap: "wrap"
              }}
            >
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {isNewLead(lead.created_at) ? (
                    <span style={{ color: "var(--success)", fontSize: 10, lineHeight: 1 }} aria-hidden>
                      ●
                    </span>
                  ) : null}
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
                    {lead.name?.trim() || "—"}
                  </span>
                </div>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 12,
                    color: "var(--text-muted)",
                    wordBreak: "break-all",
                    lineHeight: 1.5
                  }}
                >
                  {lead.email}
                  <span style={{ color: "var(--text-muted)" }}> · </span>
                  {formatRelativeTime(lead.created_at)}
                  <span style={{ color: "var(--text-muted)" }}> · </span>
                  <span style={{ color: "var(--text-muted)" }}>/p/{lead.slug}</span>
                </p>
                {lead.message?.trim() ? (
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap"
                    }}
                  >
                    {lead.message}
                  </p>
                ) : null}
              </div>
              <a
                href={`mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent("Re: your inquiry")}`}
                style={replyLinkStyle}
              >
                Reply →
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
                borderBottom: "1px solid var(--border)",
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
                    <span style={{ color: "var(--success)", fontSize: 10, lineHeight: 1 }} aria-hidden>
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
                  style={replyLinkStyle}
                >
                  Reply →
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
