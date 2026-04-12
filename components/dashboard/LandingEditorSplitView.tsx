"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import DomainConnect from "@/components/DomainConnect";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { getSupabaseClient } from "@/lib/supabase";
import { LANDING_EDITOR_QUICK_STORAGE_KEY } from "@/lib/landingEditorQuickActions";
import { dashToast } from "@/lib/dash-toast";
import { LandingStripeStatus } from "@/components/dashboard/LandingStripeStatus";
import { LandingTestimonialsPanel } from "@/components/dashboard/LandingTestimonialsPanel";

const QUICK_ACTIONS = [
  "Change colors",
  "Add testimonials",
  "Add FAQ section",
  "Add Calendly",
  "Make headline stronger",
  "Add WhatsApp button"
] as const;

type ChatMsg = { id: string; role: "user" | "assistant"; content: string };

export function LandingEditorSplitView({
  slug,
  publicUrl,
  views,
  onViewsRefresh
}: {
  slug: string;
  publicUrl: string;
  views: number | null;
  onViewsRefresh: () => void;
}) {
  const d = useDashboardData();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      content: "Your landing page is live. Tell me what you'd like to change."
    }
  ]);
  const [input, setInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [regenerateConfirm, setRegenerateConfirm] = useState(false);

  useEffect(() => {
    try {
      const prefill = sessionStorage.getItem(LANDING_EDITOR_QUICK_STORAGE_KEY);
      if (!prefill?.trim()) return;
      sessionStorage.removeItem(LANDING_EDITOR_QUICK_STORAGE_KEY);
      setInput(prefill.trim());
    } catch {
      /* ignore */
    }
  }, [slug]);

  useEffect(() => {
    setIframeKey((k) => k + 1);
  }, [slug]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    dashToast("Link copied to clipboard!");
    window.setTimeout(() => setCopied(false), 2500);
  }, [publicUrl]);

  const handleEdit = useCallback(async () => {
    const instruction = input.trim();
    if (!instruction || isEditing || !d.sessionToken) return;

    const userMsg: ChatMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: instruction
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsEditing(true);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("landing_pages")
        .select("html_content, jsx_content")
        .eq("slug", slug)
        .single();

      if (error) throw new Error(error.message);
      const row = data as { html_content: string | null; jsx_content: string | null };
      const jsx = row.jsx_content?.trim() ?? "";
      const html = row.html_content?.trim() ?? "";
      const useJsx = Boolean(jsx);
      if (!useJsx && !html) throw new Error("No page content found.");

      const res = await fetch("/api/edit-landing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${d.sessionToken}`
        },
        body: JSON.stringify({
          slug,
          instruction,
          ...(useJsx ? { currentJsx: jsx } : { currentHtml: html })
        })
      });

      const text = await res.text();
      let result: { success?: boolean; error?: string };
      try {
        result = JSON.parse(text) as { success?: boolean; error?: string };
      } catch {
        throw new Error(text.slice(0, 120));
      }
      if (!res.ok || !result.success) {
        throw new Error(typeof result.error === "string" ? result.error : "Update failed.");
      }

      setIframeKey((k) => k + 1);
      onViewsRefresh();
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: "Done — your page is updated. Check the preview."
        }
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: msg }
      ]);
    } finally {
      setIsEditing(false);
    }
  }, [d.sessionToken, input, isEditing, onViewsRefresh, slug]);

  const handleRegenerate = useCallback(() => {
    d.setRegenerateError(null);
    setRegenerateConfirm(true);
  }, [d]);

  const checklistItems = [
    { label: "Page created", done: true },
    { label: "Link copied", done: copied },
    { label: "Shared on social", done: false }
  ];
  const progress = checklistItems.filter((i) => i.done).length;
  const percent = Math.round((progress / checklistItems.length) * 100);

  const v = views ?? 0;

  return (
    <div className="flex h-[calc(100vh-3rem)] min-h-0 w-full max-w-[100vw] overflow-hidden rounded-xl border border-white/[0.08] bg-[#07080F] -mx-8 -my-6 sm:h-[calc(100vh-3rem)]">
      <div className="flex h-full min-h-0 w-80 shrink-0 flex-col border-r border-white/[0.08] bg-[#0D0F1A]">
        <div className="shrink-0 border-b border-white/[0.08] px-4 py-3">
          <div className="mb-1 flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-white">LACORE AI</span>
          </div>
          <p className="text-xs text-white/40">Tell me what to change</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="space-y-3 px-4 py-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={
                  msg.role === "assistant"
                    ? "rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs leading-relaxed text-white/80"
                    : "ml-4 rounded-xl bg-white/5 px-3 py-2 text-xs leading-relaxed text-white/60"
                }
              >
                {msg.content}
              </div>
            ))}
          </div>

          <div className="border-t border-white/[0.06] px-4 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/45">Ask the AI</p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => setInput(action)}
                  className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-white/50 transition-colors hover:border-indigo-500/40 hover:text-white/80"
                >
                  {action}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe what to change on your page — e.g. stronger headline, add Calendly, warmer colors…"
                rows={3}
                className="dash-focusable min-h-[4.25rem] flex-1 resize-y rounded-xl border-2 border-white/20 bg-[#111116] px-3 py-2.5 text-sm leading-relaxed text-white shadow-inner shadow-black/20 placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/35"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleEdit();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void handleEdit()}
                disabled={isEditing || !input.trim()}
                className="self-end rounded-xl bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"
              >
                {isEditing ? "…" : "Apply"}
              </button>
            </div>
          </div>

          <div className="space-y-2 border-t border-white/[0.08] px-4 py-3 pb-4">
            <div className="mb-2">
              <div className="mb-1 flex justify-between text-[10px] text-white/30">
                <span>Setup progress</span>
                <span>{percent}%</span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.08]">
                <div
                  className="h-1 rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <input
                readOnly
                value={publicUrl}
                className="min-w-0 flex-1 truncate rounded-lg border border-white/[0.08] bg-white/5 px-3 py-1.5 font-mono text-xs text-white/50"
              />
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="shrink-0 rounded-lg border border-indigo-500/20 px-2 py-1.5 text-xs text-indigo-400 transition-colors hover:border-indigo-500/40 hover:text-indigo-300"
              >
                {copied ? "✓" : "Copy"}
              </button>
            </div>

            <div className="flex gap-2">
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-lg border border-white/10 py-2 text-center text-xs text-white/50 transition-colors hover:text-white/80"
              >
                Preview ↗
              </a>
              <button
                type="button"
                onClick={handleRegenerate}
                className="flex-1 rounded-lg border border-white/10 py-2 text-xs text-white/50 transition-colors hover:text-white/80"
              >
                Regenerate
              </button>
            </div>

            <button
              type="button"
              onClick={() => router.push("/dashboard/content")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Continue to Content
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path
                  d="M2 6h8M6 2l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <p className="text-center text-[10px] text-white/25">
              {v} views · {copied ? "Link copied!" : "Share to get leads"}
            </p>

            {d.userId ? (
              <div className="space-y-2 border-t border-white/[0.06] pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Domain &amp; payments</p>
                <DomainConnect slug={slug} userId={d.userId} />
                <LandingStripeStatus />
                <LandingTestimonialsPanel slug={slug} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative min-w-0 flex-1 overflow-hidden bg-white">
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-black/80 px-4 py-2 backdrop-blur-sm">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
          </div>
          <div className="min-w-0 flex-1 rounded-md bg-white/10 px-3 py-1 text-center font-mono text-xs text-white/50 truncate">
            {publicUrl}
          </div>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs text-white/40 hover:text-white/70"
          >
            ↗
          </a>
        </div>

        <iframe
          key={iframeKey}
          src={`/p/${slug}?embed=1`}
          className="h-full w-full border-0"
          style={{ paddingTop: "37px" }}
          title="Landing page preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />

        {isEditing ? (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            style={{ paddingTop: "37px" }}
          >
            <div className="rounded-2xl border border-indigo-500/30 bg-[#0D0F1A] px-8 py-6 text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <p className="text-sm font-medium text-white">Applying changes…</p>
              <p className="mt-1 text-xs text-white/40">AI is updating your page</p>
            </div>
          </div>
        ) : null}
      </div>

      {regenerateConfirm ? (
        <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#0D0F1A] p-5">
            <p className="text-sm text-white/80">Replace your current site? This will delete the page and generate a new one.</p>
            {d.regenerateError ? <p className="mt-2 text-xs text-red-400">{d.regenerateError}</p> : null}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  d.setRegenerateError(null);
                  void d.handleRegenerateSiteConfirmed();
                  setRegenerateConfirm(false);
                }}
                disabled={d.buildingLanding}
                className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Yes, regenerate
              </button>
              <button
                type="button"
                onClick={() => {
                  setRegenerateConfirm(false);
                  d.setRegenerateError(null);
                }}
                className="flex-1 rounded-lg border border-white/15 py-2 text-sm text-white/60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
