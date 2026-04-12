"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useCreditsBalance } from "@/components/dashboard/useCreditsBalance";
import { getSupabaseClient } from "@/lib/supabase";

type Platform = "instagram" | "x" | "linkedin" | "threads" | "telegram";
type PostType = "hook" | "value" | "story" | "offer" | "case_study";
type ModelId = "claude" | "gpt4o" | "gemini";

interface ContentMachineProps {
  offer: string;
  audience: string;
  userId: string;
}

type PostImageState = { url?: string; loading: boolean; error: string };

const PLATFORMS: { id: Platform; label: string; short: string }[] = [
  { id: "instagram", label: "Instagram", short: "IG" },
  { id: "x", label: "X", short: "𝕏" },
  { id: "linkedin", label: "LinkedIn", short: "in" },
  { id: "threads", label: "Threads", short: "〒" },
  { id: "telegram", label: "Telegram", short: "✈️" }
];

const POST_TYPES: { id: PostType; label: string }[] = [
  { id: "hook", label: "Hook" },
  { id: "value", label: "Value" },
  { id: "story", label: "Story" },
  { id: "offer", label: "Offer" },
  { id: "case_study", label: "Case Study" }
];

const MODELS: { id: ModelId; label: string; hint: string }[] = [
  { id: "claude", label: "Standard", hint: "Fast and reliable" },
  { id: "gpt4o", label: "Pro", hint: "Deeper and more detailed" },
  { id: "gemini", label: "Creative", hint: "Unconventional and bold" }
];

function platformLabel(p: Platform): string {
  return PLATFORMS.find((x) => x.id === p)?.label ?? p;
}

function postTypeLabel(t: PostType): string {
  return POST_TYPES.find((x) => x.id === t)?.label ?? t;
}

function downloadImageViaProxy(url: string) {
  window.location.href = `/api/content/proxy-image?url=${encodeURIComponent(url)}`;
}

const LONG_POST_CHARS = 320;

export default function ContentMachine({ offer, audience, userId }: ContentMachineProps) {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [postType, setPostType] = useState<PostType>("hook");
  const [model, setModel] = useState<ModelId>("claude");
  const [customPrompt, setCustomPrompt] = useState("");
  const [posts, setPosts] = useState<{ id: number; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [postImages, setPostImages] = useState<Record<number, PostImageState>>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [creditsError, setCreditsError] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Record<number, boolean>>({});
  const creditsBal = useCreditsBalance();

  const runGenerate = useCallback(async () => {
    setError("");
    setCreditsError(false);
    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("Sign in required.");
      return;
    }
    if (!offer.trim()) {
      setError("Add your offer on the Offer page first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          platform,
          postType,
          model,
          offer: offer.trim(),
          audience: audience.trim(),
          userId,
          customPrompt: customPrompt.trim() || undefined
        })
      });
      const data = (await res.json()) as { posts?: { id: number; text: string }[]; error?: string };
      if (res.status === 402) {
        setCreditsError(true);
        setError(data.error ?? "Not enough credits.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Generation failed.");
        return;
      }
      if (!data.posts?.length) {
        setError("No posts returned.");
        return;
      }
      setPosts(data.posts);
      setPostImages({});
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [audience, customPrompt, offer, model, platform, postType, userId]);

  async function generatePostImage(postId: number, postText: string) {
    setPostImages((prev) => ({
      ...prev,
      [postId]: { ...prev[postId], loading: true, error: "", url: prev[postId]?.url }
    }));

    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setPostImages((prev) => ({
        ...prev,
        [postId]: { ...prev[postId], loading: false, error: "Sign in required.", url: prev[postId]?.url }
      }));
      return;
    }

    try {
      const res = await fetch("/api/content/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          platform,
          style: "professional",
          offer: offer.trim(),
          audience: audience.trim(),
          userId,
          postText
        })
      });
      const data = (await res.json()) as { images?: { id: number; url: string }[]; error?: string };
      if (!res.ok || !data.images?.[0]?.url) {
        setPostImages((prev) => ({
          ...prev,
          [postId]: {
            loading: false,
            error: data.error ?? "Image generation failed.",
            url: prev[postId]?.url
          }
        }));
        return;
      }
      setPostImages((prev) => ({
        ...prev,
        [postId]: { url: data.images![0].url, loading: false, error: "" }
      }));
    } catch {
      setPostImages((prev) => ({
        ...prev,
        [postId]: {
          loading: false,
          error: "Network error.",
          url: prev[postId]?.url
        }
      }));
    }
  }

  async function handleRegeneratePost(postId: number) {
    setError("");
    setCreditsError(false);
    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("Sign in required.");
      return;
    }
    if (!offer.trim()) return;

    setRegeneratingId(postId);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          platform,
          postType,
          model,
          offer: offer.trim(),
          audience: audience.trim(),
          userId,
          customPrompt: customPrompt.trim() || undefined
        })
      });
      const data = (await res.json()) as { posts?: { id: number; text: string }[]; error?: string };
      if (res.status === 402) {
        setCreditsError(true);
        setError(data.error ?? "Not enough credits.");
        return;
      }
      if (!res.ok || !data.posts?.[0]) {
        setError(data.error ?? "Regenerate failed.");
        return;
      }
      const newText = data.posts[0].text;
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, text: newText } : p)));
      setPostImages((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
    } catch {
      setError("Network error.");
    } finally {
      setRegeneratingId(null);
    }
  }

  async function handleCopy(text: string, id: number) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 2000);
  }

  const pillCls = (on: boolean) =>
    `rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors duration-150 border ${
      on
        ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-300"
        : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white/70"
    }`;

  const platformTabCls = (on: boolean) =>
    on
      ? "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors"
      : "rounded-lg px-4 py-2 text-sm text-white/40 transition-colors hover:text-white/60";

  return (
    <div className="max-w-4xl pb-28 font-inherit">
      <style>{`
        @keyframes content-machine-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .content-machine-generating {
          animation: content-machine-pulse 1.2s ease-in-out infinite;
        }
      `}</style>

      <section className="mb-8 rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/35">Generate post</p>
        <div className="mb-4 flex flex-wrap gap-1">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              className={platformTabCls(platform === p.id)}
              title={p.label}
            >
              <span className="mr-1.5 opacity-80" aria-hidden>
                {p.short}
              </span>
              {p.label}
            </button>
          ))}
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {POST_TYPES.map((pt) => (
            <button key={pt.id} type="button" onClick={() => setPostType(pt.id)} className={pillCls(postType === pt.id)}>
              {pt.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="mb-3 text-xs font-medium text-white/40 underline-offset-2 transition-colors hover:text-indigo-300"
        >
          {advancedOpen ? "Hide advanced" : "Advanced — model & custom prompt"}
        </button>

        {advancedOpen ? (
          <div className="mb-4 space-y-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex flex-wrap gap-2">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModel(m.id)}
                  className={pillCls(model === m.id)}
                  title={m.hint}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/35">Custom prompt (optional)</p>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={2}
                placeholder="e.g. client story with measurable outcome"
                className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-indigo-500/50 focus:outline-none"
              />
            </div>
          </div>
        ) : null}

        {creditsError ? (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
            <span className="text-sm text-amber-400">Not enough credits</span>
            <span className="text-xs text-white/45">Use the Credits widget in the sidebar to buy more.</span>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void runGenerate()}
          disabled={loading || !offer.trim() || !userId}
          className={`w-full rounded-xl py-3.5 text-sm font-semibold transition-colors duration-150 ${
            loading || !offer.trim()
              ? "cursor-not-allowed bg-white/10 text-white/35 content-machine-generating"
              : "bg-indigo-600 text-white hover:bg-indigo-500"
          }`}
        >
          {loading ? "Generating…" : "Generate post →"}
        </button>
        <p className="mt-2 text-center text-xs text-white/30">
          Uses credits per run
          {creditsBal !== null ? ` · ${creditsBal} remaining` : ""}
        </p>
        {error ? <p className="mt-2 text-center text-sm text-red-400">{error}</p> : null}
      </section>

      <section>
        {posts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {posts.map((post, idx) => {
              const img = postImages[post.id];
              const isLong = post.text.length > LONG_POST_CHARS;
              const expanded = expandedPosts[post.id];
              return (
                <div
                  key={`${post.id}-${idx}`}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5 transition-colors hover:border-white/[0.15]"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-wider text-white/50">
                        {platformLabel(platform)}
                      </span>
                      <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-white/25">
                        {postTypeLabel(postType)}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={regeneratingId !== null || loading}
                        onClick={() => void handleRegeneratePost(post.id)}
                        className="text-xs text-white/40 transition-colors hover:text-white/70 disabled:opacity-50"
                      >
                        {regeneratingId === post.id ? "…" : "Regenerate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCopy(post.text, post.id)}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-indigo-500"
                      >
                        {copiedId === post.id ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <p
                    className={`text-sm leading-relaxed text-white/70 whitespace-pre-wrap ${
                      !expanded && isLong ? "line-clamp-6" : ""
                    }`}
                  >
                    {post.text}
                  </p>
                  {isLong ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPosts((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                      }
                      className="mt-2 text-xs text-indigo-400 transition-colors hover:text-indigo-300"
                    >
                      {expanded ? "Show less" : "Show more"}
                    </button>
                  ) : null}

                  {advancedOpen && img?.loading ? (
                    <p className="content-machine-generating mt-3 text-xs text-white/40">Generating image…</p>
                  ) : null}
                  {advancedOpen && img?.error ? <p className="mt-2 text-xs text-red-400">{img.error}</p> : null}

                  {advancedOpen && img?.url ? (
                    <div className="mt-3">
                      {/* eslint-disable-next-line @next/next/no-img-element -- ephemeral OpenAI URLs */}
                      <img src={img.url} alt="" className="aspect-square w-full rounded-lg border border-white/10 object-cover" />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => downloadImageViaProxy(img.url!)}
                          className="rounded-lg border border-white/15 px-2 py-1 text-xs text-white/60 hover:text-white"
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          disabled={img.loading}
                          onClick={() => void generatePostImage(post.id, post.text)}
                          className="rounded-lg border border-white/15 px-2 py-1 text-xs text-white/60 hover:text-white disabled:opacity-50"
                        >
                          New image
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {advancedOpen ? (
                    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-white/[0.08] pt-3">
                      <button
                        type="button"
                        disabled={img?.loading || loading || !offer.trim()}
                        onClick={() => void generatePostImage(post.id, post.text)}
                        className="rounded-lg border border-indigo-500/30 px-3 py-1.5 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/10 disabled:opacity-50"
                      >
                        Image
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : !loading ? (
          <div className="rounded-xl border border-dashed border-white/10 py-16 text-center text-sm text-white/40">
            No posts yet. Generate your first post above.
          </div>
        ) : null}
      </section>

      {posts.length > 0 ? (
        <div className="sticky bottom-0 z-10 mt-8 flex flex-wrap items-center gap-4 border-t border-white/[0.08] bg-[#07080F]/95 px-2 py-4 backdrop-blur-sm sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">Posts ready — share them to get leads</p>
            <p className="text-xs text-white/40">Then track who visits your landing page</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard/leads")}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 font-medium text-white transition-colors hover:bg-indigo-500"
          >
            View leads & closing →
          </button>
        </div>
      ) : null}
    </div>
  );
}
