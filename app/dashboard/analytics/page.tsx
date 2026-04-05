"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { DashPageHeader } from "@/components/dashboard/DashPageHeader";
import { dash } from "@/components/dashboard/dashTokens";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { getSupabaseClient } from "@/lib/supabase";

type LeadRow = {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  status: string | null;
};

const ACCENT = "#06B6D4";
const BG = "#0A0A0D";
const CARD = "#111116";
const BORDER = "#1C1C22";
const TEXT = "#FAFAFA";
const TEXT_MUTED = "#A1A1AA";
const GRID = "#1C1C22";

const STATUS_ORDER = ["new", "contacted", "in_talks", "won", "lost"] as const;

const STATUS_COLORS: Record<(typeof STATUS_ORDER)[number], string> = {
  new: "#06B6D4",
  contacted: "#8B5CF6",
  in_talks: "#F59E0B",
  won: "#10B981",
  lost: "#EF4444"
};

const STATUS_LABELS: Record<(typeof STATUS_ORDER)[number], string> = {
  new: "New",
  contacted: "Contacted",
  in_talks: "In talks",
  won: "Won",
  lost: "Lost"
};

function toLocalDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildLast30DaysSeries(): { key: string; label: string; count: number }[] {
  const out: { key: string; label: string; count: number }[] = [];
  const anchor = new Date();
  anchor.setHours(12, 0, 0, 0);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${day}`;
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    out.push({ key, label, count: 0 });
  }
  return out;
}

function normalizeStatus(s: string | null | undefined): (typeof STATUS_ORDER)[number] {
  const v = (s ?? "new").trim().toLowerCase();
  if (STATUS_ORDER.includes(v as (typeof STATUS_ORDER)[number])) {
    return v as (typeof STATUS_ORDER)[number];
  }
  return "new";
}

function formatShortDate(iso: string): string {
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

const tooltipStyle = {
  backgroundColor: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  color: TEXT
};

export default function DashboardAnalyticsPage() {
  const d = useDashboardData();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [landingViews, setLandingViews] = useState<number | null>(null);
  const [viewsMeta, setViewsMeta] = useState<"ok" | "unavailable">("ok");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!d.userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function run() {
      const supabase = getSupabaseClient();
      const { data: leadData, error: leadError } = await supabase
        .from("leads")
        .select("id, created_at, name, email, status")
        .eq("user_id", d.userId!)
        .order("created_at", { ascending: false });

      const { data: landingData, error: landingError } = await supabase
        .from("landing_pages")
        .select("views")
        .eq("user_id", d.userId!);

      if (cancelled) return;

      if (leadError || !leadData) {
        setLeads([]);
      } else {
        setLeads(leadData as LeadRow[]);
      }

      if (landingError || !landingData) {
        setLandingViews(0);
        setViewsMeta("unavailable");
      } else {
        const rows = landingData as { views: number | null }[];
        const sum = rows.reduce((a, r) => a + (Number(r.views) || 0), 0);
        setLandingViews(sum);
        setViewsMeta("ok");
      }

      setLoading(false);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [d.userId]);

  const totalLeads = leads.length;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = leads.filter((r) => new Date(r.created_at).getTime() >= weekAgo).length;
  const wonDeals = leads.filter((r) => normalizeStatus(r.status) === "won").length;

  const timeSeries = useMemo(() => {
    const series = buildLast30DaysSeries();
    const map = new Map(series.map((s) => [s.key, s]));
    for (const lead of leads) {
      const k = toLocalDateKey(lead.created_at);
      const slot = map.get(k);
      if (slot) slot.count += 1;
    }
    return series;
  }, [leads]);

  const hasLeadsInRange = useMemo(() => timeSeries.some((s) => s.count > 0), [timeSeries]);

  const statusChartData = useMemo(() => {
    const counts: Record<(typeof STATUS_ORDER)[number], number> = {
      new: 0,
      contacted: 0,
      in_talks: 0,
      won: 0,
      lost: 0
    };
    for (const lead of leads) {
      counts[normalizeStatus(lead.status)] += 1;
    }
    return STATUS_ORDER.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      count: counts[status],
      fill: STATUS_COLORS[status]
    }));
  }, [leads]);

  const hasAnyLead = totalLeads > 0;

  const recentFive = leads.slice(0, 5);

  const metric = (label: string, value: string | number, sub?: string) => (
    <div style={{ ...dash.card, background: CARD, border: `1px solid ${BORDER}` }}>
      <p style={{ ...dash.sectionTitle, marginBottom: 0 }}>{label}</p>
      <div style={{ ...dash.metricNumber, marginTop: 8, color: TEXT }}>{value}</div>
      {sub ? (
        <p style={{ ...dash.metricCaption, color: viewsMeta === "unavailable" ? "#F59E0B" : "#52525B" }}>{sub}</p>
      ) : null}
    </div>
  );

  const viewsCaption =
    viewsMeta === "unavailable"
      ? "Coming soon"
      : landingViews === 0
        ? "Coming soon"
        : undefined;

  return (
    <div style={{ ...dash.pageShell, background: BG }}>
      <DashPageHeader title="Analytics" subtitle="Track your growth and performance" />

      {loading ? (
        <p style={{ ...dash.body, color: TEXT_MUTED }}>Loading…</p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 12,
              marginBottom: 24
            }}
            className="dash-analytics-metrics"
          >
            <style>{`
              @media (max-width: 900px) {
                .dash-analytics-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
              }
              @media (max-width: 480px) {
                .dash-analytics-metrics { grid-template-columns: 1fr !important; }
              }
            `}</style>
            {metric("TOTAL LEADS", totalLeads)}
            {metric("THIS WEEK", thisWeek)}
            {metric("LANDING VIEWS", landingViews ?? 0, viewsCaption)}
            {metric("WON DEALS", wonDeals)}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 16,
              marginBottom: 24
            }}
            className="dash-analytics-charts"
          >
            <style>{`
              @media (max-width: 960px) {
                .dash-analytics-charts { grid-template-columns: 1fr !important; }
              }
            `}</style>

            <div style={{ ...dash.card, background: CARD, border: `1px solid ${BORDER}`, minHeight: 340 }}>
              <p style={{ ...dash.sectionTitle, marginBottom: 16 }}>Leads over time</p>
              <p style={{ fontSize: 12, color: TEXT_MUTED, margin: "0 0 12px" }}>Last 30 days</p>
              <div style={{ position: "relative", width: "100%", height: 260 }}>
                {hasLeadsInRange ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeSeries} margin={{ top: 4, right: 8, left: -18, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: TEXT_MUTED, fontSize: 10 }}
                        tickLine={false}
                        axisLine={{ stroke: BORDER }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: TEXT_MUTED, fontSize: 10 }}
                        tickLine={false}
                        axisLine={{ stroke: BORDER }}
                        width={36}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelStyle={{ color: TEXT_MUTED }}
                        formatter={(value) => [String(value ?? 0), "Leads"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke={ACCENT}
                        strokeWidth={2}
                        dot={{ fill: ACCENT, r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: ACCENT }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `1px dashed ${BORDER}`,
                      borderRadius: 8,
                      color: "#52525B",
                      fontSize: 14
                    }}
                  >
                    No leads yet
                  </div>
                )}
              </div>
            </div>

            <div style={{ ...dash.card, background: CARD, border: `1px solid ${BORDER}`, minHeight: 340 }}>
              <p style={{ ...dash.sectionTitle, marginBottom: 16 }}>Leads by status</p>
              <div style={{ position: "relative", width: "100%", height: 280 }}>
                {hasAnyLead ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statusChartData}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={{ stroke: BORDER }} />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={88}
                        tick={{ fill: TEXT_MUTED, fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: BORDER }}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => [String(value ?? 0), "Leads"]}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
                        {statusChartData.map((entry) => (
                          <Cell key={entry.status} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `1px dashed ${BORDER}`,
                      borderRadius: 8,
                      color: "#52525B",
                      fontSize: 14
                    }}
                  >
                    No leads yet
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ ...dash.card, background: CARD, border: `1px solid ${BORDER}` }}>
            <p style={{ ...dash.sectionTitle, marginBottom: 16 }}>Recent leads</p>
            {recentFive.length === 0 ? (
              <p style={{ ...dash.body, margin: 0, color: TEXT_MUTED }}>No leads yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {recentFive.map((r, i) => {
                  const st = normalizeStatus(r.status);
                  const pillBg = `${STATUS_COLORS[st]}33`;
                  return (
                    <div
                      key={r.id}
                      style={{
                        padding: "12px 0",
                        borderBottom: i === recentFive.length - 1 ? "none" : `1px solid ${BORDER}`,
                        fontSize: 13,
                        color: TEXT_MUTED
                      }}
                    >
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                        <span style={{ color: TEXT, fontWeight: 600 }}>{r.name?.trim() || "—"}</span>
                        <span style={{ color: TEXT_MUTED }}>{r.email?.trim() || "—"}</span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            padding: "4px 8px",
                            borderRadius: 6,
                            background: pillBg,
                            color: STATUS_COLORS[st],
                            border: `1px solid ${STATUS_COLORS[st]}55`
                          }}
                        >
                          {STATUS_LABELS[st]}
                        </span>
                        <span style={{ color: "#52525B", marginLeft: "auto", fontSize: 12 }}>
                          {formatShortDate(r.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
