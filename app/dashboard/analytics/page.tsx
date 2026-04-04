"use client";

import { useEffect, useState } from "react";
import { dash } from "@/components/dashboard/dashTokens";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { getSupabaseClient } from "@/lib/supabase";

type Row = { id: string; created_at: string; name: string | null; email: string };

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

  const metric = (value: string | number, label: string, sub?: string) => (
    <div style={{ ...dash.card, flex: "1 1 160px", minWidth: 140 }}>
      <div style={{ fontSize: 48, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{value}</div>
      <p style={{ ...dash.sectionLabel, marginTop: 12 }}>{label}</p>
      {sub ? (
        <p style={{ ...dash.small, margin: "8px 0 0" }}>{sub}</p>
      ) : null}
    </div>
  );

  return (
    <div style={{ padding: 48, boxSizing: "border-box" }}>
      <h1 style={{ ...dash.pageTitle, marginBottom: 32 }}>ANALYTICS</h1>

      {loading ? (
        <p style={dash.body}>Loading…</p>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 40 }}>
            {metric(total, "LEADS TOTAL")}
            {metric(weekCount, "THIS WEEK")}
            {metric(0, "LANDING VIEWS", "Coming soon")}
            {metric("0%", "CONVERSION", "Coming soon")}
          </div>

          <p style={{ ...dash.sectionLabel, marginBottom: 16 }}>RECENT LEADS</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {recent.length === 0 ? (
              <p style={dash.body}>No leads yet.</p>
            ) : (
              recent.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: "14px 0",
                    borderBottom: "1px solid var(--border-primary)",
                    fontSize: 13,
                    color: "var(--text-secondary)"
                  }}
                >
                  <strong style={{ color: "var(--text-primary)" }}>{r.name?.trim() || "—"}</strong>
                  {" · "}
                  {r.email}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
