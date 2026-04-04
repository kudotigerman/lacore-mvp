"use client";

import Link from "next/link";
import { useState } from "react";
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
        <div style={{ ...dash.card }}>
          <p style={{ ...dash.body, margin: "0 0 16px" }}>You don&apos;t have an offer saved yet.</p>
          <Link href="/" style={{ ...dash.btnPrimary, display: "inline-block", textDecoration: "none" }}>
            Generate your offer →
          </Link>
        </div>
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
