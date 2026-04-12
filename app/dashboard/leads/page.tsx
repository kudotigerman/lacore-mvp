"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LeadKanbanCard } from "@/components/dashboard/LeadKanbanCard";
import LeadClosingPanel from "@/components/dashboard/LeadClosingPanel";
import { DashboardStepShell } from "@/components/dashboard/DashboardStepShell";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { useProjectContext } from "@/app/contexts/ProjectContext";
import { getSupabaseClient } from "@/lib/supabase";
import type { LeadRow } from "@/components/LeadsList";

function MailInboxIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="8" y="16" width="48" height="36" rx="4" stroke="currentColor" strokeWidth="2" className="text-white/20" />
      <path d="M8 24 L32 40 L56 24" stroke="currentColor" strokeWidth="2" className="text-indigo-400/80" strokeLinecap="round" />
    </svg>
  );
}

const COLUMNS = [
  { id: "new", label: "New", color: "border-white/20" },
  { id: "contacted", label: "Contacted", color: "border-blue-500/40" },
  { id: "replied", label: "Replied", color: "border-indigo-500/40" },
  { id: "call_booked", label: "Call Booked", color: "border-violet-500/40" },
  { id: "proposal_sent", label: "Proposal Sent", color: "border-amber-500/40" },
  { id: "won", label: "Won 🎉", color: "border-emerald-500/40" },
  { id: "lost", label: "Lost", color: "border-red-500/40" }
] as const;

type ColumnId = (typeof COLUMNS)[number]["id"];

const FORWARD_ORDER: Exclude<ColumnId, "lost">[] = [
  "new",
  "contacted",
  "replied",
  "call_booked",
  "proposal_sent",
  "won"
];

function normalizePipelineStatus(raw: string | null | undefined): ColumnId {
  const v = (raw ?? "new").trim().toLowerCase();
  if (v === "in_talks") return "replied";
  const ids = COLUMNS.map((c) => c.id);
  if (ids.includes(v as ColumnId)) return v as ColumnId;
  return "new";
}

function nextForwardStatus(current: ColumnId): ColumnId | null {
  if (current === "lost") return null;
  const i = FORWARD_ORDER.indexOf(current as (typeof FORWARD_ORDER)[number]);
  if (i < 0 || i >= FORWARD_ORDER.length - 1) return null;
  return FORWARD_ORDER[i + 1]!;
}

export default function DashboardLeadsPage() {
  const d = useDashboardData();
  const router = useRouter();
  const { activeProject } = useProjectContext();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LeadRow | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const st = d.dashboardStatus;
  const completedCount = st?.completedSteps ?? 0;
  const url = d.landingSlug ? `https://www.lacore.ai/p/${d.landingSlug}` : "";

  const fetchLeads = useCallback(async () => {
    if (!d.userId) {
      setLoading(false);
      setLeads([]);
      return;
    }
    setLoading(true);
    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setLoading(false);
      return;
    }
    const qs = activeProject?.id ? `?project_id=${encodeURIComponent(activeProject.id)}` : "";
    const res = await fetch(`/api/leads/list${qs}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    const json = (await res.json()) as { leads?: LeadRow[] };
    if (res.ok && Array.isArray(json.leads)) {
      setLeads(json.leads);
    } else {
      setLeads([]);
    }
    setLoading(false);
  }, [d.userId, activeProject?.id]);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads, refreshNonce]);

  async function copyLanding() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
  }

  const getLeadsByStatus = (colId: ColumnId) =>
    leads.filter((l) => normalizePipelineStatus(l.status) === colId);

  async function moveToNextStatus(leadId: string, currentStatus: ColumnId) {
    const next = nextForwardStatus(currentStatus);
    if (!next) return;
    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch("/api/leads/status", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ leadId, status: next })
    });
    if (!res.ok) return;
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: next } : l)));
    setSelected((s) => (s?.id === leadId ? { ...s, status: next } : s));
  }

  function generateProposalForLead(lead: LeadRow) {
    const params = new URLSearchParams();
    const name = lead.name?.trim() || lead.email.split("@")[0] || "Client";
    params.set("client", name);
    const problem =
      lead.message?.trim() ||
      `Follow up with ${lead.email} — turn this lead into a paying client.`;
    params.set("problem", problem);
    router.push(`/dashboard/proposals?${params.toString()}`);
  }

  return (
    <div className="min-h-full" style={{ background: "var(--content-bg)" }}>
      <DashboardStepShell
        stepNum={4}
        completedCount={completedCount}
        title="Leads & closing"
        subtitle="Capture leads from your landing page and close them with AI"
        isStepDone={!!st?.leads}
        nextStepLabel="Analytics"
        nextStepHref="/dashboard/analytics"
      >
        {!d.userId ? null : loading ? (
          <p className="text-sm text-white/40">Loading leads…</p>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 text-white/20">
              <MailInboxIcon />
            </div>
            <h3 className="mb-2 font-medium text-white">No leads yet</h3>
            <p className="mb-6 max-w-xs text-sm text-white/45">Share your landing page to start getting leads.</p>
            {url ? (
              <>
                <button
                  type="button"
                  onClick={() => void copyLanding()}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-indigo-500"
                >
                  Copy landing page link
                </button>
                <p className="mt-4 max-w-md break-all text-xs text-white/35">{url}</p>
              </>
            ) : (
              <p className="max-w-xs text-sm text-white/35">Create a landing page first to get a shareable link.</p>
            )}
            <button
              type="button"
              onClick={() => setRefreshNonce((n) => n + 1)}
              className="mt-6 text-xs text-white/40 underline transition-colors hover:text-white/60"
            >
              Refresh status
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setRefreshNonce((n) => n + 1)}
                  className="rounded-lg border border-white/15 px-3 py-1 text-xs text-white/50 hover:text-white/70"
                >
                  Refresh
                </button>
              </div>
              <div className="-mx-8 flex gap-3 overflow-x-auto px-8 pb-4 lg:grid lg:max-w-none lg:grid-cols-7 lg:overflow-visible lg:px-0">
                {COLUMNS.map((col) => {
                  const colLeads = getLeadsByStatus(col.id);
                  return (
                    <div key={col.id} className="w-56 flex-shrink-0 lg:w-auto">
                      <div className={`mb-3 border-t-2 pt-3 ${col.color}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-white/70">{col.label}</span>
                          <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-xs text-white/30">
                            {colLeads.length}
                          </span>
                        </div>
                      </div>
                      <div className="min-h-[100px] space-y-2">
                        {colLeads.map((lead) => {
                          const stNorm = normalizePipelineStatus(lead.status);
                          const showMove = nextForwardStatus(stNorm) !== null;
                          return (
                            <LeadKanbanCard
                              key={lead.id}
                              lead={lead}
                              selected={selected?.id === lead.id}
                              showMove={showMove}
                              onSelect={() => setSelected(lead)}
                              onMoveToNext={() => void moveToNextStatus(lead.id, stNorm)}
                              onGenerateProposal={() => generateProposalForLead(lead)}
                            />
                          );
                        })}
                        {colLeads.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-white/10 p-3 text-center">
                            <p className="text-xs text-white/20">
                              {col.id === "new"
                                ? "Share your landing page to get leads"
                                : "No leads here yet"}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="min-w-0 lg:w-[min(100%,420px)] lg:flex-shrink-0">
              <LeadClosingPanel lead={selected} sessionToken={d.sessionToken} salesContext={d.salesBuilderContext} />
            </div>
          </div>
        )}
      </DashboardStepShell>
    </div>
  );
}
