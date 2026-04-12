"use client";

import { useEffect, useState } from "react";
import { ContextualTip } from "@/components/dashboard/ContextualTip";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { getSupabaseClient } from "@/lib/supabase";
import { fetchLatestSavedResult, upsertSavedResult } from "@/lib/saved-results";
import type { OutreachResult } from "@/types/dashboard-ai";

const TONES = ["Friendly", "Professional", "Direct", "Curious"] as const;

const OUTREACH_CHANNELS = [
  { value: "Instagram DM", label: "Instagram DM" },
  { value: "LinkedIn", label: "LinkedIn" },
  { value: "Email", label: "Email" },
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Twitter/X", label: "Twitter / X" }
];

function CopyBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-indigo-400">{title}</p>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(text)}
          className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/40 transition-colors hover:text-white/70"
        >
          Copy
        </button>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/75">{text}</p>
    </div>
  );
}

export default function OutreachPage() {
  const d = useDashboardData();
  const { activeProject } = d;
  const [prospect, setProspect] = useState("");
  const [channel, setChannel] = useState("LinkedIn");
  const [tone, setTone] = useState<(typeof TONES)[number]>("Friendly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outreach, setOutreach] = useState<OutreachResult | null>(null);

  useEffect(() => {
    const userId = d.userId;
    const projectId = activeProject?.id;
    if (!userId || !projectId) return;

    async function load(uid: string, pid: string) {
      const supabase = getSupabaseClient();
      const { input, result } = await fetchLatestSavedResult(supabase, {
        userId: uid,
        projectId: pid,
        type: "outreach"
      });
      if (input) {
        const desc =
          typeof input.clientDescription === "string"
            ? input.clientDescription
            : typeof input.prospect === "string"
              ? input.prospect
              : "";
        setProspect(desc);
        if (typeof input.channel === "string" && OUTREACH_CHANNELS.some((c) => c.value === input.channel)) {
          setChannel(input.channel);
        }
        if (typeof input.tone === "string" && (TONES as readonly string[]).includes(input.tone)) {
          setTone(input.tone as (typeof TONES)[number]);
        }
      }
      if (
        result &&
        typeof result === "object" &&
        result !== null &&
        "primary" in result &&
        "alternative" in result &&
        "followUp" in result
      ) {
        setOutreach(result as OutreachResult);
      }
    }
    void load(userId, projectId);
  }, [d.userId, activeProject?.id]);

  async function handleGenerate() {
    setError(null);
    setOutreach(null);
    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("Sign in required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/generate-outreach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          prospect,
          channel,
          tone,
          offer: d.offer?.offer,
          audience: d.offer?.audience,
          pricing: d.offer?.pricing,
          positioning: d.offer?.positioning,
          headline: d.offer?.headline
        })
      });
      const json = (await res.json()) as {
        outreach?: OutreachResult;
        error?: string;
        message?: string;
      };
      if (res.status === 402) {
        setError(json.message ?? json.error ?? "Not enough credits.");
        return;
      }
      if (!res.ok) {
        setError(json.error ?? "Request failed.");
        return;
      }
      if (!json.outreach) {
        setError("No result returned.");
        return;
      }
      setOutreach(json.outreach);
      if (d.userId && activeProject?.id) {
        const { error: saveErr } = await upsertSavedResult(supabase, {
          userId: d.userId,
          projectId: activeProject.id,
          type: "outreach",
          input: { prospect, channel, tone },
          result: json.outreach
        });
        if (saveErr) console.warn("saved_results outreach:", saveErr.message);
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full" style={{ background: "var(--content-bg)" }}>
      <div className="mb-8">
        <span className="text-xs uppercase tracking-wider text-indigo-400">Prospecting</span>
        <h1 className="mb-1 mt-1 text-2xl font-bold text-white">Cold outreach</h1>
        <p className="text-sm text-white/40">
          Describe who you&apos;re reaching out to — get a primary message, an alternative, and a follow-up.
        </p>
      </div>

      <ContextualTip
        icon="🎯"
        text="The more you know about the client, the better. Include their industry, what they post about, their obvious pain point — AI will personalize perfectly."
      />

      <div className="mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
        <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">Who is the client?</label>
        <textarea
          value={prospect}
          onChange={(e) => setProspect(e.target.value)}
          placeholder='e.g. Sarah runs a yoga studio in London, posts on Instagram, has 5K followers, offers group classes, wants more private clients'
          rows={5}
          className="mb-4 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-indigo-500/50 focus:outline-none"
        />

        <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">Channel</label>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="mb-4 w-full rounded-xl border border-white/10 bg-[#0a0a12] px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
        >
          {OUTREACH_CHANNELS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <p className="mb-2 text-xs uppercase tracking-wider text-white/40">Tone</p>
        <div className="mb-6 flex flex-wrap gap-2">
          {TONES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              className={`rounded-xl px-4 py-2 text-sm transition-colors ${
                tone === t
                  ? "bg-indigo-600 text-white"
                  : "border border-white/10 bg-white/5 text-white/50 hover:text-white/80"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={loading || !prospect.trim()}
          onClick={() => void handleGenerate()}
          className="w-full rounded-xl bg-indigo-600 py-3 font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"
        >
          {loading ? "Writing…" : "Generate outreach → (2 credits)"}
        </button>
        {error ? <p className="mt-3 text-center text-sm text-red-400">{error}</p> : null}
      </div>

      {outreach ? (
        <div className="space-y-4">
          <CopyBlock title="Primary message" text={outreach.primary} />
          <CopyBlock title="Alternative version" text={outreach.alternative} />
          <CopyBlock title="Follow-up (no reply)" text={outreach.followUp} />
        </div>
      ) : null}
    </div>
  );
}
