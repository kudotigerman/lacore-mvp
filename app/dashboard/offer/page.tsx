"use client";

import { flushSync } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import type { OfferVariant } from "@/app/api/generate-offer/route";
import { ONBOARDING_GENERATING_KEY, ONBOARDING_INPUT_KEY } from "@/app/components/OnboardingWizard";
import { DashPageHeader } from "@/components/dashboard/DashPageHeader";
import { dash } from "@/components/dashboard/dashTokens";
import type { DashboardOffer } from "@/components/dashboard/DashboardDataContext";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { getSupabaseClient } from "@/lib/supabase";

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
        body: JSON.stringify({ userInput })
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
  }, []);

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
      const { error } = await supabase
        .from("offers")
        .update({
          offer: pendingRefinement.offer,
          audience: pendingRefinement.audience,
          pricing: pendingRefinement.pricing,
          positioning: pendingRefinement.positioning,
          headline: pendingRefinement.headline
        } as never)
        .eq("user_id", d.userId);
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
      const { error } = await supabase
        .from("offers")
        .update({
          offer: draft.offer,
          audience: draft.audience,
          pricing: draft.pricing,
          positioning: draft.positioning,
          headline: draft.headline
        } as never)
        .eq("user_id", d.userId);
      if (error) {
        setSaveErr(error.message);
        return;
      }
      d.setOffer(draft);
      setDraft(null);
      setEditing(false);
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
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={dash.badgeSuccess}>Active</span>
        <button
          type="button"
          onClick={() => {
            setSaveErr(null);
            setDraft({ ...(pendingRefinement ?? offer) });
            setPendingRefinement(null);
            setEditing(true);
          }}
          style={dash.btnGhostEdit}
        >
          Edit
        </button>
      </div>
    ) : null;

  return (
    <div style={dash.pageShell}>
      <DashPageHeader title="Your Offer" subtitle="Your core positioning and value proposition" right={headerRight} />

      {!offer ? (
        <>
          <div style={{ ...dash.card }}>
            <p style={{ ...dash.body, margin: "0 0 20px" }}>
              You don&apos;t have an offer saved yet. Describe your business below and we&apos;ll generate three
              strategies to choose from.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <p style={dash.sectionTitle}>What do you do?</p>
                <textarea
                  className="dash-focusable dash-offer-gen-field"
                  value={whatYouDo}
                  onChange={(e) => setWhatYouDo(e.target.value)}
                  placeholder="e.g. I'm a fitness coach helping busy professionals lose weight..."
                  rows={4}
                  style={{ ...textareaStyle }}
                />
              </div>
              <div>
                <p style={dash.sectionTitle}>Who is your ideal client?</p>
                <textarea
                  className="dash-focusable dash-offer-gen-field"
                  value={idealClient}
                  onChange={(e) => setIdealClient(e.target.value)}
                  placeholder="e.g. Men 30-45, corporate jobs, no time to exercise..."
                  rows={4}
                  style={{ ...textareaStyle }}
                />
              </div>
              <div>
                <p style={dash.sectionTitle}>What is your price range?</p>
                <input
                  className="dash-focusable dash-offer-gen-field"
                  type="text"
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  placeholder="e.g. $500-2000/month"
                  style={{ ...dash.input, marginTop: 4, width: "100%", boxSizing: "border-box" as const }}
                />
              </div>
            </div>
            {genError ? <p style={{ margin: "16px 0 0", fontSize: 12, color: "var(--danger)" }}>{genError}</p> : null}
            <button
              type="button"
              disabled={genLoading}
              onClick={() => void generateOffer()}
              style={{
                ...dash.btnPrimary,
                marginTop: 20,
                opacity: genLoading ? 0.6 : 1,
                cursor: genLoading ? "not-allowed" : "pointer"
              }}
            >
              {genLoading ? "Generating…" : "⚡ GENERATE MY OFFER →"}
            </button>
          </div>

          {variants && variants.length === 3 ? (
            <div style={{ marginTop: 24 }}>
              {chooseError ? (
                <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--danger)" }}>{chooseError}</p>
              ) : null}
              <p style={{ ...dash.sectionTitle, marginBottom: 12 }}>Pick a strategy</p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 16
                }}
              >
                {[...variants]
                  .sort((a, b) => a.variant.localeCompare(b.variant))
                  .map((v) => (
                    <div
                      key={v.variant}
                      style={{
                        ...dash.card,
                        padding: 20,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10
                      }}
                    >
                      <span style={{ fontSize: 36, fontWeight: 800, color: "var(--accent)", lineHeight: 1 }}>
                        {v.variant}
                      </span>
                      <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.12em", color: "var(--text-muted)" }}>
                        {v.label}
                      </p>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.25 }}>
                        {v.headline}
                      </h3>
                      <p style={{ ...dash.small, margin: 0 }}>
                        <span style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>Offer</span>
                        <br />
                        {v.offer}
                      </p>
                      <p style={{ ...dash.small, margin: 0 }}>
                        <span style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>Audience</span>
                        <br />
                        {v.audience}
                      </p>
                      <p style={{ ...dash.small, margin: 0 }}>
                        <span style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>Pricing</span>
                        <br />
                        {v.pricing}
                      </p>
                      <p style={{ ...dash.small, margin: 0 }}>
                        <span style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>Positioning</span>
                        <br />
                        {v.positioning}
                      </p>
                      <button
                        type="button"
                        disabled={chooseLoading !== null}
                        onClick={() => void chooseVariant(v)}
                        style={{
                          ...dash.btnPrimary,
                          marginTop: 8,
                          alignSelf: "flex-start",
                          opacity: chooseLoading && chooseLoading !== v.variant ? 0.5 : 1,
                          cursor: chooseLoading ? "not-allowed" : "pointer"
                        }}
                      >
                        {chooseLoading === v.variant ? "Saving…" : "Use this strategy →"}
                      </button>
                    </div>
                  ))}
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
          <div style={{ ...dash.card }}>
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
            <div
              style={{
                marginTop: 24,
                background: "#111116",
                border: "1px solid #1C1C22",
                borderRadius: 8,
                padding: "20px 24px",
                boxSizing: "border-box"
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "#52525B",
                  fontFamily: "inherit",
                  letterSpacing: "0.04em"
                }}
              >
                Not quite right? Refine it →
              </p>
              <div
                style={{
                  marginTop: 14,
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
          )}
        </>
      )}
    </div>
  );
}
