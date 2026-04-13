"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { LeadRow } from "@/components/LeadsList";
import type { SalesBuilderContextPayload } from "@/components/dashboard/DashboardDataContext";
import {
  PIPELINE_COLUMNS,
  normalizePipelineStatus,
  nextForwardStatus,
  pipelineColumnLabel,
  type PipelineColumnId
} from "@/lib/leadPipeline";

type ClosingTab = "strategy" | "messages" | "objections";

type ClosingPayload = {
  analysis: string;
  next_action: string;
  messages: { label: string; body: string }[];
  objections: { objection: string; response: string }[];
};

const STATUS_COACH: Record<PipelineColumnId, { stageLine: string; nextHint: string }> = {
  new: {
    stageLine: "New lead — they raised their hand. Speed and warmth win.",
    nextHint: "Reply fast with a personal line about what they wrote and one low-friction next step (question or short call)."
  },
  contacted: {
    stageLine: "Contacted — you’ve opened the thread. Don’t let it go generic.",
    nextHint: "Add a specific insight or question tied to their situation; earn the reply before asking for a meeting."
  },
  replied: {
    stageLine: "Replied — they’re engaged. This is qualification and momentum.",
    nextHint: "Clarify fit, timeline, and budget softly; propose a short call with a clear agenda."
  },
  call_booked: {
    stageLine: "Call booked — convert conversation to a clear offer.",
    nextHint: "Confirm agenda, send a one-pager or calendar hold, prep 2–3 discovery questions."
  },
  proposal_sent: {
    stageLine: "Proposal out — remove friction and handle silence.",
    nextHint: "Follow up with a concise recap of value; offer to walk through on a 15-min call."
  },
  won: {
    stageLine: "Won — onboarding and delivery set the tone for referrals.",
    nextHint: "Send next steps, timeline, and how you’ll communicate; ask for the assets you need."
  },
  lost: {
    stageLine: "Lost — stay professional; leave the door open.",
    nextHint: "Thank them, ask optional feedback, and keep the relationship warm for later."
  }
};

function formatLeadDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return "—";
  }
}

function statusBadgeClass(status: PipelineColumnId): string {
  const map: Record<PipelineColumnId, string> = {
    new: "border-white/20 bg-white/10 text-white/80",
    contacted: "border-blue-500/35 bg-blue-500/10 text-blue-300",
    replied: "border-indigo-500/40 bg-indigo-500/15 text-indigo-200",
    call_booked: "border-violet-500/35 bg-violet-500/10 text-violet-200",
    proposal_sent: "border-amber-500/35 bg-amber-500/10 text-amber-200",
    won: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    lost: "border-red-500/35 bg-red-500/10 text-red-300"
  };
  return map[status];
}

type EditField = "name" | "email" | "phone" | "message";

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

const EDIT_INPUT =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/25 transition-colors focus:border-indigo-500/50 focus:outline-none";

export default function LeadClosingPanel({
  lead,
  sessionToken,
  salesContext,
  onStatusChange,
  onCreateProposal,
  onClose,
  onLeadUpdated,
  onLeadDeleted,
  onOpenInvoice
}: {
  lead: LeadRow | null;
  sessionToken: string | null;
  salesContext: SalesBuilderContextPayload;
  onStatusChange?: (status: PipelineColumnId) => void;
  onCreateProposal?: () => void;
  /** Shown as top-right X when provided (slide-in panel). */
  onClose?: () => void;
  onLeadUpdated?: (lead: LeadRow) => void;
  onLeadDeleted?: (leadId: string) => void;
  onOpenInvoice?: () => void;
}) {
  const [tab, setTab] = useState<ClosingTab>("strategy");
  const [result, setResult] = useState<ClosingPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditField | null>(null);
  const [draft, setDraft] = useState("");
  const [saveFlash, setSaveFlash] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const saveLeadLock = useRef(false);
  const escapeRef = useRef(false);
  const editInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const normalized = useMemo(
    () => (lead ? normalizePipelineStatus(lead.status) : null),
    [lead]
  );

  const coach = normalized ? STATUS_COACH[normalized] : null;
  const nextStage = normalized ? nextForwardStatus(normalized) : null;
  const nextStageLabel = nextStage ? pipelineColumnLabel(nextStage) : null;

  useEffect(() => {
    setResult(null);
    setErr(null);
    setTab("strategy");
    setEditing(null);
    setDeleteConfirm(false);
  }, [lead?.id]);

  useLayoutEffect(() => {
    if (!editing) return;
    const el = editInputRef.current;
    if (!el) return;
    el.focus();
    if (el instanceof HTMLInputElement) el.select();
  }, [editing]);

  const fieldDisplayValue = useCallback(
    (field: EditField, row: LeadRow): string => {
      switch (field) {
        case "name":
          return row.name?.trim() ?? "";
        case "email":
          return row.email ?? "";
        case "phone":
          return row.phone?.trim() ?? "";
        case "message":
          return row.message?.trim() ?? "";
        default:
          return "";
      }
    },
    []
  );

  const startEdit = useCallback(
    (field: EditField) => {
      if (!lead) return;
      setDraft(fieldDisplayValue(field, lead));
      setEditing(field);
    },
    [lead, fieldDisplayValue]
  );

  const commitEditing = useCallback(async () => {
    if (!sessionToken || !lead || !editing || saveLeadLock.current) return;
    const field = editing;
    const current = fieldDisplayValue(field, lead);
    if (draft === current) {
      setEditing(null);
      return;
    }

    saveLeadLock.current = true;
    try {
      const body: Record<string, string> = { lead_id: lead.id };
      if (field === "name") body.name = draft;
      if (field === "email") body.email = draft;
      if (field === "phone") body.phone = draft;
      if (field === "message") body.message = draft;

      const res = await fetch("/api/leads/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify(body)
      });
      const json = (await res.json()) as { lead?: LeadRow; error?: string };
      if (!res.ok) {
        setErr(json.error ?? "Could not save lead.");
        return;
      }
      if (json.lead) {
        onLeadUpdated?.(json.lead as LeadRow);
        setSaveFlash(true);
        window.setTimeout(() => setSaveFlash(false), 1000);
      }
      setEditing(null);
    } catch {
      setErr("Network error.");
    } finally {
      saveLeadLock.current = false;
    }
  }, [sessionToken, lead, editing, draft, fieldDisplayValue, onLeadUpdated]);

  const cancelEditing = useCallback(() => {
    escapeRef.current = true;
    setEditing(null);
    window.setTimeout(() => {
      escapeRef.current = false;
    }, 100);
  }, []);

  async function confirmDeleteLead() {
    if (!sessionToken || !lead) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/leads/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ lead_id: lead.id })
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) {
        setErr(json.error ?? "Could not delete lead.");
        return;
      }
      setDeleteConfirm(false);
      onLeadDeleted?.(lead.id);
      onClose?.();
    } catch {
      setErr("Network error.");
    } finally {
      setDeleting(false);
    }
  }

  async function generateClosingStrategy() {
    if (!sessionToken || !lead?.id) return;
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/closing-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ lead_id: lead.id })
      });
      const json = (await res.json()) as ClosingPayload & { error?: string; message?: string };
      if (res.status === 402) {
        setErr(json.message ?? json.error ?? "Not enough credits.");
        return;
      }
      if (!res.ok) {
        setErr(json.error ?? "Could not generate strategy.");
        return;
      }
      setResult({
        analysis: json.analysis,
        next_action: json.next_action,
        messages: json.messages,
        objections: json.objections
      });
      setTab("strategy");
    } catch {
      setErr("Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (!lead) {
    return null;
  }

  const offerHint =
    salesContext.offer?.trim() && salesContext.offer !== "(Not saved yet — user can generate an offer from the home page.)"
      ? "Your saved offer will be used automatically when you generate a strategy."
      : "Add an offer on the Offer page for sharper AI advice.";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 shadow-[0_0_0_1px_rgba(99,102,241,0.06)] max-lg:rounded-xl lg:min-h-[360px] lg:p-5">
      {/* Panel chrome: title + close */}
      <div className="shrink-0 border-b border-white/[0.08] pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-white">LACORE AI</span>
            </div>
            <p className="text-xs text-white/40">Closing assistant</p>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close closing assistant"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 text-lg leading-none text-white/60 transition-colors hover:border-white/25 hover:bg-white/5 hover:text-white"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col gap-3 pt-3 pb-4">
      {/* Lead header */}
      <div className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-indigo-500/[0.08] to-transparent p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-indigo-400/90">Selected lead</p>
              {saveFlash ? (
                <span className="text-[10px] font-medium text-emerald-400/75 transition-opacity">Saved</span>
              ) : null}
            </div>

            <div className="group relative mt-1 flex min-w-0 items-center gap-1.5">
              {editing === "name" ? (
                <input
                  ref={(el) => {
                    editInputRef.current = el;
                  }}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelEditing();
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      void commitEditing();
                    }
                  }}
                  onBlur={() => {
                    if (escapeRef.current) return;
                    void commitEditing();
                  }}
                  className={`${EDIT_INPUT} text-lg font-semibold`}
                  placeholder="Name"
                  aria-label="Lead name"
                />
              ) : (
                <>
                  <p className="min-w-0 flex-1 truncate text-lg font-semibold text-white">
                    {lead.name?.trim() || lead.email}
                  </p>
                  <button
                    type="button"
                    onClick={() => startEdit("name")}
                    aria-label="Edit name"
                    className="shrink-0 rounded-md p-1 text-white/30 transition-all hover:bg-white/5 hover:text-white/55 group-hover:text-white/45 [@media(hover:none)]:text-white/35"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>

            <div className="group relative mt-1 flex min-w-0 items-center gap-1.5">
              {editing === "email" ? (
                <input
                  ref={(el) => {
                    editInputRef.current = el;
                  }}
                  type="email"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelEditing();
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      void commitEditing();
                    }
                  }}
                  onBlur={() => {
                    if (escapeRef.current) return;
                    void commitEditing();
                  }}
                  className={EDIT_INPUT}
                  aria-label="Lead email"
                />
              ) : (
                <>
                  <p className="min-w-0 flex-1 truncate text-sm text-white/50">{lead.email}</p>
                  <button
                    type="button"
                    onClick={() => startEdit("email")}
                    aria-label="Edit email"
                    className="shrink-0 rounded-md p-1 text-white/30 transition-all hover:bg-white/5 hover:text-white/55 group-hover:text-white/45 [@media(hover:none)]:text-white/35"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>

            <div className="group relative mt-0.5 flex min-w-0 items-center gap-1.5">
              {editing === "phone" ? (
                <input
                  ref={(el) => {
                    editInputRef.current = el;
                  }}
                  type="tel"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelEditing();
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      void commitEditing();
                    }
                  }}
                  onBlur={() => {
                    if (escapeRef.current) return;
                    void commitEditing();
                  }}
                  className={EDIT_INPUT}
                  placeholder="Phone"
                  aria-label="Lead phone"
                />
              ) : (
                <>
                  <p
                    className={`min-w-0 flex-1 truncate text-sm ${lead.phone?.trim() ? "text-white/45" : "text-white/30 italic"}`}
                  >
                    {lead.phone?.trim() || "Add phone"}
                  </p>
                  <button
                    type="button"
                    onClick={() => startEdit("phone")}
                    aria-label="Edit phone"
                    className="shrink-0 rounded-md p-1 text-white/30 transition-all hover:bg-white/5 hover:text-white/55 group-hover:text-white/45 [@media(hover:none)]:text-white/35"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
          {normalized ? (
            <span
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusBadgeClass(normalized)}`}
            >
              {pipelineColumnLabel(normalized)}
            </span>
          ) : null}
        </div>

        <div className="group mt-3 border-t border-white/10 pt-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/35">Their message</p>
            {editing !== "message" ? (
              <button
                type="button"
                onClick={() => startEdit("message")}
                aria-label="Edit message"
                className="shrink-0 rounded-md p-1 text-white/30 transition-all hover:bg-white/5 hover:text-white/55 group-hover:text-white/45 [@media(hover:none)]:text-white/35"
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          {editing === "message" ? (
            <textarea
              ref={(el) => {
                editInputRef.current = el;
              }}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelEditing();
                }
              }}
              onBlur={() => {
                if (escapeRef.current) return;
                void commitEditing();
              }}
              rows={4}
              className={`${EDIT_INPUT} mt-1 resize-y`}
              placeholder="Notes from the lead…"
              aria-label="Lead message"
            />
          ) : (
            <p className="mt-1 text-sm leading-relaxed text-white/65">
              {lead.message?.trim() ? `“${lead.message.trim()}”` : <span className="text-white/35">No message</span>}
            </p>
          )}
        </div>

        <p className="mt-3 text-[11px] text-white/35">Added {formatLeadDate(lead.created_at)}</p>
      </div>

      {/* Status-aware coach */}
      {coach && normalized ? (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">Pipeline coaching</p>
          <p className="mt-2 text-sm font-medium text-white/90">{coach.stageLine}</p>
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            <span className="text-indigo-300/90">Next best action: </span>
            {coach.nextHint}
          </p>
          {nextStageLabel && normalized !== "won" && normalized !== "lost" ? (
            <p className="mt-2 text-[11px] text-white/40">
              Forward stage after this: <span className="text-white/55">{nextStageLabel}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {err ? (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {err}
        </div>
      ) : null}

      {/* Generate */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">AI closing strategy</p>
            <p className="mt-1 text-[11px] text-white/35">{offerHint}</p>
          </div>
          <button
            type="button"
            disabled={loading || !sessionToken}
            onClick={() => void generateClosingStrategy()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Generating…" : result ? "Regenerate" : "Generate closing strategy"}
          </button>
        </div>
        <p className="mt-2 text-[10px] text-white/30">Uses 1 credit · Powered by Claude</p>
      </div>

      {/* Tabs + strategy / messages / objections */}
      {result ? (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02]">
          <div className="flex border-b border-white/[0.08] p-1">
            {(
              [
                ["strategy", "Strategy"] as const,
                ["messages", "Messages"] as const,
                ["objections", "Objections"] as const
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                  tab === id
                    ? "bg-indigo-500/20 text-indigo-200"
                    : "text-white/45 hover:text-white/70"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="space-y-3 p-4">
            {tab === "strategy" ? (
              <>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400/90">Situation</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/75">{result.analysis}</p>
                </div>
                <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/[0.07] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300">Recommended next action</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/85">{result.next_action}</p>
                </div>
              </>
            ) : null}
            {tab === "messages" ? (
              <div className="space-y-3">
                {result.messages.map((m, i) => (
                  <div
                    key={`${m.label}-${i}`}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-indigo-300">{m.label}</p>
                      <button
                        type="button"
                        onClick={() => void navigator.clipboard.writeText(m.body)}
                        className="shrink-0 text-[10px] font-medium text-indigo-400 underline hover:text-indigo-300"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">{m.body}</p>
                  </div>
                ))}
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-lg border border-dashed border-white/15 py-2.5 text-center text-xs text-white/35"
                >
                  Send via Email (soon)
                </button>
              </div>
            ) : null}
            {tab === "objections" ? (
              <div className="space-y-3">
                {result.objections.map((o, i) => (
                  <div
                    key={`${o.objection.slice(0, 24)}-${i}`}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Objection</p>
                    <p className="mt-1 text-sm text-white/80">{o.objection}</p>
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-indigo-400/90">Response</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/70">{o.response}</p>
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard.writeText(o.response)}
                      className="mt-2 text-[10px] font-medium text-indigo-400 underline hover:text-indigo-300"
                    >
                      Copy response
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-10 text-center text-sm text-white/40">
          Drafting your closing plan…
        </div>
      ) : null}

      {/* Quick actions */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">Quick actions</p>
        <div className="flex flex-col gap-2">
          {normalized ? (
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-wider text-white/35">Status</span>
              <select
                value={normalized}
                onChange={(e) => {
                  const next = normalizePipelineStatus(e.target.value);
                  if (next !== normalized) onStatusChange?.(next);
                }}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm font-medium text-white outline-none transition-colors focus:border-indigo-500/45"
              >
                {PIPELINE_COLUMNS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {nextStageLabel && normalized !== "won" && normalized !== "lost" ? (
            <p className="text-[11px] text-white/35">Suggested next stage: {nextStageLabel}</p>
          ) : null}
          {onCreateProposal ? (
            <button
              type="button"
              onClick={onCreateProposal}
              className="w-full rounded-xl border border-white/15 py-2.5 text-sm font-medium text-white/75 transition-colors hover:border-indigo-500/35 hover:text-white"
            >
              Create proposal
            </button>
          ) : null}
          <a
            href={`mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent("Re: your inquiry")}`}
            className="block w-full rounded-xl border border-white/15 py-2.5 text-center text-sm font-medium text-white/75 transition-colors hover:border-white/25 hover:text-white"
          >
            Open in email app
          </a>
          {lead.payment_link?.trim() ? (
            <>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                💳 Invoice sent
              </div>
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(lead.payment_link || "")}
                className="w-full rounded-xl border border-emerald-500/35 py-2.5 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/10"
              >
                Copy payment link
              </button>
            </>
          ) : normalized === "won" ? (
            <button
              type="button"
              onClick={onOpenInvoice}
              className="w-full rounded-xl border border-white/15 py-2.5 text-sm font-medium text-white/60 transition-colors hover:border-indigo-500/35 hover:text-indigo-300"
            >
              Send invoice →
            </button>
          ) : null}
        </div>
      </div>

      <div className="pt-1">
        {deleteConfirm ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/[0.06] p-3">
            <p className="mb-3 text-xs leading-relaxed text-red-200/85">Delete this lead permanently?</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => void confirmDeleteLead()}
                className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/30 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteConfirm(false)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 transition-colors hover:text-white/70 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="text-[11px] font-medium text-red-500/45 transition-colors hover:text-red-400/80"
          >
            Delete lead
          </button>
        )}
      </div>
        </div>
      </div>
    </div>
  );
}
