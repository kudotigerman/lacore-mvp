"use client";

import { useEffect, useMemo, useState } from "react";
import type { LeadRow } from "@/components/LeadsList";
import type { SalesBuilderContextPayload } from "@/components/dashboard/DashboardDataContext";
import {
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

export default function LeadClosingPanel({
  lead,
  sessionToken,
  salesContext,
  onMoveToNext,
  canMoveNext,
  onCreateProposal
}: {
  lead: LeadRow | null;
  sessionToken: string | null;
  salesContext: SalesBuilderContextPayload;
  onMoveToNext?: () => void;
  canMoveNext?: boolean;
  onCreateProposal?: () => void;
}) {
  const [tab, setTab] = useState<ClosingTab>("strategy");
  const [result, setResult] = useState<ClosingPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
  }, [lead?.id]);

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
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.1] bg-gradient-to-b from-white/[0.04] to-transparent p-8 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M12 3v4M5.6 5.6l2.8 2.8M3 12h4M5.6 18.4l2.8-2.8M12 21v-4M18.4 18.4l-2.8-2.8M21 12h-4M18.4 5.6l-2.8 2.8" strokeLinecap="round" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <p className="text-sm font-medium text-white/55">AI Closing Assistant</p>
        <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-white/35">
          Select a lead to open the AI closing assistant.
        </p>
      </div>
    );
  }

  const offerHint =
    salesContext.offer?.trim() && salesContext.offer !== "(Not saved yet — user can generate an offer from the home page.)"
      ? "Your saved offer will be used automatically when you generate a strategy."
      : "Add an offer on the Offer page for sharper AI advice.";

  return (
    <div className="flex h-[min(100vh-8rem,900px)] min-h-[360px] flex-col gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 shadow-[0_0_0_1px_rgba(99,102,241,0.06)]">
      {/* Lead header (fixed) */}
      <div className="shrink-0 rounded-xl border border-white/[0.08] bg-gradient-to-br from-indigo-500/[0.08] to-transparent p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-indigo-400/90">Selected lead</p>
            <p className="mt-1 truncate text-lg font-semibold text-white">{lead.name?.trim() || lead.email}</p>
            <p className="truncate text-sm text-white/50">{lead.email}</p>
            {lead.phone?.trim() ? (
              <p className="mt-0.5 text-sm text-white/45">{lead.phone}</p>
            ) : null}
          </div>
          {normalized ? (
            <span
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusBadgeClass(normalized)}`}
            >
              {pipelineColumnLabel(normalized)}
            </span>
          ) : null}
        </div>
        {lead.message?.trim() ? (
          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/35">Their message</p>
            <p className="mt-1 text-sm leading-relaxed text-white/65">&quot;{lead.message.trim()}&quot;</p>
          </div>
        ) : null}
        <p className="mt-3 text-[11px] text-white/35">Added {formatLeadDate(lead.created_at)}</p>
      </div>

      {/* Status-aware coach (fixed) */}
      {coach && normalized ? (
        <div className="shrink-0 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] p-4">
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
        <div className="shrink-0 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {err}
        </div>
      ) : null}

      {/* Generate (fixed) */}
      <div className="shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
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

      {/* Tabs (fixed) + scrollable strategy / messages / objections */}
      {result ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
          <div className="flex shrink-0 border-b border-white/[0.08] p-1">
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
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
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
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-6 text-center text-sm text-white/40">
          Drafting your closing plan…
        </div>
      ) : null}

      {/* Quick actions (pinned to bottom of panel) */}
      <div className="mt-auto shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">Quick actions</p>
        <div className="flex flex-col gap-2">
          {canMoveNext && onMoveToNext ? (
            <button
              type="button"
              onClick={onMoveToNext}
              className="w-full rounded-xl border border-indigo-500/30 bg-indigo-500/10 py-2.5 text-sm font-medium text-indigo-200 transition-colors hover:bg-indigo-500/15"
            >
              Move to next stage{nextStageLabel ? ` → ${nextStageLabel}` : ""}
            </button>
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
        </div>
      </div>
    </div>
  );
}
