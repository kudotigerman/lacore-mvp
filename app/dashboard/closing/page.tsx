"use client";

import { useState } from "react";
import { DashPageHeader } from "@/components/dashboard/DashPageHeader";
import { dash } from "@/components/dashboard/dashTokens";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";

const wellStyle = {
  minHeight: 80,
  background: "rgba(255,255,255,0.015)",
  borderRadius: 6,
  padding: "14px 16px",
  boxSizing: "border-box" as const,
  marginTop: 12
};

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

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
  }

  const offer = d.offer?.offer ?? "your offer";
  const audience = d.offer?.audience ?? "your audience";

  const renderClosingCard = (
    title: string,
    out: string,
    loading: boolean,
    setOut: (s: string) => void,
    setLoad: (b: boolean) => void,
    prompt: string
  ) => (
    <div style={{ ...dash.card }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <p style={{ ...dash.sectionTitle, marginBottom: 0 }}>{title}</p>
        <button
          type="button"
          disabled={loading || !d.sessionToken}
          onClick={() => void runPrompt(prompt, setOut, setLoad)}
          style={{ ...dash.btnPrimarySm, opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}
        >
          Generate
        </button>
      </div>
      <div style={wellStyle}>
        {loading ? (
          <p style={{ ...dash.small, margin: 0 }}>Generating…</p>
        ) : out ? (
          <>
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
                fontSize: 13,
                lineHeight: 1.75,
                color: "#A1A1AA"
              }}
            >
              {out}
            </pre>
            <button
              type="button"
              onClick={() => void copyText(out)}
              style={{ ...dash.btnGhostSm, marginTop: 12 }}
            >
              Copy
            </button>
          </>
        ) : (
          <span style={{ fontSize: 20, color: "#3F3F46" }}>—</span>
        )}
      </div>
    </div>
  );

  return (
    <div style={dash.pageShell}>
      <DashPageHeader title="Closing System" subtitle="Scripts and sequences to convert leads into clients" />
      {err ? <p style={{ color: "var(--danger)", fontSize: 13, margin: "0 0 16px" }}>{err}</p> : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {renderClosingCard(
          "DM SCRIPTS",
          dmOut,
          dmLoad,
          setDmOut,
          setDmLoad,
          `Generate 3 cold DM scripts for ${offer} targeting ${audience}. Each script: opener, value prop, CTA. Format clearly.`
        )}
        {renderClosingCard(
          "OBJECTION HANDLING",
          objOut,
          objLoad,
          setObjOut,
          setObjLoad,
          `Generate responses to top 5 objections for ${offer}. Format: Objection → Response`
        )}
        {renderClosingCard(
          "FOLLOW-UP SEQUENCES",
          fuOut,
          fuLoad,
          setFuOut,
          setFuLoad,
          `Generate a 5-message follow-up sequence for ${offer} prospects who didn't respond.`
        )}
      </div>
    </div>
  );
}
