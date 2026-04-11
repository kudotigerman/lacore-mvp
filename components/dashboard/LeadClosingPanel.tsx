"use client";

import { useEffect, useState } from "react";
import type { LeadRow } from "@/components/LeadsList";
import type { SalesBuilderContextPayload } from "@/components/dashboard/DashboardDataContext";

function Well({
  title,
  actionLabel,
  loading,
  text,
  onRun,
  onCopy
}: {
  title: string;
  actionLabel: string;
  loading: boolean;
  text: string;
  onRun: () => void;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">{title}</p>
        <button
          type="button"
          disabled={loading}
          onClick={() => void onRun()}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/60 transition-colors duration-150 hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Generating…" : actionLabel}
        </button>
      </div>
      <div className="min-h-[72px] rounded-lg bg-white/[0.03] px-3 py-3">
        {loading ? (
          <p className="text-sm text-white/35">Thinking…</p>
        ) : text ? (
          <>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-white/70">{text}</pre>
            <button
              type="button"
              onClick={() => void onCopy()}
              className="mt-3 text-xs font-medium text-indigo-300 underline transition-colors hover:text-indigo-200"
            >
              Copy
            </button>
          </>
        ) : (
          <span className="text-xl text-white/15">—</span>
        )}
      </div>
    </div>
  );
}

export default function LeadClosingPanel({
  lead,
  sessionToken,
  salesContext
}: {
  lead: LeadRow | null;
  sessionToken: string | null;
  salesContext: SalesBuilderContextPayload;
}) {
  const [what, setWhat] = useState("");
  const [dm, setDm] = useState("");
  const [obj, setObj] = useState("");
  const [fu, setFu] = useState("");
  const [wL, setWL] = useState(false);
  const [dmL, setDmL] = useState(false);
  const [objL, setObjL] = useState(false);
  const [fuL, setFuL] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setWhat("");
    setDm("");
    setObj("");
    setFu("");
    setErr(null);
  }, [lead?.id]);

  async function run(prompt: string, setText: (s: string) => void, setLoading: (b: boolean) => void) {
    if (!sessionToken) return;
    setErr(null);
    setLoading(true);
    setText("");
    try {
      const res = await fetch("/api/dashboard-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          message: prompt,
          salesContext: {
            offer: salesContext.offer,
            audience: salesContext.audience,
            pricing: salesContext.pricing,
            positioning: salesContext.positioning,
            headline: salesContext.headline,
            slug: salesContext.landingSlug
          }
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

  const offerText = salesContext.offer?.trim() || "your offer";
  const audienceText = salesContext.audience?.trim() || "your audience";

  if (!lead) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
        <p className="text-sm text-white/40">Select a lead to open the AI closing assistant.</p>
      </div>
    );
  }

  const leadBlock = `Name: ${lead.name?.trim() || "—"}, Email: ${lead.email}, Message: ${lead.message?.trim() || "—"}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-white/35">Selected lead</p>
        <p className="mt-1 text-base font-semibold text-white">{lead.name?.trim() || "—"}</p>
        <p className="text-sm text-white/45">{lead.email}</p>
        {lead.message?.trim() ? (
          <p className="mt-3 border-t border-white/10 pt-3 text-sm leading-relaxed text-white/55">{lead.message}</p>
        ) : null}
      </div>

      {err ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">{err}</div>
      ) : null}

      <Well
        title="What to say?"
        actionLabel="Generate"
        loading={wL}
        text={what}
        onRun={() =>
          void run(
            `I have a lead: ${leadBlock}. My offer: ${offerText}. Write me a short, specific reply to send this person right now.`,
            setWhat,
            setWL
          )
        }
        onCopy={() => void navigator.clipboard.writeText(what)}
      />
      <Well
        title="DM script"
        actionLabel="Generate"
        loading={dmL}
        text={dm}
        onRun={() =>
          void run(
            `Write 3 short DM scripts for this lead (${leadBlock}) for my offer (${offerText}) targeting ${audienceText}. Label each script clearly.`,
            setDm,
            setDmL
          )
        }
        onCopy={() => void navigator.clipboard.writeText(dm)}
      />
      <Well
        title="Handle objection"
        actionLabel="Generate"
        loading={objL}
        text={obj}
        onRun={() =>
          void run(
            `The lead said the offer is too expensive. ${leadBlock}. My offer: ${offerText}. Give concise objection responses (bullet list).`,
            setObj,
            setObjL
          )
        }
        onCopy={() => void navigator.clipboard.writeText(obj)}
      />
      <Well
        title="Follow-up"
        actionLabel="Generate"
        loading={fuL}
        text={fu}
        onRun={() =>
          void run(
            `Write a 3-message follow-up sequence for this lead (${leadBlock}) who went quiet. Offer: ${offerText}.`,
            setFu,
            setFuL
          )
        }
        onCopy={() => void navigator.clipboard.writeText(fu)}
      />

      <a
        href={`mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent("Re: your inquiry")}`}
        className="block w-full rounded-xl bg-indigo-600 py-2.5 text-center text-sm font-medium text-white transition-colors duration-150 hover:bg-indigo-500"
      >
        Reply by email →
      </a>
    </div>
  );
}
