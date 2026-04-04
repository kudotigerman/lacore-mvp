"use client";

import ContentMachine from "@/components/ContentMachine";
import { dash } from "@/components/dashboard/dashTokens";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";

export default function DashboardContentPage() {
  const d = useDashboardData();

  return (
    <div style={{ padding: 48, boxSizing: "border-box" }}>
      <h1 style={{ ...dash.pageTitle, marginBottom: 28 }}>CONTENT MACHINE</h1>
      {d.userId ? (
        <ContentMachine offer={d.offer?.offer ?? ""} audience={d.offer?.audience ?? ""} userId={d.userId} />
      ) : null}
    </div>
  );
}
