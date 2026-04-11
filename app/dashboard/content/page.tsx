"use client";

import ContentMachine from "@/components/ContentMachine";
import { DashboardStepShell } from "@/components/dashboard/DashboardStepShell";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";

export default function DashboardContentPage() {
  const d = useDashboardData();
  const st = d.dashboardStatus;
  const completedCount = st?.completedSteps ?? 0;
  const funnelContentDone = !!(st?.offer && st?.landing);

  return (
    <div className="min-h-full" style={{ background: "var(--content-bg)" }}>
      <DashboardStepShell
        stepNum={3}
        completedCount={completedCount}
        title="Content"
        subtitle="Generate posts for your social channels"
        isStepDone={funnelContentDone}
        nextStepLabel="Leads & closing"
        nextStepHref="/dashboard/leads"
      >
        {d.userId ? (
          <ContentMachine offer={d.offer?.offer ?? ""} audience={d.offer?.audience ?? ""} userId={d.userId} />
        ) : null}
      </DashboardStepShell>
    </div>
  );
}
