"use client";

import { useCallback, useState } from "react";
import LeadsList from "@/components/LeadsList";
import { dash } from "@/components/dashboard/dashTokens";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";

export default function DashboardLeadsPage() {
  const d = useDashboardData();
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [leadCount, setLeadCount] = useState<number | null>(null);

  const onLeadsLoaded = useCallback((n: number) => setLeadCount(n), []);

  return (
    <div style={{ padding: 48, boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
          <h1 style={dash.pageTitle}>LEADS</h1>
          {leadCount !== null ? (
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>
              {leadCount} lead{leadCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        <button type="button" onClick={() => setRefreshNonce((n) => n + 1)} style={dash.btnGhost}>
          REFRESH
        </button>
      </div>
      <p style={{ ...dash.small, margin: "0 0 24px" }}>Live leads from your landing page forms.</p>
      {d.userId ? (
        <LeadsList
          userId={d.userId}
          showToolbar={false}
          variant="cards"
          refreshNonce={refreshNonce}
          onLeadsLoaded={onLeadsLoaded}
        />
      ) : null}
    </div>
  );
}
