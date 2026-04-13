"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardStepShell } from "@/components/dashboard/DashboardStepShell";
import { LandingEditorSplitView } from "@/components/dashboard/LandingEditorSplitView";
import { useCreditsBalance } from "@/components/dashboard/useCreditsBalance";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { getSupabaseClient } from "@/lib/supabase";

export default function DashboardLandingPage() {
  const d = useDashboardData();
  const { userId, setLandingSlug, activeProject } = d;
  const credits = useCreditsBalance();
  const [views, setViews] = useState<number | null>(null);

  const landingUrl = d.landingSlug ? `https://www.lacore.ai/p/${d.landingSlug}` : "";

  const refreshViews = useCallback(() => {
    if (!d.userId || !d.landingSlug || !activeProject?.id) return;
    const supabase = getSupabaseClient();
    void supabase
      .from("landing_pages")
      .select("views")
      .eq("user_id", d.userId)
      .eq("project_id", activeProject.id)
      .eq("slug", d.landingSlug)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { views?: unknown } | null;
        const v = row?.views;
        setViews(typeof v === "number" ? v : 0);
      });
  }, [d.userId, d.landingSlug, activeProject?.id]);

  useEffect(() => {
    refreshViews();
  }, [refreshViews]);

  useEffect(() => {
    const projectId = activeProject?.id;
    const uid = userId;
    if (!projectId || !uid) return;

    async function loadExistingLanding() {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("landing_pages")
        .select("id, slug")
        .eq("project_id", projectId)
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const row = data as { slug?: string };
        if (row.slug) setLandingSlug(row.slug);
        return;
      }

      const { data: fallbackData, error: fallbackError } = await supabase
        .from("landing_pages")
        .select("id, slug")
        .eq("user_id", uid)
        .is("project_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackError || !fallbackData) return;
      const fallbackRow = fallbackData as { id?: string; slug?: string };
      if (fallbackRow.slug) {
        setLandingSlug(fallbackRow.slug);
      }

      if (fallbackRow.id) {
        void supabase
          .from("landing_pages")
          .update({ project_id: projectId } as never)
          .eq("id", fallbackRow.id)
          .eq("user_id", uid);
      }
    }
    void loadExistingLanding();
  }, [activeProject?.id, userId, setLandingSlug]);

  const st = d.dashboardStatus;
  const completedCount = st?.completedSteps ?? 0;
  const stepDone = !!d.landingSlug;

  if (d.loading) {
    return (
      <div className="flex min-h-full items-center justify-center" style={{ background: "var(--content-bg)" }}>
        <p className="text-sm text-white/40">Loading…</p>
      </div>
    );
  }

  if (d.landingSlug && d.offer) {
    return (
      <div className="min-h-full" style={{ background: "var(--content-bg)" }}>
        <LandingEditorSplitView
          slug={d.landingSlug}
          publicUrl={landingUrl}
          views={views}
          onViewsRefresh={refreshViews}
        />
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: "var(--content-bg)" }}>
      <DashboardStepShell
        stepNum={2}
        completedCount={completedCount}
        title="Landing page"
        subtitle="Your public sales page — built from your offer"
        isStepDone={stepDone}
        nextStepLabel="Content"
        nextStepHref="/dashboard/content"
        hideNextStepBanner={false}
      >
        {!d.offer ? (
          <p className="text-sm text-white/45">Add your offer first on the Offer page.</p>
        ) : (
          <div className="mx-auto flex max-w-lg flex-col items-center">
            <div className="mb-6 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 text-left">
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/35">Your offer (preview)</p>
              <p className="mt-2 text-sm font-medium text-white/80">{d.offer.headline}</p>
              <p className="mt-2 text-xs leading-relaxed text-white/45 line-clamp-4">{d.offer.offer}</p>
            </div>
            <p className="mb-6 text-center text-sm text-white/50">
              Your offer is ready. Now let&apos;s build your sales page.
            </p>
            <button
              type="button"
              onClick={() => void d.handleBuildLandingPage()}
              disabled={d.buildingLanding}
              className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {d.buildingLanding ? "Generating…" : "Generate landing page →"}
            </button>
            <p className="mt-2 text-center text-xs text-white/30">
              Uses 10 credits
              {credits !== null ? ` · You have ${credits} credits` : ""}
            </p>
            <p className="mt-1 text-center text-xs text-white/25">Creates a complete sales page from your offer</p>
            {d.buildError ? <p className="mt-4 text-center text-sm text-red-400">{d.buildError}</p> : null}
          </div>
        )}
      </DashboardStepShell>
    </div>
  );
}
