"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ContextualTip } from "@/components/dashboard/ContextualTip";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { getSupabaseClient } from "@/lib/supabase";
import { fetchLatestSavedResult, upsertSavedResult } from "@/lib/saved-results";
import type { SequenceMessage } from "@/types/dashboard-ai";

const CHANNELS = [
  {
    id: "email" as const,
    label: "Email",
    desc: "5-email nurture sequence",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="12" height="9" rx="1.5"/>
        <path d="M1 3l6 5 6-5"/>
      </svg>
    )
  },
  {
    id: "instagram" as const,
    label: "Instagram",
    desc: "3-message DM sequence",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1.5" y="1.5" width="11" height="11" rx="3"/>
        <circle cx="7" cy="7" r="2.5"/>
        <circle cx="10.5" cy="3.5" r="0.5" fill="currentColor" stroke="none"/>
      </svg>
    )
  },
  {
    id: "linkedin" as const,
    label: "LinkedIn",
    desc: "Connection + follow-up",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1.5" y="1.5" width="11" height="11" rx="2"/>
        <path d="M4 6v4M4 4.5v.01"/>
        <path d="M7 10V7.5c0-1 .5-1.5 1.5-1.5S10 6.5 10 7.5V10"/>
        <path d="M7 6v4"/>
      </svg>
    )
  },
  {
    id: "whatsapp" as const,
    label: "WhatsApp",
    desc: "3-message warm sequence",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 1.5a5.5 5.5 0 015.2 7.3L13 12.5l-3.7-.8A5.5 5.5 0 117 1.5z"/>
        <path d="M5 5.5c.5 1 1 2 2.5 2.5"/>
      </svg>
    )
  },
  {
    id: "telegram" as const,
    label: "Telegram",
    desc: "Outreach sequence",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.5 2L1.5 6l4 1.5L7.5 11l1.5-3 3.5-6z"/>
        <path d="M5.5 7.5l2 2"/>
      </svg>
    )
  }
];

const GOALS = [
  "Warm up a cold lead",
  "Follow up after no response",
  "Nurture interested prospect",
  "Re-engage old contact",
  "After proposal — close the deal"
];

type ChannelId = (typeof CHANNELS)[number]["id"];

const CHANNEL_IDS = new Set<ChannelId>(CHANNELS.map((c) => c.id));

function SequencesPageInner() {
  const d = useDashboardData();
  const { activeProject } = d;
  const searchParams = useSearchParams();
  const leadName = searchParams.get("leadName")?.trim() ?? "";
  const leadContext = searchParams.get("leadContext")?.trim() ?? "";

  const [channel, setChannel] = useState<ChannelId>("email");
  const [goal, setGoal] = useState(GOALS[0]!);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<SequenceMessage[] | null>(null);

  useEffect(() => {
    const userId = d.userId;
    const projectId = activeProject?.id;
    if (!userId || !projectId) return;

    async function load(uid: string, pid: string) {
      const supabase = getSupabaseClient();
      const { input, result } = await fetchLatestSavedResult(supabase, {
        userId: uid,
        projectId: pid,
        type: "sequence"
      });
      if (input) {
        const ch = input.channel;
        if (typeof ch === "string" && CHANNEL_IDS.has(ch as ChannelId)) setChannel(ch as ChannelId);
        if (typeof input.goal === "string") setGoal(input.goal);
      }
      if (result && typeof result === "object" && result !== null) {
        const msgs = (result as { messages?: unknown }).messages;
        if (Array.isArray(msgs) && msgs.length > 0) setMessages(msgs as SequenceMessage[]);
      }
    }
    void load(userId, projectId);
  }, [d.userId, activeProject?.id]);

  async function copyMessage(text: string) {
    await navigator.clipboard.writeText(text);
  }

  async function handleGenerate() {
    setError(null);
    setMessages(null);
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
      const res = await fetch("/api/generate-sequence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          channel,
          goal,
          offer: d.offer?.offer,
          audience: d.offer?.audience,
          pricing: d.offer?.pricing,
          positioning: d.offer?.positioning,
          headline: d.offer?.headline,
          ...(leadName ? { leadName } : {}),
          ...(leadContext ? { leadContext } : {})
        })
      });
      const json = (await res.json()) as {
        sequence?: { messages: SequenceMessage[] };
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
      if (!json.sequence?.messages?.length) {
        setError("No messages returned.");
        return;
      }
      setMessages(json.sequence.messages);
      if (d.userId && activeProject?.id) {
        const { error: saveErr } = await upsertSavedResult(supabase, {
          userId: d.userId,
          projectId: activeProject.id,
          type: "sequence",
          input: { channel, goal, leadName: leadName || undefined, leadContext: leadContext || undefined },
          result: { messages: json.sequence.messages }
        });
        if (saveErr) console.warn("saved_results sequence:", saveErr.message);
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
        <span className="text-xs uppercase tracking-wider text-indigo-400">Outreach</span>
        <h1 className="mb-1 mt-1 text-2xl font-bold text-white">Communication sequences</h1>
        <p className="text-sm text-white/40">
          Ready-made message series for email, DMs, and more — tuned to your offer.
        </p>
      </div>

      {leadName ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/8 p-3">
          <span className="text-sm text-indigo-400" aria-hidden>
            👤
          </span>
          <p className="text-sm text-white/70">
            Writing sequence for <span className="font-medium text-indigo-400">{leadName}</span>
          </p>
        </div>
      ) : null}

      <ContextualTip
        icon="✉️"
        text="The best sequences don't sell in message 1. Message 1 = curiosity. Message 2 = value. Message 3 = soft offer. Message 4 = close."
      />

      <p className="mb-2 text-xs uppercase tracking-wider text-white/40">Channel</p>
      <div className="mb-2 flex flex-wrap gap-2">
        {CHANNELS.map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => setChannel(ch.id)}
            className={`rounded-xl px-4 py-2.5 text-sm transition-colors ${
              channel === ch.id
                ? "bg-indigo-600 text-white"
                : "border border-white/10 bg-white/5 text-white/50 hover:text-white/80"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {ch.icon}
              {ch.label}
            </span>
          </button>
        ))}
      </div>
      <p className="mb-6 text-xs text-white/35">{CHANNELS.find((c) => c.id === channel)?.desc}</p>

      <div className="mb-6">
        <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">Goal</label>
        <select
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="w-full max-w-lg rounded-xl border border-white/10 bg-[#0a0a12] px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
        >
          {!GOALS.includes(goal) ? (
            <option key={goal} value={goal}>
              {goal}
            </option>
          ) : null}
          {GOALS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={() => void handleGenerate()}
        className="mb-8 rounded-xl bg-indigo-600 px-8 py-3 font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"
      >
        {loading ? "Writing sequence…" : "Generate sequence → (3 credits)"}
      </button>
      {error ? <p className="mb-6 text-sm text-red-400">{error}</p> : null}

      {messages
        ? messages.map((msg, i) => (
            <div key={`${msg.timing}-${i}`} className="mb-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-medium text-indigo-400">
                    {i + 1}
                  </span>
                  <span className="text-xs text-white/40">{msg.timing}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void copyMessage(msg.content)}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/40 transition-colors hover:text-white/70"
                >
                  Copy
                </button>
              </div>
              {msg.subject ? (
                <p className="mb-2 text-xs text-indigo-400">Subject: {msg.subject}</p>
              ) : null}
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/75">{msg.content}</p>
            </div>
          ))
        : null}
    </div>
  );
}

export default function SequencesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-full p-6 text-sm text-white/40" style={{ background: "var(--content-bg)" }}>
          Loading…
        </div>
      }
    >
      <SequencesPageInner />
    </Suspense>
  );
}
