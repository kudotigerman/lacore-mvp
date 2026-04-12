"use client";

import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { OfferVariant } from "@/app/api/generate-offer/route";
import { ONBOARDING_GENERATING_KEY, ONBOARDING_INPUT_KEY } from "@/lib/onboarding-keys";
import { dashToast } from "@/lib/dash-toast";
import { DashboardStepShell } from "@/components/dashboard/DashboardStepShell";
import { useCreditsBalance } from "@/components/dashboard/useCreditsBalance";
import { dash } from "@/components/dashboard/dashTokens";
import type { DashboardOffer } from "@/components/dashboard/DashboardDataContext";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { getSupabaseClient } from "@/lib/supabase";
import { useProjectContext } from "@/app/contexts/ProjectContext";

const REFINE_QUICK = [
  "More aggressive",
  "Focus on ROI",
  "More specific niche",
  "Add guarantee"
] as const;

const OFFER_INSPIRATION = [
  {
    who: "UX Designer",
    offer:
      "I help SaaS startups reduce churn by redesigning their onboarding — in 3 weeks, fixed price.",
    result: "$8K/month",
    idealClient: "SaaS founders and product teams losing users after signup or trial"
  },
  {
    who: "Business Coach",
    offer:
      "I help burned-out executives find clarity and build a 90-day action plan — guaranteed results.",
    result: "$5K/client",
    idealClient: "Senior leaders and executives feeling stuck or overwhelmed at work"
  },
  {
    who: "SMM Agency",
    offer:
      "We grow Instagram accounts for fitness brands from 0 to 10K followers in 60 days — or we work for free.",
    result: "$3K/month retainer",
    idealClient: "Fitness and wellness brands that want serious Instagram growth"
  }
] as const;

function offerStrengthLabel(o: DashboardOffer): "Strong offer" | "Good offer" | "Needs work" {
  const longOffer = o.offer.trim().length > 100;
  const hasPricing = Boolean(o.pricing?.trim());
  const hasAudience = Boolean(o.audience?.trim());
  const n = [longOffer, hasPricing, hasAudience].filter(Boolean).length;
  if (n >= 3) return "Strong offer";
  if (n === 2) return "Good offer";
  return "Needs work";
}

function guaranteePillText(o: DashboardOffer): "Full refund" | "No guarantee" {
  const blob = `${o.offer} ${o.positioning} ${o.pricing}`.toLowerCase();
  if (
    /\b(money-?back|money\s+back|full\s+refund|refund|risk-?\s*free|double\s+your\s+money)\b/.test(blob) ||
    /\b(guarantee|guaranteed)\b/.test(blob) ||
    /\bor\s+we\s+work\s+for\s+free\b/.test(blob) ||
    /\b100%\s*satisfaction\b/.test(blob)
  ) {
    return "Full refund";
  }
  return "No guarantee";
}

function audienceShort(s: string): string {
  const t = s.trim();
  return t.length > 40 ? `${t.slice(0, 40)}…` : t;
}

function pricingShort(s: string): string {
  const t = s.trim();
  return t.length > 60 ? `${t.slice(0, 60)}…` : t;
}

function parseOfferRefinementJson(raw: string): DashboardOffer | null {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  }
  try {
    const o = JSON.parse(s) as Record<string, unknown>;
    const offer = typeof o.offer === "string" ? o.offer.trim() : "";
    const audience = typeof o.audience === "string" ? o.audience.trim() : "";
    const pricing = typeof o.pricing === "string" ? o.pricing.trim() : "";
    const positioning = typeof o.positioning === "string" ? o.positioning.trim() : "";
    const headline = typeof o.headline === "string" ? o.headline.trim() : "";
    if (!offer || !audience || !pricing || !positioning || !headline) return null;
    return { offer, audience, pricing, positioning, headline };
  } catch {
    return null;
  }
}

const fields = [
  { label: "OFFER", key: "offer" as const, multiline: true },
  { label: "AUDIENCE", key: "audience" as const, multiline: true },
  { label: "PRICING", key: "pricing" as const, multiline: true },
  { label: "POSITIONING", key: "positioning" as const, multiline: true },
  { label: "HEADLINE", key: "headline" as const, multiline: false }
];

const fieldLabelClass = "text-[11px] font-semibold uppercase tracking-wider text-white/40";
const fieldValueClass = "text-[15px] font-normal leading-relaxed text-white/90";

function OfferStrengthBadgeUi({ offer }: { offer: DashboardOffer }) {
  const label = offerStrengthLabel(offer);
  const ring =
    label === "Strong offer"
      ? "border-emerald-500/35 bg-emerald-500/[0.12] text-emerald-300"
      : label === "Good offer"
        ? "border-amber-500/35 bg-amber-500/[0.12] text-amber-200"
        : "border-red-500/40 bg-red-500/[0.1] text-red-300";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-wide ${ring}`}
    >
      {label}
    </span>
  );
}

function IndigoIconBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-500/25 bg-indigo-500/[0.08] text-indigo-400 [&_svg]:shrink-0">
      {children}
    </div>
  );
}

function IconDoc() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6M8 13h8M8 17h8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" strokeLinecap="round" />
    </svg>
  );
}

function IconTag() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 2H4v9l8 11 8-11V2h-8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 6h.01M13.5 6h.01" strokeLinecap="round" />
    </svg>
  );
}

export default function DashboardOfferPage() {
  const d = useDashboardData();
  const router = useRouter();
  const { activeProject } = useProjectContext();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DashboardOffer | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [whatYouDo, setWhatYouDo] = useState("");
  const [idealClient, setIdealClient] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [variants, setVariants] = useState<OfferVariant[] | null>(null);
  const [chooseLoading, setChooseLoading] = useState<"A" | "B" | "C" | null>(null);
  const [chooseError, setChooseError] = useState<string | null>(null);
  const onboardingAutoStarted = useRef(false);
  const whatYouDoRef = useRef<HTMLTextAreaElement>(null);

  const [refineLog, setRefineLog] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [refineInput, setRefineInput] = useState("");
  const [refineLoading, setRefineLoading] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [pendingRefinement, setPendingRefinement] = useState<DashboardOffer | null>(null);
  const [saveRefineLoading, setSaveRefineLoading] = useState(false);
  const refineTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [refineOpen, setRefineOpen] = useState(false);
  const credits = useCreditsBalance();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("lacore_prefill_offer");
      if (!raw?.trim()) return;
      localStorage.removeItem("lacore_prefill_offer");
      setWhatYouDo(raw.trim());
    } catch {
      /* ignore */
    }
  }, []);

  const offer = d.offer;
  const displayOffer = offer ? (pendingRefinement ?? offer) : null;

  function prefillForm(ex: (typeof OFFER_INSPIRATION)[number]) {
    setWhatYouDo(ex.offer);
    setIdealClient(ex.idealClient);
    setPriceRange(ex.result);
    requestAnimationFrame(() => {
      whatYouDoRef.current?.focus();
    });
  }

  const executeGenerate = useCallback(async (w: string, ideal: string, price: string) => {
    const userInput = [
      `What I do:\n${w.trim()}`,
      `Who is my ideal client:\n${ideal.trim()}`,
      `What is my price range:\n${price.trim()}`
    ].join("\n\n");
    if (!w.trim() || !ideal.trim() || !price.trim()) {
      setGenError("Please fill in all three fields.");
      return;
    }
    setGenError(null);
    setGenLoading(true);
    try {
      const res = await fetch("/api/generate-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput, project_id: activeProject?.id ?? null })
      });
      const data = (await res.json()) as { variants?: OfferVariant[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Request failed.");
      }
      if (!Array.isArray(data.variants) || data.variants.length !== 3) {
        throw new Error("Invalid response from server.");
      }
      setVariants(data.variants);
      setChooseError(null);
      dashToast("Your offer is ready! ✓");
      try {
        localStorage.removeItem(ONBOARDING_INPUT_KEY);
        sessionStorage.removeItem(ONBOARDING_GENERATING_KEY);
      } catch {
        /* ignore */
      }
    } catch (e) {
      setVariants(null);
      setGenError(e instanceof Error ? e.message : "Something went wrong.");
      try {
        sessionStorage.removeItem(ONBOARDING_GENERATING_KEY);
      } catch {
        /* ignore */
      }
    } finally {
      setGenLoading(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    if (!d.userId || onboardingAutoStarted.current) return;
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(ONBOARDING_INPUT_KEY);
    } catch {
      return;
    }
    if (!raw?.trim()) return;
    onboardingAutoStarted.current = true;
    try {
      localStorage.removeItem(ONBOARDING_INPUT_KEY);
    } catch {
      /* ignore */
    }
    const ideal =
      "Clients and teams who benefit from the outcome I described — we can refine this after you pick a strategy.";
    const price = "Flexible — project-based or retainer (we'll define packages in the generated offer).";
    setWhatYouDo(raw.trim());
    setIdealClient(ideal);
    setPriceRange(price);
    void executeGenerate(raw.trim(), ideal, price);
  }, [d.userId, executeGenerate]);

  async function generateOffer() {
    await executeGenerate(whatYouDo, idealClient, priceRange);
  }

  async function chooseVariant(v: OfferVariant) {
    if (!d.userId) {
      setChooseError("Session not ready. Refresh and try again.");
      return;
    }
    setChooseError(null);
    setChooseLoading(v.variant);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("offers").upsert(
        {
          user_id: d.userId,
          project_id: activeProject?.id ?? null,
          offer: v.offer,
          audience: v.audience,
          pricing: v.pricing,
          positioning: v.positioning,
          headline: v.headline
        } as never
      );
      if (error) throw error;
      await d.refreshOffer();
      setVariants(null);
      setWhatYouDo("");
      setIdealClient("");
      setPriceRange("");
    } catch (e) {
      setChooseError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setChooseLoading(null);
    }
  }

  async function saveRefinedOffer() {
    if (!d.userId || !pendingRefinement) return;
    setRefineError(null);
    setSaveRefineLoading(true);
    try {
      const supabase = getSupabaseClient();
      let query = supabase
        .from("offers")
        .update({
          offer: pendingRefinement.offer,
          audience: pendingRefinement.audience,
          pricing: pendingRefinement.pricing,
          positioning: pendingRefinement.positioning,
          headline: pendingRefinement.headline
        } as never)
        .eq("user_id", d.userId);
      if (activeProject?.id) {
        query = query.eq("project_id", activeProject.id);
      }
      const { error } = await query;
      if (error) throw error;
      d.setOffer(pendingRefinement);
      await d.refreshOffer();
      setPendingRefinement(null);
    } catch (e) {
      setRefineError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaveRefineLoading(false);
    }
  }

  async function improveOfferFromFeedback() {
    const feedback = refineInput.trim();
    if (!feedback || !d.sessionToken || !displayOffer) return;
    setRefineError(null);
    setRefineLoading(true);
    const base = displayOffer;
    const prior = refineLog
      .filter((m) => m.role === "user")
      .map((m) => m.text)
      .slice(-3);
    const priorBlock =
      prior.length > 0
        ? `Earlier feedback in this session (oldest first): ${prior.join(" → ")}\n\n`
        : "";
    const userContent = `${priorBlock}Improve my offer based on this feedback: ${feedback}

Current offer:
OFFER: ${base.offer}
AUDIENCE: ${base.audience}
PRICING: ${base.pricing}
POSITIONING: ${base.positioning}
HEADLINE: ${base.headline}

Return ONLY valid JSON (no markdown fences, no explanation) with exactly these string keys: "offer", "audience", "pricing", "positioning", "headline". Each value must be a non-empty string. Keep the same language as the current offer.`;

    setRefineLog((prev) => [...prev, { role: "user", text: feedback }]);

    try {
      const res = await fetch("/api/dashboard-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${d.sessionToken}`
        },
        body: JSON.stringify({
          message: userContent,
          salesContext: {
            offer: base.offer,
            audience: base.audience,
            pricing: base.pricing,
            positioning: base.positioning,
            headline: base.headline,
            slug: d.landingSlug
          }
        })
      });
      const json = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Request failed.");
      }
      const parsed = json.reply ? parseOfferRefinementJson(json.reply) : null;
      if (!parsed) {
        throw new Error("Could not parse improved offer. Try rephrasing your feedback.");
      }
      setPendingRefinement(parsed);
      setRefineInput("");
      setRefineLog((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Updated your offer — review the fields above, then save when you're happy."
        }
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setRefineError(msg);
      setRefineLog((prev) => [
        ...prev,
        { role: "assistant", text: `Couldn't apply that: ${msg}` }
      ]);
    } finally {
      setRefineLoading(false);
    }
  }

  function applyRefineQuick(text: string) {
    flushSync(() => {
      setRefineInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
    });
    const el = refineTextareaRef.current;
    if (el) {
      el.focus();
      const len = el.value.length;
      try {
        el.setSelectionRange(len, len);
      } catch {
        /* ignore */
      }
    }
  }

  async function save() {
    if (!d.userId || !draft) return;
    setSaveErr(null);
    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      let query = supabase
        .from("offers")
        .update({
          offer: draft.offer,
          audience: draft.audience,
          pricing: draft.pricing,
          positioning: draft.positioning,
          headline: draft.headline
        } as never)
        .eq("user_id", d.userId);
      if (activeProject?.id) {
        query = query.eq("project_id", activeProject.id);
      }
      const { error } = await query;
      if (error) {
        setSaveErr(error.message);
        return;
      }
      d.setOffer(draft);
      setDraft(null);
      setEditing(false);
      await d.refreshDashboardStatus();
    } finally {
      setSaving(false);
    }
  }

  const textareaStyle = {
    ...dash.input,
    resize: "vertical" as const,
    minHeight: 100,
    marginTop: 4
  };

  const st = d.dashboardStatus;
  const completedCount = st?.completedSteps ?? 0;

  return (
    <div className="min-h-full" style={dash.pageShell}>
      <DashboardStepShell
        stepNum={1}
        completedCount={completedCount}
        title={offer ? "Your offer" : "Define your offer"}
        subtitle={
          offer
            ? "Review, refine, or build your landing page."
            : "The clearest offers win. Tell AI what you do and who you help."
        }
        isStepDone={!!offer}
        nextStepLabel="Landing page"
        nextStepHref="/dashboard/landing"
        hideNextStepBanner={!!offer}
      >
      {!offer ? (
        <>
          <div className="mx-auto max-w-xl px-1 pb-6 pt-2">
            <div className="flex flex-col items-center text-center">
              <div
                className="mb-8 flex h-28 w-28 items-center justify-center rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/[0.18] via-indigo-500/[0.06] to-transparent text-indigo-400 shadow-[0_0_80px_-20px_rgba(99,102,241,0.55)]"
                aria-hidden
              >
                <svg viewBox="0 0 64 64" fill="none" className="h-14 w-14" xmlns="http://www.w3.org/2000/svg">
                  <rect x="12" y="8" width="40" height="48" rx="4" stroke="currentColor" strokeWidth="2" />
                  <path d="M20 20h24M20 28h18M20 36h22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M38 44l6 6 10-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <div className="mb-10 w-full">
              <p className={`mb-3 ${fieldLabelClass}`}>Examples that work</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {OFFER_INSPIRATION.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => prefillForm(ex)}
                    className="group rounded-xl border border-white/[0.08] bg-[var(--card-bg)]/80 p-4 text-left shadow-sm transition-all hover:border-indigo-500/35 hover:shadow-[0_0_32px_-8px_rgba(99,102,241,0.35)]"
                  >
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-400">{ex.who}</p>
                    <p className="mb-2 text-[13px] leading-relaxed text-white/55">{ex.offer}</p>
                    <p className="text-[13px] font-medium text-emerald-400/95">{ex.result}</p>
                    <p className="mt-2.5 text-[10px] text-white/25 transition-colors group-hover:text-indigo-400">
                      Use this example →
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-white/[0.08] bg-[var(--card-bg)]/90 p-5 shadow-sm">
                <label className={`mb-2 block ${fieldLabelClass}`}>What do you do?</label>
                <textarea
                  ref={whatYouDoRef}
                  className="dash-focusable dash-offer-gen-field w-full rounded-lg border border-white/10 bg-[var(--input-bg)] px-4 py-3 text-[15px] text-white placeholder:text-white/25 focus:border-indigo-500/50"
                  value={whatYouDo}
                  onChange={(e) => setWhatYouDo(e.target.value)}
                  placeholder="I'm a UX designer who helps SaaS startups..."
                  rows={4}
                  style={{ ...textareaStyle, border: undefined, background: undefined }}
                />
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[var(--card-bg)]/90 p-5 shadow-sm">
                <label className={`mb-2 block ${fieldLabelClass}`}>Who is your ideal client?</label>
                <textarea
                  className="dash-focusable dash-offer-gen-field w-full rounded-lg border border-white/10 bg-[var(--input-bg)] px-4 py-3 text-[15px] text-white placeholder:text-white/25 focus:border-indigo-500/50"
                  value={idealClient}
                  onChange={(e) => setIdealClient(e.target.value)}
                  placeholder="Founders and PMs at B2B SaaS companies..."
                  rows={4}
                  style={{ ...textareaStyle, border: undefined, background: undefined }}
                />
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[var(--card-bg)]/90 p-5 shadow-sm">
                <label className={`mb-2 block ${fieldLabelClass}`}>What&apos;s your price range?</label>
                <input
                  className="dash-focusable dash-offer-gen-field w-full rounded-lg border border-white/10 bg-[var(--input-bg)] px-4 py-3 text-[15px] text-white placeholder:text-white/25 focus:border-indigo-500/50"
                  type="text"
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  placeholder="$2,000–5,000/project"
                  style={{
                    ...dash.input,
                    marginTop: 0,
                    width: "100%",
                    boxSizing: "border-box" as const,
                    border: undefined,
                    background: undefined
                  }}
                />
              </div>
            </div>
            {genError ? <p className="mt-4 text-center text-sm text-red-400">{genError}</p> : null}
            <button
              type="button"
              disabled={genLoading}
              onClick={() => void generateOffer()}
              className="mt-8 w-full rounded-xl bg-indigo-600 py-4 text-[15px] font-semibold text-white shadow-[0_12px_40px_-8px_rgba(99,102,241,0.55)] transition-all hover:bg-indigo-500 hover:shadow-[0_16px_48px_-8px_rgba(99,102,241,0.6)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
            >
              {genLoading ? "Generating…" : "Generate offer →"}
            </button>
            <p className="mt-3 text-center text-[11px] text-white/35">
              Uses 5 credits
              {credits !== null ? ` · You have ${credits} credits` : ""}
            </p>
          </div>

          {variants && variants.length === 3 ? (
            <div className="mx-auto mt-2 max-w-6xl border-t border-white/[0.06] pt-10">
              {chooseError ? <p className="mb-4 text-sm text-red-400">{chooseError}</p> : null}
              <div className="mb-6 text-center">
                <p className={`inline-block rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-indigo-300`}>
                  Choose one
                </p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-white">Pick your strategy</h3>
                <p className="mt-1 text-sm text-white/40">Three angles — select the one that fits you best.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[...variants]
                  .sort((a, b) => a.variant.localeCompare(b.variant))
                  .map((v) => {
                    const isA = v.variant === "A";
                    return (
                      <div
                        key={v.variant}
                        className={`relative flex flex-col rounded-2xl border bg-gradient-to-b from-white/[0.06] to-transparent p-6 transition-all hover:border-indigo-500/40 ${
                          isA ? "border-indigo-500/40 shadow-[0_0_48px_-12px_rgba(99,102,241,0.35)]" : "border-white/[0.08]"
                        }`}
                      >
                        {isA ? (
                          <span className="absolute right-4 top-4 rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                            Recommended
                          </span>
                        ) : null}
                        <span className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Strategy {v.variant}</span>
                        <h4 className="mb-2 pr-16 text-base font-medium leading-snug text-white">{v.headline}</h4>
                        {v.label ? <p className="mb-4 text-[13px] text-white/45">{v.label}</p> : null}
                        <div className="flex flex-1 flex-col gap-3 text-[13px] leading-relaxed">
                          <div>
                            <p className={`mb-1 ${fieldLabelClass}`}>Offer</p>
                            <p className="text-white/65">{v.offer}</p>
                          </div>
                          <div>
                            <p className={`mb-1 ${fieldLabelClass}`}>Audience</p>
                            <p className="text-white/65">{v.audience}</p>
                          </div>
                          <div>
                            <p className={`mb-1 ${fieldLabelClass}`}>Pricing</p>
                            <p className="text-white/65">{v.pricing}</p>
                          </div>
                          <div>
                            <p className={`mb-1 ${fieldLabelClass}`}>Positioning</p>
                            <p className="text-white/65">{v.positioning}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={chooseLoading !== null}
                          onClick={() => void chooseVariant(v)}
                          className="mt-6 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {chooseLoading === v.variant ? "Saving…" : "Use this strategy"}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          {pendingRefinement ? (
            <div className="mb-3 rounded-xl border border-indigo-500/35 bg-indigo-500/[0.1] px-4 py-3 text-[13px] leading-relaxed text-indigo-100">
              You have unsaved AI improvements — open <strong className="text-white">Refine with AI</strong> below and
              click &quot;Save improved offer&quot;.
            </div>
          ) : null}

          {editing && draft ? (
            <div className="space-y-4 pb-6">
              {fields.map((item) => {
                const icon =
                  item.key === "pricing" ? (
                    <IconTag />
                  ) : item.key === "positioning" || item.key === "audience" ? (
                    <IconTarget />
                  ) : (
                    <IconDoc />
                  );
                return (
                  <div key={item.key} className="rounded-xl border border-white/[0.08] bg-[var(--card-bg)]/95 p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-3">
                      <IndigoIconBox>{icon}</IndigoIconBox>
                      <p className={`m-0 ${fieldLabelClass}`}>{item.label}</p>
                    </div>
                    {item.multiline ? (
                      <textarea
                        className="dash-focusable"
                        value={draft[item.key]}
                        onChange={(e) => setDraft({ ...draft, [item.key]: e.target.value })}
                        style={textareaStyle}
                        rows={item.key === "headline" ? 2 : 4}
                      />
                    ) : (
                      <input
                        className="dash-focusable"
                        type="text"
                        value={draft[item.key]}
                        onChange={(e) => setDraft({ ...draft, [item.key]: e.target.value })}
                        style={{ ...dash.input, marginTop: 0 }}
                      />
                    )}
                  </div>
                );
              })}
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
                {saveErr ? <p className="w-full text-sm text-red-400">{saveErr}</p> : null}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                  className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setDraft(null);
                    setSaveErr(null);
                  }}
                  style={dash.btnGhost}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : displayOffer ? (
            <>
              <div className="relative overflow-hidden rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/[0.14] via-[var(--card-bg)] to-[var(--content-bg)] px-5 py-5 shadow-[0_0_72px_-24px_rgba(99,102,241,0.45)] md:px-6">
                <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/[0.12] blur-3xl" aria-hidden />
                <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-violet-600/[0.08] blur-3xl" aria-hidden />
                <div className="relative">
                  <span className="inline-flex rounded-full border border-indigo-400/40 bg-indigo-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-100">
                    Offer ready
                  </span>
                  <h2 className="mt-3 max-w-4xl text-[22px] font-medium leading-snug tracking-tight text-white md:text-2xl">
                    {displayOffer.headline}
                  </h2>
                  <p className={`mt-2 max-w-3xl text-[15px] font-normal leading-relaxed text-white/70`}>
                    {displayOffer.offer}
                  </p>
                </div>
                <div className="relative mt-3 border-t border-white/[0.1] pt-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                    <div>
                      <p className={fieldLabelClass}>Audience</p>
                      <p className={`mt-1 ${fieldValueClass}`}>{audienceShort(displayOffer.audience)}</p>
                    </div>
                    <div>
                      <p className={fieldLabelClass}>Price point</p>
                      <p className={`mt-1 ${fieldValueClass}`}>{pricingShort(displayOffer.pricing)}</p>
                    </div>
                    <div>
                      <p className={fieldLabelClass}>Guarantee</p>
                      <p className={`mt-1 ${fieldValueClass}`}>{guaranteePillText(displayOffer)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="md:col-span-2 rounded-xl border border-white/[0.08] bg-[var(--card-bg)]/95 p-3 md:p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <IndigoIconBox>
                      <IconDoc />
                    </IndigoIconBox>
                    <p className={`m-0 ${fieldLabelClass}`}>Core offer</p>
                  </div>
                  <p className={`${fieldValueClass} whitespace-pre-wrap`}>{displayOffer.offer}</p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-[var(--card-bg)]/95 p-3 md:p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <IndigoIconBox>
                      <IconTarget />
                    </IndigoIconBox>
                    <p className={`m-0 ${fieldLabelClass}`}>Positioning</p>
                  </div>
                  <p className={`${fieldValueClass} whitespace-pre-wrap`}>{displayOffer.positioning}</p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-[var(--card-bg)]/95 p-3 md:p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <IndigoIconBox>
                      <IconTag />
                    </IndigoIconBox>
                    <p className={`m-0 ${fieldLabelClass}`}>Pricing</p>
                  </div>
                  <p className={`${fieldValueClass} whitespace-pre-wrap`}>{displayOffer.pricing}</p>
                </div>
              </div>

              <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.1] bg-[var(--card-bg)]/60 shadow-sm">
                <button
                  type="button"
                  onClick={() => setRefineOpen((o) => !o)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">Refine with AI</p>
                    <p className="mt-0.5 text-[11px] text-white/40">Tune copy with feedback — same flow as before.</p>
                  </div>
                  <span className="shrink-0 text-lg text-indigo-400/80" aria-hidden>
                    {refineOpen ? "▴" : "▾"}
                  </span>
                </button>
                {refineOpen ? (
                  <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
                    <div
                      className="flex max-h-[200px] flex-col gap-2.5 overflow-y-auto"
                      style={{ scrollbarGutter: "stable" }}
                    >
                      {refineLog.slice(-5).map((m, i) => (
                        <div
                          key={`${m.role}-${i}-${m.text.slice(0, 24)}`}
                          className={`max-w-[92%] rounded-lg border px-3 py-2.5 text-xs leading-relaxed ${
                            m.role === "user"
                              ? "self-end border-indigo-500/30 bg-indigo-500/10 text-zinc-200"
                              : "self-start border-white/[0.08] bg-white/[0.04] text-zinc-400"
                          }`}
                          style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                        >
                          {m.text}
                        </div>
                      ))}
                    </div>
                    <textarea
                      ref={refineTextareaRef}
                      value={refineInput}
                      onChange={(e) => setRefineInput(e.target.value)}
                      placeholder="e.g. Make it more aggressive, focus on ROI, target enterprise clients..."
                      disabled={refineLoading}
                      rows={3}
                      className="dash-focusable dash-offer-gen-field mt-4 w-full rounded-lg border border-white/[0.1] bg-[var(--input-bg)] px-3 py-2.5 text-[13px] text-white"
                      style={{
                        lineHeight: 1.5,
                        resize: "none",
                        boxSizing: "border-box",
                        outline: "none"
                      }}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {REFINE_QUICK.map((label) => (
                        <button
                          key={label}
                          type="button"
                          disabled={refineLoading}
                          onClick={() => applyRefineQuick(label)}
                          className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-zinc-400 transition-colors hover:border-indigo-500/30 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {refineError ? <p className="mt-3 text-xs text-red-400">{refineError}</p> : null}
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={refineLoading || !refineInput.trim() || !d.sessionToken}
                        onClick={() => void improveOfferFromFeedback()}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {refineLoading ? "…" : "Improve →"}
                      </button>
                      {pendingRefinement ? (
                        <button
                          type="button"
                          disabled={saveRefineLoading}
                          onClick={() => void saveRefinedOffer()}
                          className="rounded-lg border border-indigo-400/50 bg-transparent px-4 py-2 text-xs font-bold text-indigo-300 transition-colors hover:bg-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {saveRefineLoading ? "Saving…" : "Save improved offer"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          {!editing ? (
            <div className="sticky bottom-0 left-0 right-0 z-10 -mx-4 mt-5 flex flex-col gap-4 border-t border-white/[0.1] bg-[#07080F]/95 px-5 py-4 backdrop-blur-md sm:-mx-6 sm:flex-row sm:flex-wrap sm:items-center sm:px-8">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
                  ✓
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">Offer ready — next: build your landing page</p>
                  <p className="mt-0.5 text-xs text-white/40">AI will create a full sales page in 60 seconds</p>
                  <div className="mt-3 flex flex-wrap gap-4 sm:hidden">
                    <button
                      type="button"
                      onClick={() => setRefineOpen(true)}
                      className="text-xs font-medium text-white/45 transition-colors hover:text-white/75"
                    >
                      Refine first
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSaveErr(null);
                        setDraft({ ...(pendingRefinement ?? offer) });
                        setPendingRefinement(null);
                        setEditing(true);
                      }}
                      className="text-xs font-medium text-white/45 transition-colors hover:text-white/75"
                    >
                      Edit fields
                    </button>
                  </div>
                </div>
              </div>
              {displayOffer ? <OfferStrengthBadgeUi offer={displayOffer} /> : null}
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/landing")}
                  className="w-full shrink-0 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_32px_-8px_rgba(99,102,241,0.5)] transition-all hover:bg-indigo-500 sm:w-auto"
                >
                  Build landing page →
                </button>
                <div className="hidden gap-4 sm:flex sm:shrink-0">
                  <button
                    type="button"
                    onClick={() => setRefineOpen(true)}
                    className="whitespace-nowrap text-sm text-white/45 transition-colors hover:text-white/75"
                  >
                    Refine first
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSaveErr(null);
                      setDraft({ ...(pendingRefinement ?? offer) });
                      setPendingRefinement(null);
                      setEditing(true);
                    }}
                    className="whitespace-nowrap text-sm text-white/45 transition-colors hover:text-white/75"
                  >
                    Edit fields
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
      </DashboardStepShell>
    </div>
  );
}
