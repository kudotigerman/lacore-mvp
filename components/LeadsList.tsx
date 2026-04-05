"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
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
  status?: string | null;
};

export type LeadStatus = "new" | "contacted" | "in_talks" | "won" | "lost";

const LEAD_STATUSES: LeadStatus[] = ["new", "contacted", "in_talks", "won", "lost"];

const STATUS_UI: Record<LeadStatus, { label: string; color: string }> = {
  new: { label: "New", color: "#06B6D4" },
  contacted: { label: "Contacted", color: "#eab308" },
  in_talks: { label: "In talks", color: "#8b5cf6" },
  won: { label: "Won", color: "#22c55e" },
  lost: { label: "Lost", color: "#ef4444" }
};

function normalizeLeadStatus(raw: string | null | undefined): LeadStatus {
  if (raw && LEAD_STATUSES.includes(raw as LeadStatus)) return raw as LeadStatus;
  return "new";
}

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
  flexShrink: 0,
  fontSize: 11,
  padding: "5px 12px"
};

const whatSayBtnStyle: CSSProperties = {
  ...dash.btnGhostSm,
  fontSize: 11,
  padding: "5px 12px",
  flexShrink: 0
};

type LeadsListProps = {
  userId: string;
  showToolbar?: boolean;
  variant?: "list" | "cards";
  refreshNonce?: number;
  onLeadsLoaded?: (count: number) => void;
};

function statusButtonStyle(color: string): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 12px",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
    borderRadius: 6,
    border: `1px solid ${color}55`,
    background: `${color}18`,
    color,
    flexShrink: 0
  };
}

export default function LeadsList({
  userId,
  showToolbar = true,
  variant = "list",
  refreshNonce = 0,
  onLeadsLoaded
}: LeadsListProps) {
  const dashData = useDashboardData();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuLeadId, setOpenMenuLeadId] = useState<string | null>(null);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  const [leadHints, setLeadHints] = useState<
    Record<string, { text?: string; loading?: boolean; error?: string }>
  >({});

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

  useEffect(() => {
    if (!openMenuLeadId) return;
    const onDoc = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest?.(`[data-status-menu="${openMenuLeadId}"]`)) return;
      setOpenMenuLeadId(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openMenuLeadId]);

  const patchStatus = async (leadId: string, status: LeadStatus) => {
    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("Sign in required.");
      return;
    }
    setStatusSavingId(leadId);
    setOpenMenuLeadId(null);
    const prev = leads;
    setLeads((p) => p.map((l) => (l.id === leadId ? { ...l, status } : l)));
    try {
      const res = await fetch("/api/leads/status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ leadId, status })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setLeads(prev);
        setError(data.error ?? "Could not update status.");
        return;
      }
      setError(null);
    } catch {
      setLeads(prev);
      setError("Network error.");
    } finally {
      setStatusSavingId(null);
    }
  };

  const fetchWhatToSay = async (lead: LeadRow) => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setError("Sign in required.");
      return;
    }
    const offerText = dashData.salesBuilderContext.offer?.trim() || "(not set)";
    const message = `I have a lead: Name: ${lead.name?.trim() || "—"}, Email: ${lead.email}, Message: ${lead.message?.trim() || "—"}. My offer: ${offerText}. Write me a short, specific reply to send this person right now. Be direct and personal.`;
    setLeadHints((h) => ({ ...h, [lead.id]: { loading: true, error: undefined, text: h[lead.id]?.text } }));
    setError(null);
    try {
      const res = await fetch("/api/dashboard-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message,
          salesContext: {
            offer: dashData.salesBuilderContext.offer,
            audience: dashData.salesBuilderContext.audience,
            pricing: dashData.salesBuilderContext.pricing,
            positioning: dashData.salesBuilderContext.positioning,
            headline: dashData.salesBuilderContext.headline,
            slug: dashData.salesBuilderContext.landingSlug
          }
        })
      });
      const json = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !json.reply?.trim()) {
        setLeadHints((h) => ({
          ...h,
          [lead.id]: { loading: false, error: json.error ?? "Could not get suggestion.", text: undefined }
        }));
        return;
      }
      setLeadHints((h) => ({
        ...h,
        [lead.id]: { loading: false, text: json.reply!.trim(), error: undefined }
      }));
    } catch {
      setLeadHints((h) => ({
        ...h,
        [lead.id]: { loading: false, error: "Network error.", text: undefined }
      }));
    }
  };

  const renderStatusMenu = (lead: LeadRow) => {
    const st = normalizeLeadStatus(lead.status);
    const ui = STATUS_UI[st];
    const busy = statusSavingId === lead.id;
    return (
      <div data-status-menu={lead.id} style={{ position: "relative", flexShrink: 0 }}>
        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenuLeadId((id) => (id === lead.id ? null : lead.id));
          }}
          style={{
            ...statusButtonStyle(ui.color),
            opacity: busy ? 0.6 : 1,
            cursor: busy ? "wait" : "pointer"
          }}
        >
          {ui.label}
          <span style={{ fontSize: 8, opacity: 0.85 }} aria-hidden>
            ▾
          </span>
        </button>
        {openMenuLeadId === lead.id ? (
          <div
            role="listbox"
            style={{
              position: "absolute",
              top: "100%",
              right: variant === "cards" ? 0 : undefined,
              left: variant === "list" ? 0 : undefined,
              marginTop: 4,
              minWidth: 140,
              zIndex: 20,
              background: "var(--bg-card, #111116)",
              border: "1px solid #1C1C22",
              borderRadius: 8,
              padding: 4,
              boxShadow: "0 12px 40px rgba(0,0,0,0.45)"
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {LEAD_STATUSES.map((opt) => {
              const o = STATUS_UI[opt];
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => void patchStatus(lead.id, opt)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    fontSize: 12,
                    fontFamily: "inherit",
                    border: "none",
                    borderRadius: 6,
                    background: opt === st ? "rgba(255,255,255,0.06)" : "transparent",
                    color: o.color,
                    cursor: "pointer",
                    fontWeight: opt === st ? 600 : 500
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  };

  const renderHintBlock = (leadId: string) => {
    const h = leadHints[leadId];
    if (!h?.loading && !h?.text && !h?.error) return null;
    return (
      <div
        style={{
          marginTop: 12,
          padding: "12px 14px",
          background: "rgba(6,182,212,0.06)",
          border: "1px solid rgba(6,182,212,0.2)",
          borderRadius: 8
        }}
      >
        {h.loading ? (
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>Thinking…</p>
        ) : h.error ? (
          <p style={{ margin: 0, fontSize: 12, color: "#ef4444" }}>{h.error}</p>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
              {h.text}
            </p>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(h.text ?? "")}
              style={{ ...dash.btnGhostSm, fontSize: 11, padding: "5px 12px", marginTop: 10 }}
            >
              COPY
            </button>
          </>
        )}
      </div>
    );
  };

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
            padding: "80px 0",
            color: "#52525B"
          }}
        >
          <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 16, color: "#27272E" }} aria-hidden>
            ◎
          </div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#52525B" }}>No leads yet</p>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#3F3F46", lineHeight: 1.5 }}>
            Share your landing page to start receiving leads
          </p>
        </div>
      ) : variant === "cards" ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {leads.map((lead) => (
            <li key={lead.id} style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  ...dash.cardCompact,
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                  flexWrap: "wrap"
                }}
              >
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {isNewLead(lead.created_at) ? (
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#22c55e",
                          flexShrink: 0
                        }}
                        aria-hidden
                      />
                    ) : null}
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#FFFFFF" }}>{lead.name?.trim() || "—"}</span>
                  </div>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 12,
                      color: "#52525B",
                      wordBreak: "break-all",
                      lineHeight: 1.5
                    }}
                  >
                    {lead.email}
                    <span> · </span>
                    {formatRelativeTime(lead.created_at)}
                    <span> · </span>
                    <span>/p/{lead.slug}</span>
                  </p>
                  {lead.message?.trim() ? (
                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: 13,
                        color: "#A1A1AA",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap"
                      }}
                    >
                      {lead.message}
                    </p>
                  ) : null}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 8,
                    marginLeft: "auto"
                  }}
                >
                  {renderStatusMenu(lead)}
                  <button
                    type="button"
                    disabled={!!leadHints[lead.id]?.loading}
                    onClick={() => void fetchWhatToSay(lead)}
                    style={{
                      ...whatSayBtnStyle,
                      opacity: leadHints[lead.id]?.loading ? 0.5 : 1
                    }}
                  >
                    ⚡ What to say?
                  </button>
                  <a
                    href={`mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent("Re: your inquiry")}`}
                    style={{ ...replyLinkStyle, marginLeft: 0 }}
                  >
                    Reply →
                  </a>
                </div>
              </div>
              {renderHintBlock(lead.id)}
            </li>
          ))}
        </ul>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {leads.map((lead) => (
            <li key={lead.id} style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  borderBottom: "1px solid #1C1C22",
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
                  {renderStatusMenu(lead)}
                  <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {formatRelativeTime(lead.created_at)}
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      disabled={!!leadHints[lead.id]?.loading}
                      onClick={() => void fetchWhatToSay(lead)}
                      style={{
                        ...whatSayBtnStyle,
                        opacity: leadHints[lead.id]?.loading ? 0.5 : 1
                      }}
                    >
                      ⚡ What to say?
                    </button>
                    <a
                      href={`mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent("Re: your inquiry")}`}
                      style={{ ...replyLinkStyle, marginLeft: 0 }}
                    >
                      Reply →
                    </a>
                  </div>
                </div>
              </div>
              {renderHintBlock(lead.id)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
