"use client";

import { useState } from "react";
import { dash } from "@/components/dashboard/dashTokens";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";

export default function DashboardClosingPage() {
  const d = useDashboardData();
  const [dmOut, setDmOut] = useState("");
  const [objOut, setObjOut] = useState("");
  const [fuOut, setFuOut] = useState("");
  const [dmLoad, setDmLoad] = useState(false);
  const [objLoad, setObjLoad] = useState(false);
  const [fuLoad, setFuLoad] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function runPrompt(prompt: string, setText: (s: string) => void, setLoading: (b: boolean) => void) {
    if (!d.sessionToken) return;
    setErr(null);
    setLoading(true);
    setText("");
    try {
      const res = await fetch("/api/dashboard-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${d.sessionToken}`
        },
        body: JSON.stringify({
          message: prompt,
          offerContext: d.offerContext
        })
      });
      const json = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) throw new Error(json.error || "Request failed.");
      setText(json.reply?.trim() ?? "");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  const offer = d.offer?.offer ?? "your offer";
  const audience = d.offer?.audience ?? "your audience";

  return (
    <div style={{ padding: 48, maxWidth: 900, boxSizing: "border-box" }}>
      <h1 style={{ ...dash.pageTitle, marginBottom: 32 }}>CLOSING SYSTEM</h1>
      {err ? <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 16 }}>{err}</p> : null}

      <section style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          <p style={dash.sectionLabel}>DM SCRIPTS</p>
          <button
            type="button"
            disabled={dmLoad || !d.sessionToken}
            onClick={() =>
              void runPrompt(
                `Generate 3 cold DM scripts for ${offer} targeting ${audience}. Each script: opener, value prop, CTA. Format clearly.`,
                setDmOut,
                setDmLoad
              )
            }
            style={{ ...dash.btnPrimary, opacity: dmLoad ? 0.6 : 1 }}
          >
            ⚡ GENERATE SCRIPTS
          </button>
        </div>
        <div style={{ ...dash.card, minHeight: 80 }}>
          {dmLoad ? (
            <p style={dash.small}>Generating…</p>
          ) : (
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--text-secondary)"
              }}
            >
              {dmOut || "—"}
            </pre>
          )}
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          <p style={dash.sectionLabel}>OBJECTION HANDLING</p>
          <button
            type="button"
            disabled={objLoad || !d.sessionToken}
            onClick={() =>
              void runPrompt(
                `Generate responses to top 5 objections for ${offer}. Format: Objection → Response`,
                setObjOut,
                setObjLoad
              )
            }
            style={{ ...dash.btnPrimary, opacity: objLoad ? 0.6 : 1 }}
          >
            ⚡ GENERATE OBJECTIONS
          </button>
        </div>
        <div style={{ ...dash.card, minHeight: 80 }}>
          {objLoad ? (
            <p style={dash.small}>Generating…</p>
          ) : (
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--text-secondary)"
              }}
            >
              {objOut || "—"}
            </pre>
          )}
        </div>
      </section>

      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          <p style={dash.sectionLabel}>FOLLOW-UP SEQUENCES</p>
          <button
            type="button"
            disabled={fuLoad || !d.sessionToken}
            onClick={() =>
              void runPrompt(
                `Generate a 5-message follow-up sequence for ${offer} prospects who didn't respond.`,
                setFuOut,
                setFuLoad
              )
            }
            style={{ ...dash.btnPrimary, opacity: fuLoad ? 0.6 : 1 }}
          >
            ⚡ GENERATE FOLLOW-UPS
          </button>
        </div>
        <div style={{ ...dash.card, minHeight: 80 }}>
          {fuLoad ? (
            <p style={dash.small}>Generating…</p>
          ) : (
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--text-secondary)"
              }}
            >
              {fuOut || "—"}
            </pre>
          )}
        </div>
      </section>
    </div>
  );
}
