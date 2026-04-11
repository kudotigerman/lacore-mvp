"use client";

import { useCallback, useEffect, useState } from "react";
import LeadsList, { type LeadRow, type LeadsListStatusFilter } from "@/components/LeadsList";
import LeadClosingPanel from "@/components/dashboard/LeadClosingPanel";
import { DashboardStepShell } from "@/components/dashboard/DashboardStepShell";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { useProjectContext } from "@/app/contexts/ProjectContext";

function MailInboxIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="8" y="16" width="48" height="36" rx="4" stroke="currentColor" strokeWidth="2" className="text-white/20" />
      <path d="M8 24 L32 40 L56 24" stroke="currentColor" strokeWidth="2" className="text-indigo-400/80" strokeLinecap="round" />
    </svg>
  );
}

const FILTERS: { id: LeadsListStatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "in_progress", label: "In Progress" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" }
];

export default function DashboardLeadsPage() {
  const d = useDashboardData();
  const { activeProject } = useProjectContext();
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [leadTotal, setLeadTotal] = useState<number | null>(null);
  const [filter, setFilter] = useState<LeadsListStatusFilter>("all");
  const [selected, setSelected] = useState<LeadRow | null>(null);

  useEffect(() => {
    setSelected(null);
  }, [filter]);

  const onLeadsLoaded = useCallback((n: number) => {
    setLeadTotal(n);
  }, []);

  const refreshStatus = d.refreshDashboardStatus;
  useEffect(() => {
    if (leadTotal === null) return;
    void refreshStatus();
  }, [leadTotal, refreshStatus]);

  const st = d.dashboardStatus;
  const completedCount = st?.completedSteps ?? 0;
  const url = d.landingSlug ? `https://www.lacore.ai/p/${d.landingSlug}` : "";

  async function copyLanding() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
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
        {!d.userId ? null : leadTotal === null ? (
          <LeadsList
            userId={d.userId}
            projectId={activeProject?.id ?? null}
            showToolbar={false}
            variant="cards"
            refreshNonce={refreshNonce}
            onLeadsLoaded={onLeadsLoaded}
            omitEmptyState
          />
        ) : leadTotal === 0 ? (
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
              onClick={() => {
                setLeadTotal(null);
                setRefreshNonce((n) => n + 1);
              }}
              className="mt-6 text-xs text-white/40 underline transition-colors hover:text-white/60"
            >
              Refresh status
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1 lg:max-w-[min(100%,420px)]">
              <div className="mb-3 flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150 ${
                      filter === f.id
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "bg-white/5 text-white/45 hover:bg-white/10"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setLeadTotal(null);
                    setRefreshNonce((n) => n + 1);
                  }}
                  className="ml-auto rounded-lg border border-white/15 px-3 py-1 text-xs text-white/50 hover:text-white/70"
                >
                  Refresh
                </button>
              </div>
              <LeadsList
                userId={d.userId}
                projectId={activeProject?.id ?? null}
                showToolbar={false}
                variant="cards"
                compactRows
                statusFilter={filter}
                selectedLeadId={selected?.id ?? null}
                onSelectLead={setSelected}
                hideInlineActions
                refreshNonce={refreshNonce}
                onLeadsLoaded={onLeadsLoaded}
              />
            </div>
            <div className="min-w-0 flex-[1.2]">
              <LeadClosingPanel lead={selected} sessionToken={d.sessionToken} salesContext={d.salesBuilderContext} />
            </div>
          </div>
        )}
      </DashboardStepShell>
    </div>
  );
}
