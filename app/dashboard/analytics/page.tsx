"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { useProjectContext } from "@/app/contexts/ProjectContext";
import { getSupabaseClient } from "@/lib/supabase";

type LeadRow = {
  id: string;
  created_at: string;
  name: string | null;
  email: string;
  slug?: string | null;
  status: string | null;
};

const FUNNEL_STATUSES = [
  "new",
  "contacted",
  "replied",
  "call_booked",
  "proposal_sent",
  "won"
] as const;

type FunnelStatus = (typeof FUNNEL_STATUSES)[number];

const FUNNEL_STAGES: { label: string; status: FunnelStatus; color: string }[] = [
  { label: "New", status: "new", color: "bg-white/20" },
  { label: "Contacted", status: "contacted", color: "bg-blue-500/60" },
  { label: "Replied", status: "replied", color: "bg-indigo-500/60" },
  { label: "Call Booked", status: "call_booked", color: "bg-violet-500/60" },
  { label: "Proposal", status: "proposal_sent", color: "bg-amber-500/60" },
  { label: "Won", status: "won", color: "bg-emerald-500/60" }
];

const STATUS_LABELS: Record<FunnelStatus | "lost", string> = {
  new: "New",
  contacted: "Contacted",
  replied: "Replied",
  call_booked: "Call booked",
  proposal_sent: "Proposal sent",
  won: "Won",
  lost: "Lost"
};

const STATUS_BADGE_COLORS: Record<FunnelStatus | "lost", string> = {
  new: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  contacted: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  replied: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  call_booked: "bg-violet-500/25 text-violet-300 border-violet-500/35",
  proposal_sent: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  won: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  lost: "bg-red-500/20 text-red-400 border-red-500/30"
};

function normalizeStatus(s: string | null | undefined): FunnelStatus | "lost" {
  let v = (s ?? "new").trim().toLowerCase();
  if (v === "in_talks") v = "replied";
  const all = [...FUNNEL_STATUSES, "lost"] as const;
  if ((all as readonly string[]).includes(v)) return v as FunnelStatus | "lost";
  return "new";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return "—";
  }
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  const n = normalizeStatus(status);
  const cls = STATUS_BADGE_COLORS[n] ?? STATUS_BADGE_COLORS.new;
  return (
    <span className={`inline-block rounded-lg border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {STATUS_LABELS[n] ?? n}
    </span>
  );
}

function leadSource(slug: string | null | undefined): string {
  const s = (slug ?? "").trim().toLowerCase();
  return s === "manual" ? "Manual" : "Landing";
}

export default function DashboardAnalyticsPage() {
  const router = useRouter();
  const d = useDashboardData();
  const { activeProject } = useProjectContext();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [landingViews, setLandingViews] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const projectId = activeProject?.id;
    if (!d.userId || !projectId) {
      setLeads([]);
      setLandingViews(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function run() {
      const supabase = getSupabaseClient();
      const { data: leadData, error: leadError } = await supabase
        .from("leads")
        .select("id, created_at, name, email, slug, status")
        .eq("user_id", d.userId!)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      const { data: landingData, error: landingError } = await supabase
        .from("landing_pages")
        .select("views")
        .eq("user_id", d.userId!)
        .eq("project_id", projectId);

      if (cancelled) return;

      if (leadError || !leadData) {
        setLeads([]);
      } else {
        setLeads(leadData as LeadRow[]);
      }

      if (landingError || !landingData?.length) {
        setLandingViews(0);
      } else {
        const rows = landingData as { views: number | null }[];
        const sum = rows.reduce((a, r) => a + (Number(r.views) || 0), 0);
        setLandingViews(sum);
      }

      setLoading(false);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [d.userId, activeProject?.id]);

  const totalLeads = leads.length;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newThisWeek = leads.filter((r) => new Date(r.created_at).getTime() >= weekAgo).length;
  const wonDeals = leads.filter((r) => normalizeStatus(r.status) === "won").length;
  const landingViewsNum = landingViews ?? 0;

  const metrics = useMemo(
    () => [
      {
        label: "Total leads",
        value: String(totalLeads),
        sub: `+${newThisWeek} this week`,
        color: totalLeads > 0 ? "text-white" : "text-white/30"
      },
      {
        label: "Landing views",
        value: String(landingViewsNum),
        sub: "People visited your page",
        color: landingViewsNum > 0 ? "text-indigo-400" : "text-white/30",
        highlight: landingViewsNum > 0
      },
      {
        label: "Won deals",
        value: String(wonDeals),
        sub: wonDeals > 0 ? "🎉 Keep going!" : "Close your first deal",
        color: wonDeals > 0 ? "text-emerald-400" : "text-white/30"
      },
      {
        label: "Conversion rate",
        value: totalLeads > 0 ? `${Math.round((wonDeals / totalLeads) * 100)}%` : "—",
        sub: "Leads → Won deals",
        color: "text-white"
      }
    ],
    [totalLeads, newThisWeek, wonDeals, landingViewsNum]
  );

  function countInFunnel(status: FunnelStatus): number {
    return leads.filter((l) => normalizeStatus(l.status) === status).length;
  }

  const recentLeads = leads.slice(0, 10);

  return (
    <div className="min-h-full" style={{ background: "var(--content-bg)" }}>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Your results</h1>
        <p className="mt-1 text-sm text-white/45">Leads, views, and pipeline at a glance</p>
      </div>

      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : (
        <>
          {totalLeads === 0 ? (
            <div className="mb-8 rounded-2xl border border-indigo-500/15 bg-indigo-500/5 p-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/15">
                <svg
                  className="h-6 w-6 text-indigo-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden
                >
                  <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7 15l4-4 4 4 5-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="mb-2 font-medium text-white">Share your landing page to get leads</h3>
              <p className="mx-auto mb-4 max-w-xs text-sm text-white/40">
                Once someone visits your page and fills the form, they&apos;ll appear here automatically
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/landing")}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white transition-colors hover:bg-indigo-500"
                >
                  Share landing page →
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/content")}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/50 transition-colors hover:text-white/70"
                >
                  Create content
                </button>
              </div>
            </div>
          ) : null}

          {totalLeads > 0 ? (
            <>
              <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {metrics.map((m) => (
                  <div
                    key={m.label}
                    className={`rounded-xl border p-5 ${
                      "highlight" in m && m.highlight
                        ? "border-indigo-500/25 bg-indigo-500/[0.06]"
                        : "border-white/[0.08] bg-white/[0.03]"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-wider text-white/40">{m.label}</p>
                    <p className={`mt-2 text-3xl font-bold ${m.color}`}>{m.value}</p>
                    <p className="mt-1 text-xs text-white/35">{m.sub}</p>
                  </div>
                ))}
              </div>

              <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
                <h2 className="mb-4 text-sm font-semibold text-white">Pipeline funnel</h2>
                <div className="space-y-2">
                  {FUNNEL_STAGES.map((stage) => {
                    const count = countInFunnel(stage.status);
                    const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
                    return (
                      <div key={stage.status} className="flex items-center gap-3">
                        <span className="w-24 shrink-0 text-right text-xs text-white/40">{stage.label}</span>
                        <div className="h-6 flex-1 overflow-hidden rounded-lg bg-white/5">
                          <div
                            className={`flex h-full items-center rounded-lg px-2 transition-all ${stage.color}`}
                            style={{ width: `${Math.max(pct, count > 0 ? 8 : 3)}%` }}
                          >
                            {count > 0 ? (
                              <span className="text-[10px] font-medium text-white">{count}</span>
                            ) : null}
                          </div>
                        </div>
                        <span className="w-8 shrink-0 text-xs text-white/30">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                <div className="border-b border-white/6 px-6 py-4">
                  <h2 className="text-sm font-semibold text-white">Recent leads</h2>
                </div>
                <div className="overflow-x-auto px-4 py-2 sm:px-6">
                  <table className="w-full min-w-[520px]">
                    <thead>
                      <tr className="border-b border-white/6 text-left text-xs text-white/30">
                        <th className="pb-3 pr-4">Lead</th>
                        <th className="pb-3 pr-4">Source</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLeads.map((lead) => (
                        <tr key={lead.id} className="border-b border-white/4 last:border-0 hover:bg-white/[0.02]">
                          <td className="py-3 pr-4">
                            <p className="text-sm text-white">{lead.name?.trim() || lead.email}</p>
                            <p className="text-xs text-white/30">{lead.email}</p>
                          </td>
                          <td className="py-3 pr-4 text-xs text-white/45">{leadSource(lead.slug)}</td>
                          <td className="py-3 pr-4">
                            <StatusBadge status={lead.status} />
                          </td>
                          <td className="py-3 pr-4 text-xs text-white/30">{formatDate(lead.created_at)}</td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => router.push("/dashboard/leads")}
                              className="text-xs text-indigo-400 hover:text-indigo-300"
                            >
                              View →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
