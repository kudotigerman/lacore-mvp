"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import DomainConnect from "@/components/DomainConnect";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { getSupabaseClient } from "@/lib/supabase";
import { LANDING_EDITOR_QUICK_STORAGE_KEY } from "@/lib/landingEditorQuickActions";
import { dashToast } from "@/lib/dash-toast";
import { LandingStripeStatus } from "@/components/dashboard/LandingStripeStatus";
import { LandingTestimonialsPanel } from "@/components/dashboard/LandingTestimonialsPanel";
import { STYLE_THEMES, type LandingStyle } from "@/types/landing";

type ChatMsg = { id: string; role: "user" | "assistant"; content: string };
type LandingJsonContent = Record<string, unknown>;
type AddBlockType = "faq" | "pricing" | "video" | "about" | "calendly";

export function LandingEditorSplitView({
  landingId,
  slug,
  publicUrl,
  views,
  onViewsRefresh
}: {
  landingId?: string | null;
  slug: string;
  publicUrl: string;
  views: number | null;
  onViewsRefresh: () => void;
}) {
  const undoStorageKey = `lacore_landing_prev_${slug}`;
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
  const [undoVisible, setUndoVisible] = useState(false);
  const [undoBusy, setUndoBusy] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<LandingStyle>("dark-indigo");
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(true);
  const [imageBase64, setImageBase64] = useState("");
  const [imageMediaType, setImageMediaType] = useState("image/jpeg");
  const [currentJsonContent, setCurrentJsonContent] = useState<LandingJsonContent | null>(null);
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [addingBlockType, setAddingBlockType] = useState<AddBlockType | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const rotatingPlaceholders = [
    "Ask AI to change anything...",
    "Try: 'move About section to the top'",
    "Try: 'make the headline more urgent'",
    "Try: 'add more testimonials'",
    "Try: 'put FAQ before Pricing'",
  ];

  const styleOptions: Array<{ id: LandingStyle; label: string; accent: string; bg: string }> = [
    { id: "dark-indigo", label: "Indigo", accent: STYLE_THEMES["dark-indigo"].accent, bg: STYLE_THEMES["dark-indigo"].bgPrimary },
    { id: "dark-purple", label: "Purple", accent: STYLE_THEMES["dark-purple"].accent, bg: STYLE_THEMES["dark-purple"].bgPrimary },
    { id: "dark-gold", label: "Gold", accent: STYLE_THEMES["dark-gold"].accent, bg: STYLE_THEMES["dark-gold"].bgPrimary },
    { id: "dark-amber", label: "Amber", accent: STYLE_THEMES["dark-amber"].accent, bg: STYLE_THEMES["dark-amber"].bgPrimary },
    { id: "dark-red", label: "Red", accent: STYLE_THEMES["dark-red"].accent, bg: STYLE_THEMES["dark-red"].bgPrimary },
    { id: "dark-green", label: "Green", accent: STYLE_THEMES["dark-green"].accent, bg: STYLE_THEMES["dark-green"].bgPrimary },
    { id: "dark-pink", label: "Pink", accent: STYLE_THEMES["dark-pink"].accent, bg: STYLE_THEMES["dark-pink"].bgPrimary },
    { id: "dark-cyan", label: "Cyan", accent: STYLE_THEMES["dark-cyan"].accent, bg: STYLE_THEMES["dark-cyan"].bgPrimary },
    { id: "dark-orange", label: "Orange", accent: STYLE_THEMES["dark-orange"].accent, bg: STYLE_THEMES["dark-orange"].bgPrimary },
    { id: "pure-black", label: "Minimal", accent: STYLE_THEMES["pure-black"].accent, bg: STYLE_THEMES["pure-black"].bgPrimary },
    { id: "light-clean", label: "Light", accent: STYLE_THEMES["light-clean"].accent, bg: STYLE_THEMES["light-clean"].bgPrimary },
    { id: "warm-cream", label: "Warm", accent: STYLE_THEMES["warm-cream"].accent, bg: STYLE_THEMES["warm-cream"].bgPrimary },
  ];

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
    setUndoVisible(false);
  }, [slug]);

  useEffect(() => {
    if (d.landingStyle) setSelectedStyle(d.landingStyle);
  }, [d.landingStyle]);

  useEffect(() => {
    if (input.trim() || inputFocused) return;
    const timer = window.setInterval(() => {
      setPlaceholderVisible(false);
      window.setTimeout(() => {
        setPlaceholderIndex((i) => (i + 1) % rotatingPlaceholders.length);
        setPlaceholderVisible(true);
      }, 180);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [input, inputFocused, rotatingPlaceholders.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    async function loadJsonContent() {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from("landing_pages")
        .select("json_content")
        .eq("slug", slug)
        .single();
      if (cancelled) return;
      const row = data as { json_content?: Record<string, unknown> | null } | null;
      setCurrentJsonContent(row?.json_content ?? null);
    }
    void loadJsonContent();
    return () => {
      cancelled = true;
    };
  }, [slug, iframeKey]);

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
        .select("html_content, jsx_content, json_content")
        .eq("slug", slug)
        .single();

      if (error) throw new Error(error.message);
      const row = data as { html_content: string | null; jsx_content: string | null; json_content: Record<string, unknown> | null };
      const jsx = row.jsx_content?.trim() ?? "";
      const html = row.html_content?.trim() ?? "";
      const jsonContent = row.json_content;
      const useJsx = Boolean(jsx);
      if (!useJsx && !html && !jsonContent) throw new Error("No page content found.");

      const res = await fetch("/api/edit-landing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${d.sessionToken}`
        },
        body: JSON.stringify({
          slug,
          instruction,
          ...(imageBase64 ? { imageBase64, imageMediaType } : {}),
          ...(useJsx ? { currentJsx: jsx } : html ? { currentHtml: html } : { currentJson: JSON.stringify(jsonContent, null, 2) })
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
      const extended = result as { json?: Record<string, unknown>; styleChanged?: string };
      if (extended.json) setCurrentJsonContent(extended.json);
      if (extended.styleChanged && typeof extended.styleChanged === "string") {
        setSelectedStyle(extended.styleChanged as LandingStyle);
        d.setLandingStyle(extended.styleChanged as LandingStyle);
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
      setImageBase64("");
      setImageMediaType("image/jpeg");
    }
  }, [d, d.sessionToken, imageBase64, imageMediaType, input, isEditing, onViewsRefresh, slug]);

  const handleRegenerate = useCallback(() => {
    d.setRegenerateError(null);
    setRegenerateConfirm(true);
  }, [d]);

  async function handleConfirmRegenerate() {
    d.setRegenerateError(null);
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from("landing_pages")
        .select("html_content")
        .eq("slug", slug)
        .eq("user_id", d.userId ?? "")
        .maybeSingle();
      if (!error) {
        const html = (data as { html_content?: string | null } | null)?.html_content?.trim();
        if (html) {
          localStorage.setItem(
            undoStorageKey,
            JSON.stringify({
              html,
              expiresAt: Date.now() + 60_000
            })
          );
        }
      }
    } catch {
      /* ignore local backup failures */
    }

    await d.handleRegenerateSiteConfirmed({ style: selectedStyle });
    setRegenerateConfirm(false);

    try {
      const raw = localStorage.getItem(undoStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { expiresAt?: number };
      if (typeof parsed.expiresAt === "number" && parsed.expiresAt > Date.now()) {
        setUndoVisible(true);
        window.setTimeout(() => setUndoVisible(false), 60_000);
      }
    } catch {
      /* ignore */
    }
  }

  async function handleUndoLanding() {
    setUndoBusy(true);
    const supabase = getSupabaseClient();
    try {
      const raw = localStorage.getItem(undoStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { html?: string; expiresAt?: number };
      if (!parsed.html || !parsed.expiresAt || parsed.expiresAt < Date.now()) {
        localStorage.removeItem(undoStorageKey);
        setUndoVisible(false);
        return;
      }
      const { error } = await supabase
        .from("landing_pages")
        .update({ html_content: parsed.html } as never)
        .eq("slug", slug)
        .eq("user_id", d.userId ?? "");
      if (error) throw new Error(error.message);
      setIframeKey((k) => k + 1);
      onViewsRefresh();
      setUndoVisible(false);
      localStorage.removeItem(undoStorageKey);
      dashToast("Previous landing version restored.");
    } catch {
      dashToast("Could not restore previous version.");
    } finally {
      setUndoBusy(false);
    }
  }

  const checklistItems = [
    { label: "Page created", done: true },
    { label: "Link copied", done: copied },
    { label: "Shared on social", done: false }
  ];
  const progress = checklistItems.filter((i) => i.done).length;
  const percent = Math.round((progress / checklistItems.length) * 100);

  const v = views ?? 0;

  return (
    <div className="flex h-auto min-h-[calc(100dvh-7rem)] w-full max-w-[100vw] overflow-visible rounded-xl border border-white/[0.08] bg-[#07080F] lg:-mx-8 lg:-my-6 lg:h-[calc(100vh-3rem)] lg:min-h-0 lg:overflow-hidden">
      <div className="flex h-auto min-h-[calc(100dvh-7rem)] w-full shrink-0 flex-col border-r-0 border-white/[0.08] bg-[#0D0F1A] lg:h-full lg:min-h-0 lg:w-80 lg:border-r">
        <div className="shrink-0 border-b border-white/[0.08] px-4 py-3">
          <div className="mb-1 flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-white">LACORE AI</span>
          </div>
          <p className="text-xs text-white/40">Tell me what to change</p>
        </div>

        <div className="min-h-[120px] flex-1 overflow-y-auto overflow-x-hidden overscroll-contain lg:min-h-0 lg:flex-1">
          <div className="space-y-3 px-4 py-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={
                  msg.role === "assistant"
                    ? "rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs leading-relaxed text-white/80"
                    : "ml-4 rounded-xl bg-white/5 px-3 py-2 text-xs leading-relaxed text-white/60"
                }
                style={{ fontSize: "12px", lineHeight: "1.5" }}
              >
                {msg.content}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="shrink-0 flex gap-1.5 overflow-x-auto border-t border-white/[0.06] px-3 py-2 scrollbar-hide">
          {[
            { label: "💪 Headline", action: "Make the headline stronger and more compelling" },
            { label: "⏰ Urgency", action: "Make the copy more urgent with a deadline or scarcity element" },
            { label: "💬 Testimonials", action: "Make the testimonials section more prominent and add specific results" },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={isEditing}
              onClick={async () => {
                const userMsg: ChatMsg = {
                  id: `u-${Date.now()}`,
                  role: "user",
                  content: item.action
                };
                setMessages((prev) => [...prev, userMsg]);
                setIsEditing(true);
                try {
                  const supabase = getSupabaseClient();
                  const { data, error } = await supabase
                    .from("landing_pages")
                    .select("html_content, jsx_content, json_content")
                    .eq("slug", slug)
                    .single();
                  if (error) throw new Error(error.message);
                  const row = data as { html_content: string | null; jsx_content: string | null; json_content: Record<string, unknown> | null };
                  const jsx = row.jsx_content?.trim() ?? "";
                  const html = row.html_content?.trim() ?? "";
                  const jsonContent = row.json_content;
                  const useJsx = Boolean(jsx);
                  if (!useJsx && !html && !jsonContent) throw new Error("No page content found.");
                  const res = await fetch("/api/edit-landing", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${d.sessionToken}` },
                    body: JSON.stringify({
                      slug,
                      instruction: item.action,
                      ...(useJsx ? { currentJsx: jsx } : html ? { currentHtml: html } : { currentJson: JSON.stringify(jsonContent, null, 2) })
                    })
                  });
                  const text = await res.text();
                  const result = JSON.parse(text) as {
                    success?: boolean;
                    error?: string;
                    json?: Record<string, unknown>;
                    styleChanged?: string;
                  };
                  if (!res.ok || !result.success) throw new Error(result.error ?? "Update failed.");
                  if (result.json) setCurrentJsonContent(result.json);
                  if (result.styleChanged && typeof result.styleChanged === "string") {
                    setSelectedStyle(result.styleChanged as LandingStyle);
                    d.setLandingStyle(result.styleChanged as LandingStyle);
                  }
                  setIframeKey((k) => k + 1);
                  setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", content: "Done — your page is updated. Check the preview." }]);
                } catch (e) {
                  const msg = e instanceof Error ? e.message : "Something went wrong.";
                  setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", content: msg }]);
                } finally {
                  setIsEditing(false);
                }
              }}
              className="shrink-0 whitespace-nowrap rounded-full border border-white/10 px-3 py-1 text-[10px] text-white/50 transition-colors hover:border-indigo-500/40 hover:text-white/80 disabled:opacity-40"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="shrink-0 border-t border-white/[0.06] px-4 py-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              {!input.trim() && !inputFocused ? (
                <div
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  style={{ opacity: placeholderVisible ? 1 : 0, transition: "opacity 180ms ease", fontSize: "12px" }}
                >
                  {rotatingPlaceholders[placeholderIndex]}
                </div>
              ) : null}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder=""
                rows={1}
                style={{ resize: "none", fontSize: "12px", lineHeight: "1.45" }}
                className="dash-focusable min-h-[2.25rem] w-full rounded-xl border-2 border-white/20 bg-[#111116] px-3 py-2 text-white shadow-inner shadow-black/20 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/35"
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleEdit();
                  }
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => void handleEdit()}
              disabled={isEditing || !input.trim()}
              className="shrink-0 self-end rounded-xl bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
            >
              →
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-white/30">💡 You can reorder sections — just ask</p>
        </div>

        <div
          className="shrink-0 overflow-y-auto border-t border-white/[0.06]"
          style={{ maxHeight: "45vh" }}
        >
          <div className="space-y-3 px-4 py-3">
            <div>
              <button
                type="button"
                onClick={() => setAddBlockOpen(true)}
                className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[11px] text-white/55 transition-colors hover:border-indigo-500/30 hover:text-white/80"
              >
                + Add
              </button>
            </div>

            <div className="flex gap-2">
              <input
                readOnly
                value={publicUrl}
                className="min-w-0 flex-1 truncate rounded-lg border border-white/[0.08] bg-white/5 px-3 py-2 font-mono text-xs text-white/50"
              />
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="shrink-0 rounded-lg border border-indigo-500/20 px-3 py-2 text-xs text-indigo-400 hover:border-indigo-500/40"
              >
                {copied ? "✓" : "Copy"}
              </button>
            </div>

            <div className="flex gap-2">
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center rounded-lg border border-white/10 py-2 text-xs text-white/50 hover:text-white/80"
              >
                Preview ↗
              </a>
              <button
                type="button"
                onClick={handleRegenerate}
                className="flex flex-1 items-center justify-center rounded-lg border border-white/10 py-2 text-xs text-white/50 hover:text-white/80"
              >
                Regenerate
              </button>
            </div>

            <button
              type="button"
              onClick={() => router.push("/dashboard/content")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Continue to Content
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <p className="text-center text-[10px] text-white/25">
              {v} views · {copied ? "Link copied!" : "Share to get leads"}
            </p>

            {undoVisible ? (
              <button
                type="button"
                disabled={undoBusy}
                onClick={() => void handleUndoLanding()}
                className="text-left text-[11px] text-indigo-300/90 underline hover:text-indigo-200 disabled:opacity-50"
              >
                {undoBusy ? "Restoring…" : "Undo — restore previous version"}
              </button>
            ) : null}

          <div className="border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setStyleOpen((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                Style
              </span>
              <span className="text-white/30">{styleOpen ? "▴" : "▾"}</span>
            </button>
            {styleOpen ? (
              <div className="space-y-2 px-4 pb-4">
                <div style={{ width: "100%" }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {styleOptions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        title={s.label}
                        onClick={() => {
                          setSelectedStyle(s.id);
                          if (!landingId) {
                            dashToast("Could not update style right now.");
                            return;
                          }
                          void d.handleChangeStyle(landingId, s.id);
                          setIframeKey((k) => k + 1);
                        }}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          background: s.accent,
                          border: selectedStyle === s.id
                            ? "2px solid white"
                            : s.id === "light-clean" || s.id === "warm-cream"
                              ? "1px solid rgba(0,0,0,0.15)"
                              : "1px solid rgba(255,255,255,0.08)",
                          outline: selectedStyle === s.id ? "2px solid rgba(255,255,255,0.3)" : "none",
                          outlineOffset: 1,
                          cursor: "pointer",
                          transition: "transform 0.15s ease",
                          flexShrink: 0,
                          position: "relative" as const,
                          overflow: "hidden",
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.15)"; }}
                        onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                      >
                        {(s.id === "pure-black" || s.id === "light-clean" || s.id === "warm-cream") ? (
                          <span
                            style={{
                              position: "absolute",
                              bottom: 4,
                              right: 4,
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: s.id === "pure-black" ? "#444444" : s.id === "warm-cream" ? "#D97706" : "#6366F1",
                              opacity: 0.85,
                            }}
                          />
                        ) : null}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 8 }}>
                    {styleOptions.find(s => s.id === d.landingStyle)?.label}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setSettingsOpen((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                Domain &amp; Payments
              </span>
              <span className="text-white/30">{settingsOpen ? "▴" : "▾"}</span>
            </button>
            {settingsOpen && d.userId ? (
              <div className="space-y-2 px-4 pb-4">
                <DomainConnect slug={slug} userId={d.userId} />
                <LandingStripeStatus />
                <LandingTestimonialsPanel slug={slug} />
              </div>
            ) : null}
          </div>
          </div>
        </div>
      </div>

      <div className="relative hidden min-w-0 flex-1 overflow-hidden bg-white lg:block">
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
          src={`/p/${slug}?embed=1&style=${encodeURIComponent(d.landingStyle ?? "dark-indigo")}`}
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
        <div className="fixed inset-0 z-[10020] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-sm rounded-t-2xl border border-white/10 bg-[#0D0F1A] p-5 sm:rounded-xl">
            <p className="text-sm text-white/80">Replace your current site? This will delete the page and generate a new one.</p>
            {d.regenerateError ? <p className="mt-2 text-xs text-red-400">{d.regenerateError}</p> : null}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" as const, marginBottom: 10 }}>Choose style</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                {styleOptions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    title={s.label}
                    onClick={() => setSelectedStyle(s.id)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      background: s.accent,
                      border: selectedStyle === s.id
                        ? "2px solid white"
                        : s.id === "light-clean" || s.id === "warm-cream"
                          ? "1px solid rgba(0,0,0,0.15)"
                          : "1px solid rgba(255,255,255,0.08)",
                      outline: selectedStyle === s.id ? "2px solid rgba(255,255,255,0.3)" : "none",
                      outlineOffset: 1,
                      cursor: "pointer",
                      transition: "transform 0.15s ease",
                      flexShrink: 0,
                      position: "relative" as const,
                      overflow: "hidden",
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.15)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                  >
                    {(s.id === "pure-black" || s.id === "light-clean" || s.id === "warm-cream") ? (
                      <span
                        style={{
                          position: "absolute",
                          bottom: 4,
                          right: 4,
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: s.id === "pure-black" ? "#444444" : s.id === "warm-cream" ? "#D97706" : "#6366F1",
                          opacity: 0.85,
                        }}
                      />
                    ) : null}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 6 }}>
                {styleOptions.find(s => s.id === selectedStyle)?.label}
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  void handleConfirmRegenerate();
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

      {mobilePreviewOpen ? (
        <div className="fixed inset-0 z-[10030] bg-black lg:hidden">
          <button
            type="button"
            onClick={() => setMobilePreviewOpen(false)}
            className="absolute right-3 top-3 z-20 min-h-11 rounded-lg border border-white/20 bg-black/60 px-3 text-sm text-white"
          >
            Close
          </button>
          <iframe
            key={`${iframeKey}-mobile`}
            src={`/p/${slug}?embed=1&style=${encodeURIComponent(d.landingStyle ?? "dark-indigo")}`}
            className="h-full w-full border-0"
            title="Landing page preview mobile"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      ) : null}
      {addBlockOpen ? (
        <div className="fixed inset-0 z-[10035] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-sm rounded-t-2xl border border-white/10 bg-[#0D0F1A] p-4 sm:rounded-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-white">Add block</p>
              <button
                type="button"
                onClick={() => setAddBlockOpen(false)}
                className="rounded-md px-2 py-1 text-xs text-white/50 hover:text-white/80"
              >
                Close
              </button>
            </div>
            <div className="space-y-2">
              {[
                { type: "faq" as const, label: "📋 FAQ", exists: Array.isArray(currentJsonContent?.faq) },
                { type: "pricing" as const, label: "💰 Pricing", exists: Array.isArray(currentJsonContent?.pricing) },
                { type: "video" as const, label: "🎥 Video", exists: typeof currentJsonContent?.video === "object" && currentJsonContent?.video !== null },
                { type: "about" as const, label: "👤 About", subtitle: "Personal story & credentials", exists: typeof currentJsonContent?.about === "object" && currentJsonContent?.about !== null },
                { type: "calendly" as const, label: "📅 Calendly", subtitle: "Inline booking embed", exists: typeof currentJsonContent?.calendly === "object" && currentJsonContent?.calendly !== null },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  disabled={!!addingBlockType || item.exists || !d.sessionToken || !currentJsonContent}
                  onClick={async () => {
                    if (!currentJsonContent || !d.sessionToken) return;
                    setAddingBlockType(item.type);
                    try {
                      const res = await fetch("/api/edit-landing", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${d.sessionToken}`
                        },
                        body: JSON.stringify({
                          slug,
                          instruction: "",
                          addBlockType: item.type,
                          currentJson: JSON.stringify(currentJsonContent, null, 2)
                        })
                      });
                      const result = (await res.json()) as {
                        success?: boolean;
                        error?: string;
                        json?: Record<string, unknown>;
                      };
                      if (!res.ok || !result.success || !result.json) {
                        throw new Error(result.error ?? "Failed to add block.");
                      }
                      setCurrentJsonContent(result.json);
                      setIframeKey((k) => k + 1);
                      setAddBlockOpen(false);
                      setMessages((prev) => [
                        ...prev,
                        { id: `a-${Date.now()}`, role: "assistant", content: `Added ${item.type} block.` }
                      ]);
                    } catch (e) {
                      dashToast(e instanceof Error ? e.message : "Failed to add block.");
                    } finally {
                      setAddingBlockType(null);
                    }
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-sm text-white/80 transition-colors hover:border-indigo-500/40 disabled:opacity-50"
                >
                  <span>
                    {item.label}
                    {"subtitle" in item && item.subtitle ? (
                      <span className="ml-2 text-xs text-white/40">{item.subtitle}</span>
                    ) : null}
                  </span>
                  <span className="text-xs text-white/45">
                    {item.exists ? "✓ added" : addingBlockType === item.type ? "Generating…" : "Add"}
                  </span>
                </button>
              ))}
              <div className="my-2 h-px bg-white/[0.08]" />
              <label className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-sm text-white/80 transition-colors hover:border-indigo-500/40">
                <span>
                  🖼 Image
                  <span className="ml-2 text-xs text-white/40">Upload photo or screenshot</span>
                </span>
                <span className="text-xs text-white/45">Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const base64 = (reader.result as string).split(",")[1];
                      setImageBase64(base64);
                      setImageMediaType(file.type);
                      setInput("Add this image to the page");
                    };
                    reader.readAsDataURL(file);
                    setAddBlockOpen(false);
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
