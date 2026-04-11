"use client";

import { flushSync } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
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

export default function DashboardOfferPage() {
  const d = useDashboardData();
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

  const headerRight =
    offer && !editing ? (
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">Active</span>
        <button
          type="button"
          onClick={() => {
            setSaveErr(null);
            setDraft({ ...(pendingRefinement ?? offer) });
            setPendingRefinement(null);
            setEditing(true);
          }}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:border-white/25 hover:text-white"
        >
          Edit offer
        </button>
      </div>
    ) : null;

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
            ? "Your core positioning and value proposition"
            : "Tell us what you do — AI will craft your positioning, headline, and pricing in 30 seconds."
        }
        isStepDone={!!offer}
        nextStepLabel="Landing page"
        nextStepHref="/dashboard/landing"
        right={headerRight}
      >
      {!offer ? (
        <>
          <div className="mx-auto flex max-w-lg flex-col items-center py-4">
            <div className="mb-6 w-16 text-indigo-400/90" aria-hidden>
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-20 w-20">
                <rect x="12" y="8" width="40" height="48" rx="4" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20h24M20 28h18M20 36h22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M38 44l6 6 10-12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="w-full space-y-5">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">What do you do?</label>
                <textarea
                  className="dash-focusable dash-offer-gen-field w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-indigo-500/50"
                  value={whatYouDo}
                  onChange={(e) => setWhatYouDo(e.target.value)}
                  placeholder="I'm a UX designer who helps SaaS startups..."
                  rows={4}
                  style={{ ...textareaStyle, border: undefined, background: undefined }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">Who is your ideal client?</label>
                <textarea
                  className="dash-focusable dash-offer-gen-field w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-indigo-500/50"
                  value={idealClient}
                  onChange={(e) => setIdealClient(e.target.value)}
                  placeholder="Founders and PMs at B2B SaaS companies..."
                  rows={4}
                  style={{ ...textareaStyle, border: undefined, background: undefined }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">What&apos;s your price range?</label>
                <input
                  className="dash-focusable dash-offer-gen-field w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-indigo-500/50"
                  type="text"
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  placeholder="$2,000–5,000/project"
                  style={{ ...dash.input, marginTop: 0, width: "100%", boxSizing: "border-box" as const, border: undefined, background: undefined }}
                />
              </div>
            </div>
            {genError ? <p className="mt-4 text-center text-sm text-red-400">{genError}</p> : null}
            <button
              type="button"
              disabled={genLoading}
              onClick={() => void generateOffer()}
              className="mt-6 w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {genLoading ? "Generating…" : "Generate my offer →"}
            </button>
            <p className="mt-2 text-center text-xs text-white/30">
              Uses 5 credits
              {credits !== null ? ` · You have ${credits} credits` : ""}
            </p>
          </div>

          {variants && variants.length === 3 ? (
            <div className="mt-6">
              {chooseError ? <p className="mb-3 text-xs text-red-400">{chooseError}</p> : null}
              <p className="mb-4 text-lg font-medium text-white">Pick your strategy</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {[...variants]
                  .sort((a, b) => a.variant.localeCompare(b.variant))
                  .map((v) => {
                    const isA = v.variant === "A";
                    return (
                      <div
                        key={v.variant}
                        className={`flex cursor-pointer flex-col rounded-xl border bg-white/[0.04] p-5 transition-colors hover:border-indigo-500/40 ${
                          isA ? "border-indigo-500/30" : "border-white/10"
                        }`}
                      >
                        <span className="mb-3 block text-[10px] font-medium uppercase tracking-widest text-white/40">
                          {v.variant}
                        </span>
                        {isA ? (
                          <span className="mb-2 inline-block rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] text-indigo-400">
                            ✦ Recommended
                          </span>
                        ) : null}
                        <h3 className="mb-3 text-sm font-semibold leading-snug text-white">{v.headline}</h3>
                        {v.label ? <p className="mb-3 text-xs text-white/45">{v.label}</p> : null}
                        <div className="mb-3">
                          <p className="mb-1 text-[10px] uppercase tracking-wider text-white/30">Offer</p>
                          <p className="text-xs leading-relaxed text-white/65">{v.offer}</p>
                        </div>
                        <div className="mb-3">
                          <p className="mb-1 text-[10px] uppercase tracking-wider text-white/30">Audience</p>
                          <p className="text-xs leading-relaxed text-white/65">{v.audience}</p>
                        </div>
                        <div className="mb-3">
                          <p className="mb-1 text-[10px] uppercase tracking-wider text-white/30">Pricing</p>
                          <p className="text-xs leading-relaxed text-white/65">{v.pricing}</p>
                        </div>
                        <div className="mb-3">
                          <p className="mb-1 text-[10px] uppercase tracking-wider text-white/30">Positioning</p>
                          <p className="text-xs leading-relaxed text-white/65">{v.positioning}</p>
                        </div>
                        <button
                          type="button"
                          disabled={chooseLoading !== null}
                          onClick={() => void chooseVariant(v)}
                          className="mt-2 w-full rounded-lg bg-indigo-600 py-2.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
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
            <p
              style={{
                margin: "0 0 12px",
                fontSize: 12,
                color: "var(--accent)",
                fontFamily: "inherit"
              }}
            >
              You have unsaved AI improvements — review the card and click &quot;Save improved offer&quot; below.
            </p>
          ) : null}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-1" style={{ boxSizing: "border-box" }}>
            {fields.map((item, idx) => {
              const src = editing && draft ? draft : displayOffer!;
              const value = src[item.key];
              const last = idx === fields.length - 1;
              return (
                <div
                  key={item.key}
                  style={{
                    paddingTop: 16,
                    paddingBottom: 16,
                    borderBottom: last ? "none" : "1px solid #1C1C22"
                  }}
                >
                  <p style={dash.sectionTitle}>{item.label}</p>
                  {editing && draft ? (
                    item.multiline ? (
                      <textarea
                        className="dash-focusable"
                        value={draft[item.key]}
                        onChange={(e) => setDraft({ ...draft, [item.key]: e.target.value })}
                        style={textareaStyle}
                        rows={4}
                      />
                    ) : (
                      <input
                        className="dash-focusable"
                        type="text"
                        value={draft[item.key]}
                        onChange={(e) => setDraft({ ...draft, [item.key]: e.target.value })}
                        style={{ ...dash.input, marginTop: 4 }}
                      />
                    )
                  ) : (
                    <div style={{ fontSize: 15, color: "#FFFFFF", marginTop: 4, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {value}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
              {saveErr ? <p style={{ margin: 0, fontSize: 12, color: "var(--danger)" }}>{saveErr}</p> : null}
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                style={{ ...dash.btnPrimary, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer", alignSelf: "flex-start" }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setDraft(null);
                  setSaveErr(null);
                }}
                style={{ ...dash.btnGhost, alignSelf: "flex-start" }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04]">
              <button
                type="button"
                onClick={() => setRefineOpen((o) => !o)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-white/50 transition-colors hover:text-white/70"
              >
                Refine it
                <span className="text-white/35" aria-hidden>
                  {refineOpen ? "▴" : "▾"}
                </span>
              </button>
              {refineOpen ? (
                <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
              <div
                style={{
                  marginTop: 0,
                  maxHeight: 200,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10
                }}
              >
                {refineLog.slice(-5).map((m, i) => (
                  <div
                    key={`${m.role}-${i}-${m.text.slice(0, 24)}`}
                    style={{
                      alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "92%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: m.role === "user" ? "rgba(6,182,212,0.12)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${m.role === "user" ? "rgba(6,182,212,0.25)" : "#1C1C22"}`,
                      fontSize: 12,
                      lineHeight: 1.55,
                      color: m.role === "user" ? "#E4E4E7" : "#A1A1AA",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word"
                    }}
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
                className="dash-focusable dash-offer-gen-field"
                style={{
                  width: "100%",
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #1C1C22",
                  background: "#0A0A0D",
                  color: "#FAFAFA",
                  fontFamily: "inherit",
                  fontSize: 13,
                  lineHeight: 1.5,
                  resize: "none",
                  boxSizing: "border-box",
                  outline: "none"
                }}
              />
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {REFINE_QUICK.map((label) => (
                  <button
                    key={label}
                    type="button"
                    disabled={refineLoading}
                    onClick={() => applyRefineQuick(label)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 6,
                      border: "1px solid #1C1C22",
                      background: "rgba(255,255,255,0.04)",
                      color: "#A1A1AA",
                      fontSize: 11,
                      fontFamily: "inherit",
                      cursor: refineLoading ? "not-allowed" : "pointer",
                      opacity: refineLoading ? 0.5 : 1
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {refineError ? (
                <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--danger)" }}>{refineError}</p>
              ) : null}
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                <button
                  type="button"
                  disabled={refineLoading || !refineInput.trim() || !d.sessionToken}
                  onClick={() => void improveOfferFromFeedback()}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: "var(--accent)",
                    color: "#0A0A0D",
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "inherit",
                    cursor:
                      refineLoading || !refineInput.trim() || !d.sessionToken ? "not-allowed" : "pointer",
                    opacity: refineLoading || !refineInput.trim() || !d.sessionToken ? 0.5 : 1
                  }}
                >
                  {refineLoading ? "…" : "Improve →"}
                </button>
                {pendingRefinement ? (
                  <button
                    type="button"
                    disabled={saveRefineLoading}
                    onClick={() => void saveRefinedOffer()}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "1px solid var(--accent)",
                      background: "transparent",
                      color: "var(--accent)",
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: "inherit",
                      cursor: saveRefineLoading ? "not-allowed" : "pointer",
                      opacity: saveRefineLoading ? 0.6 : 1
                    }}
                  >
                    {saveRefineLoading ? "Saving…" : "Save improved offer"}
                  </button>
                ) : null}
              </div>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
      </DashboardStepShell>
    </div>
  );
}
