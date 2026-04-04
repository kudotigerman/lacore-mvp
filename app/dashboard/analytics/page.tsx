"use client";

import { useEffect, useState } from "react";
import { DashPageHeader } from "@/components/dashboard/DashPageHeader";
import { dash } from "@/components/dashboard/dashTokens";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { getSupabaseClient } from "@/lib/supabase";

type Row = { id: string; created_at: string; name: string | null; email: string };

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

export default function DashboardAnalyticsPage() {
  const d = useDashboardData();
  const [total, setTotal] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [recent, setRecent] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!d.userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function run() {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("leads")
        .select("id, created_at, name, email")
        .eq("user_id", d.userId!)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error || !data) {
        setTotal(0);
        setWeekCount(0);
        setRecent([]);
        setLoading(false);
        return;
      }
      const rows = data as Row[];
      setTotal(rows.length);
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      setWeekCount(rows.filter((r) => new Date(r.created_at).getTime() >= weekAgo).length);
      setRecent(rows.slice(0, 5));
      setLoading(false);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [d.userId]);

  const metric = (label: string, value: string | number, sub?: string) => (
    <div style={{ ...dash.card }}>
      <p style={{ ...dash.sectionTitle, marginBottom: 0 }}>{label}</p>
      <div style={{ ...dash.metricNumber, marginTop: 8 }}>{value}</div>
      {sub ? <p style={dash.metricCaption}>{sub}</p> : null}
    </div>
  );

  return (
    <div style={dash.pageShell}>
      <DashPageHeader title="Analytics" subtitle="Track your growth and performance" />

      {loading ? (
        <p style={dash.body}>Loading…</p>
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
            {metric("LEADS TOTAL", total)}
            {metric("THIS WEEK", weekCount)}
            {metric("LANDING VIEWS", 0, "Coming soon")}
            {metric("CONVERSION", "0%", "Coming soon")}
          </div>

          <div style={{ ...dash.card }}>
            <p style={{ ...dash.sectionTitle, marginBottom: 16 }}>Recent Leads</p>
            {recent.length === 0 ? (
              <p style={{ ...dash.body, margin: 0 }}>No leads yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {recent.map((r, i) => (
                  <div
                    key={r.id}
                    style={{
                      padding: "10px 0",
                      borderBottom: i === recent.length - 1 ? "none" : "1px solid #1C1C22",
                      fontSize: 13,
                      color: "#A1A1AA"
                    }}
                  >
                    <span style={{ color: "#FFFFFF", fontWeight: 500 }}>{r.name?.trim() || "—"}</span>
                    {" · "}
                    {r.email}
                    {" · "}
                    <span style={{ color: "#52525B" }}>{formatRelativeTime(r.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
