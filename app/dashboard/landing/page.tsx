"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DomainConnect from "@/components/DomainConnect";
import { DashboardStepShell } from "@/components/dashboard/DashboardStepShell";
import { useCreditsBalance } from "@/components/dashboard/useCreditsBalance";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { useProjectContext } from "@/app/contexts/ProjectContext";
import StripeConnect from "@/components/StripeConnect";
import { LANDING_EDITOR_QUICK_STORAGE_KEY } from "@/lib/landingEditorQuickActions";
import { dashToast } from "@/lib/dash-toast";
import { getSupabaseClient } from "@/lib/supabase";
import Link from "next/link";

const LANDING_AI_QUICK_PROMPTS = [
  "Change colors",
  "Add testimonials section",
  "Add FAQ section",
  "Add Calendly booking",
  "Add WhatsApp button",
  "Make headline stronger"
] as const;

export default function DashboardLandingPage() {
  const d = useDashboardData();
  const router = useRouter();
  const { activeProject } = useProjectContext();
  const credits = useCreditsBalance();
  const [views, setViews] = useState<number | null>(null);
  const [aiEditCommand, setAiEditCommand] = useState("");
  const [previewError, setPreviewError] = useState(false);

  const landingUrl = d.landingSlug ? `https://www.lacore.ai/p/${d.landingSlug}` : "";
  const publicUrl = landingUrl;

  useEffect(() => {
    setPreviewError(false);
  }, [d.landingSlug]);

  useEffect(() => {
    if (!d.userId || !d.landingSlug || !activeProject?.id) {
      setViews(null);
      return;
    }
    let cancelled = false;
    const supabase = getSupabaseClient();
    void supabase
      .from("landing_pages")
      .select("views")
      .eq("user_id", d.userId)
      .eq("project_id", activeProject.id)
      .eq("slug", d.landingSlug)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const row = data as { views?: unknown } | null;
        const v = row?.views;
        setViews(typeof v === "number" ? v : 0);
      });
    return () => {
      cancelled = true;
    };
  }, [d.userId, d.landingSlug, activeProject?.id]);

  async function copyUrl() {
    if (!d.landingSlug) return;
    await navigator.clipboard.writeText(`https://www.lacore.ai/p/${d.landingSlug}`);
    dashToast("Link copied to clipboard!");
  }

  const url = landingUrl;
  const st = d.dashboardStatus;
  const completedCount = st?.completedSteps ?? 0;
  const stepDone = !!d.landingSlug;

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
      >
        {!d.offer ? (
          <p className="text-sm text-white/45">Add your offer first on the Offer page.</p>
        ) : !d.landingSlug ? (
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
        ) : (
          <div className="flex flex-wrap items-start gap-8">
            <div className="min-w-0 flex-[1.2] basis-[320px]">
              <div className="relative h-[min(70vh,560px)] w-full min-h-[400px] overflow-hidden rounded-xl border border-white/8 bg-white/3">
                <iframe
                  src={`/p/${d.landingSlug}`}
                  className="h-full w-full min-h-[400px] border-0 rounded-xl"
                  style={{ minHeight: "400px" }}
                  sandbox="allow-scripts allow-same-origin allow-forms"
                  title="Landing page preview"
                  onError={() => setPreviewError(true)}
                />
                {previewError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0D0F1A]">
                    <p className="mb-3 text-sm text-white/40">Preview not available</p>
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-400 hover:text-indigo-300"
                    >
                      Open in new tab ↗
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex min-w-[260px] flex-1 basis-[280px] flex-col gap-4">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Checklist</p>
                <ul className="mt-3 space-y-2 text-sm text-white/55">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Page created
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-white/25">○</span> Custom domain
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-white/25">○</span> Payment connected
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Public link</p>
                <div className="mt-2 flex gap-2">
                  <input
                    readOnly
                    value={url}
                    className="dash-focusable min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => void copyUrl()}
                    className="rounded-xl border border-white/15 px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white"
                  >
                    Copy
                  </button>
                </div>
                <p className="mt-3 text-xs text-white/35">
                  Views: <span className="text-white/60">{views === null ? "…" : views}</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/p/${d.landingSlug}?edit=true`}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-indigo-500"
                >
                  Open AI editor
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    d.setRegenerateError(null);
                    d.setRegenerateConfirm(true);
                  }}
                  disabled={d.buildingLanding}
                  className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/60 transition-colors hover:border-white/25 hover:text-white disabled:opacity-50"
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => void copyUrl()}
                  className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/60 transition-colors hover:border-white/25 hover:text-white"
                >
                  Share
                </button>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
                <p className="mb-3 text-sm font-medium text-white">Edit with AI</p>
                <textarea
                  value={aiEditCommand}
                  onChange={(e) => setAiEditCommand(e.target.value)}
                  rows={2}
                  placeholder="e.g. Change accent color to green, add a FAQ section..."
                  className="mb-4 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 transition-colors focus:border-indigo-500/50 focus:outline-none"
                />
                <div className="mb-4 flex flex-wrap gap-2">
                  {LANDING_AI_QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setAiEditCommand(prompt)}
                      className="cursor-pointer rounded-full border border-white/15 bg-transparent px-3 py-1.5 text-xs text-white/55 transition-colors hover:border-white/30 hover:text-white"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const t = aiEditCommand.trim();
                    if (!t) return;
                    try {
                      sessionStorage.setItem(LANDING_EDITOR_QUICK_STORAGE_KEY, t);
                    } catch {
                      /* ignore */
                    }
                    router.push(`/p/${d.landingSlug}?edit=true`);
                  }}
                  className="w-full rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
                >
                  Apply
                </button>
              </div>

              {d.regenerateConfirm ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-sm text-white/70">Replace your current site?</p>
                  {d.regenerateError ? <p className="mt-2 text-xs text-red-400">{d.regenerateError}</p> : null}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        d.setRegenerateError(null);
                        void d.handleRegenerateSiteConfirmed();
                      }}
                      disabled={d.buildingLanding}
                      className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        d.setRegenerateConfirm(false);
                        d.setRegenerateError(null);
                      }}
                      className="flex-1 rounded-lg border border-white/15 py-2 text-sm text-white/60"
                    >
                      No
                    </button>
                  </div>
                </div>
              ) : null}

              {d.userId ? (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Custom domain</p>
                  <div className="mt-2">
                    <DomainConnect slug={d.landingSlug} userId={d.userId} />
                  </div>
                </div>
              ) : null}

              {d.userId ? (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Payments</p>
                  <div className="mt-2">
                    <StripeConnect userId={d.userId} />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </DashboardStepShell>
    </div>
  );
}
