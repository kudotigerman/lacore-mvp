"use client";

import ContentMachine from "@/components/ContentMachine";
import { DashPageHeader } from "@/components/dashboard/DashPageHeader";
import { dash } from "@/components/dashboard/dashTokens";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";

export default function DashboardContentPage() {
  const d = useDashboardData();

  return (
    <div style={dash.pageShell}>
      <DashPageHeader title="Content Machine" subtitle="Generate posts for your social channels" />
      {d.userId ? (
        <ContentMachine offer={d.offer?.offer ?? ""} audience={d.offer?.audience ?? ""} userId={d.userId} />
      ) : null}
    </div>
  );
}
