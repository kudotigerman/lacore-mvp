"use client";

import { useCallback, useState } from "react";
import LeadsList from "@/components/LeadsList";
import { DashPageHeader } from "@/components/dashboard/DashPageHeader";
import { dash } from "@/components/dashboard/dashTokens";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { useProjectContext } from "@/app/contexts/ProjectContext";

export default function DashboardLeadsPage() {
  const d = useDashboardData();
  const { activeProject } = useProjectContext();
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [leadCount, setLeadCount] = useState<number | null>(null);

  const onLeadsLoaded = useCallback((n: number) => setLeadCount(n), []);

  const headerRight =
    leadCount !== null ? (
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: "var(--accent)",
            background: "rgba(6,182,212,0.1)",
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid rgba(6,182,212,0.25)"
          }}
        >
          {leadCount} lead{leadCount === 1 ? "" : "s"}
        </span>
        <button type="button" onClick={() => setRefreshNonce((n) => n + 1)} style={dash.btnGhost}>
          Refresh
        </button>
      </div>
    ) : (
      <button type="button" onClick={() => setRefreshNonce((n) => n + 1)} style={dash.btnGhost}>
        Refresh
      </button>
    );

  return (
    <div style={dash.pageShell}>
      <DashPageHeader title="Leads" subtitle="People who filled your landing page form" right={headerRight} />
      {d.userId ? (
        <LeadsList
          userId={d.userId}
          projectId={activeProject?.id ?? null}
          showToolbar={false}
          variant="cards"
          refreshNonce={refreshNonce}
          onLeadsLoaded={onLeadsLoaded}
        />
      ) : null}
    </div>
  );
}
