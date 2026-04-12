"use client";

import ContentMachine from "@/components/ContentMachine";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";

export default function DashboardContentPage() {
  const d = useDashboardData();

  return (
    <div className="min-h-full" style={{ background: "var(--content-bg)" }}>
      <div className="mb-8">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-indigo-400">Step 3</span>
          <span className="text-xs text-white/20">·</span>
          <span className="text-xs text-white/40">Share to get your first leads</span>
        </div>
        <h1 className="mb-1 text-2xl font-bold text-white">Content</h1>
        <p className="text-sm text-white/40">AI posts tailored to your offer — ready to copy and share</p>
      </div>
      {d.userId ? (
        <ContentMachine offer={d.offer?.offer ?? ""} audience={d.offer?.audience ?? ""} userId={d.userId} />
      ) : null}
    </div>
  );
}
