"use client";

import { useState } from "react";
import type { OfferVariant } from "@/app/api/generate-offer/route";
import { DashPageHeader } from "@/components/dashboard/DashPageHeader";
import { dash } from "@/components/dashboard/dashTokens";
import type { DashboardOffer } from "@/components/dashboard/DashboardDataContext";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { getSupabaseClient } from "@/lib/supabase";

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

  const offer = d.offer;

  async function generateOffer() {
    const userInput = [
      `What I do:\n${whatYouDo.trim()}`,
      `Who is my ideal client:\n${idealClient.trim()}`,
      `What is my price range:\n${priceRange.trim()}`
    ].join("\n\n");
    if (!whatYouDo.trim() || !idealClient.trim() || !priceRange.trim()) {
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
    } catch (e) {
      setVariants(null);
      setGenError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setGenLoading(false);
    }
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
            setDraft({ ...offer });
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
                  className="dash-focusable"
                  value={whatYouDo}
                  onChange={(e) => setWhatYouDo(e.target.value)}
                  placeholder="I help small businesses with interior design..."
                  rows={4}
                  style={{ ...textareaStyle }}
                />
              </div>
              <div>
                <p style={dash.sectionTitle}>Who is your ideal client?</p>
                <textarea
                  className="dash-focusable"
                  value={idealClient}
                  onChange={(e) => setIdealClient(e.target.value)}
                  placeholder="Small business owners with retail spaces..."
                  rows={4}
                  style={{ ...textareaStyle }}
                />
              </div>
              <div>
                <p style={dash.sectionTitle}>What is your price range?</p>
                <input
                  className="dash-focusable"
                  type="text"
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  placeholder="$2,500-$5,000/month"
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
          <div style={{ ...dash.card }}>
            {fields.map((item, idx) => {
              const src = editing && draft ? draft : offer;
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
          ) : null}
        </>
      )}
    </div>
  );
}
