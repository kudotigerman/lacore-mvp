"use client";

import Link from "next/link";
import { useState } from "react";
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

  const offer = d.offer;

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
    marginTop: 8
  };

  return (
    <div style={{ padding: 48, maxWidth: 800, boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
        <h1 style={dash.pageTitle}>YOUR OFFER</h1>
        {offer ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "#22c55e"
            }}
          >
            <span style={{ width: 6, height: 6, background: "#22c55e" }} />
            ACTIVE
          </span>
        ) : null}
      </div>

      {!offer ? (
        <div style={{ ...dash.card }}>
          <p style={{ ...dash.body, margin: "0 0 16px" }}>You don&apos;t have an offer saved yet.</p>
          <Link href="/" style={{ ...dash.btnPrimary, display: "inline-block", textDecoration: "none" }}>
            GENERATE YOUR OFFER →
          </Link>
        </div>
      ) : (
        <>
          <div style={{ ...dash.card, marginBottom: 16 }}>
            {fields.map((item, idx) => {
              const src = editing && draft ? draft : offer;
              const value = src[item.key];
              return (
                <div
                  key={item.key}
                  style={{
                    borderBottom: idx === fields.length - 1 ? "none" : "1px solid var(--border-primary)",
                    paddingBottom: idx === fields.length - 1 ? 0 : 20,
                    marginBottom: idx === fields.length - 1 ? 0 : 20
                  }}
                >
                  <p style={{ ...dash.sectionLabel, marginBottom: 8 }}>{item.label}</p>
                  {editing && draft ? (
                    item.multiline ? (
                      <textarea
                        value={draft[item.key]}
                        onChange={(e) => setDraft({ ...draft, [item.key]: e.target.value })}
                        style={textareaStyle}
                        rows={4}
                      />
                    ) : (
                      <input
                        type="text"
                        value={draft[item.key]}
                        onChange={(e) => setDraft({ ...draft, [item.key]: e.target.value })}
                        style={{ ...dash.input, marginTop: 8 }}
                      />
                    )
                  ) : (
                    <p style={{ ...dash.body, margin: 0, color: "var(--text-primary)" }}>{value}</p>
                  )}
                </div>
              );
            })}
          </div>

          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {saveErr ? <p style={{ margin: 0, fontSize: 12, color: "#ef4444" }}>{saveErr}</p> : null}
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                style={{ ...dash.btnPrimary, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}
              >
                SAVE
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
                CANCEL
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSaveErr(null);
                setDraft({ ...offer });
                setEditing(true);
              }}
              style={dash.btnGhost}
            >
              EDIT OFFER
            </button>
          )}
        </>
      )}
    </div>
  );
}
