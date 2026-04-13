"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useCreditsBalance } from "@/components/dashboard/useCreditsBalance";
import { getSupabaseClient } from "@/lib/supabase";

type Platform = "instagram" | "x" | "linkedin" | "threads" | "telegram";
type PostType = "hook" | "value" | "story" | "offer" | "case_study";
type ModelId = "claude" | "gpt4o" | "gemini";

interface ContentMachineProps {
  offer: string;
  audience: string;
  userId: string;
  projectId: string | null;
}

type PostItem = {
  id: string;
  text: string;
  platform: Platform;
  postType: PostType;
};

type PostImageState = { url?: string; loading: boolean; error: string };

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "x", label: "X" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "threads", label: "Threads" },
  { id: "telegram", label: "Telegram" }
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

const PLATFORM_SET = new Set<string>(PLATFORMS.map((p) => p.id));
const POST_TYPE_SET = new Set<string>(POST_TYPES.map((p) => p.id));

function asPlatform(raw: string | null | undefined): Platform {
  const p = (raw ?? "").trim();
  return PLATFORM_SET.has(p) ? (p as Platform) : "instagram";
}

function asPostType(raw: string | null | undefined): PostType {
  const t = (raw ?? "").trim();
  return POST_TYPE_SET.has(t) ? (t as PostType) : "hook";
}

function platformLabel(p: Platform): string {
  return PLATFORMS.find((x) => x.id === p)?.label ?? p;
}

function postTypeLabel(t: PostType): string {
  return POST_TYPES.find((x) => x.id === t)?.label ?? t;
}

function downloadImageViaProxy(url: string) {
  window.location.href = `/api/content/proxy-image?url=${encodeURIComponent(url)}`;
}

function PlatformBrandIcon({ platform }: { platform: Platform }) {
  if (platform === "instagram") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <defs>
          <linearGradient id="ig-grad" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FEDA77" />
            <stop offset="0.3" stopColor="#F58529" />
            <stop offset="0.6" stopColor="#DD2A7B" />
            <stop offset="1" stopColor="#8134AF" />
          </linearGradient>
        </defs>
        <rect x="2.5" y="2.5" width="19" height="19" rx="6" fill="url(#ig-grad)" />
        <rect x="7.2" y="7.2" width="9.6" height="9.6" rx="4.8" stroke="white" strokeWidth="1.6" />
        <circle cx="16.8" cy="7.2" r="1.2" fill="white" />
      </svg>
    );
  }
  if (platform === "x") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="2.5" y="2.5" width="19" height="19" rx="6" fill="#111111" />
        <path d="M7.7 6.8h2.8l2.5 3.6 3.1-3.6h2.2l-4.2 4.8 4.5 6.4h-2.8l-2.9-4.1-3.5 4.1h-2.2l4.7-5.4-4.2-5.8z" fill="white" />
      </svg>
    );
  }
  if (platform === "linkedin") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="2.5" y="2.5" width="19" height="19" rx="4.5" fill="#0A66C2" />
        <rect x="6.6" y="10.1" width="2.1" height="7.3" fill="white" />
        <rect x="6.6" y="7.1" width="2.1" height="2.1" rx="1.05" fill="white" />
        <path d="M10.4 10.1h2v1c.4-.7 1.2-1.2 2.4-1.2 2.1 0 3.2 1.4 3.2 3.7v3.8h-2.1v-3.5c0-1-.4-1.9-1.5-1.9-1.1 0-1.8.8-1.8 2v3.4h-2.1v-7.3z" fill="white" />
      </svg>
    );
  }
  if (platform === "threads") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="2.5" y="2.5" width="19" height="19" rx="6" fill="#111111" />
        <path d="M12.3 7.1c2.8 0 4.6 1.6 4.9 4.4.9.3 1.5 1 1.5 2 0 2.1-1.7 3.5-4.5 3.5-2.7 0-4.5-1.4-4.8-3.7h2.1c.2 1.1 1.1 1.8 2.7 1.8 1.4 0 2.3-.6 2.3-1.5 0-.6-.4-1-.9-1.1-.7 1.2-1.9 1.9-3.7 1.9-2 0-3.4-1.1-3.4-2.9 0-1.8 1.5-3 3.8-3 .9 0 1.8.2 2.5.6-.4-1.1-1.3-1.7-2.6-1.7-1.3 0-2.2.5-2.7 1.6H7.8c.5-2.2 2.2-3.4 4.5-3.4zm-.2 5.6c0 .8.6 1.3 1.6 1.3.9 0 1.6-.4 2-1.1-.5-.3-1.1-.5-1.9-.5-1 0-1.7.4-1.7 1.3z" fill="white" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9.5" fill="#229ED9" />
      <path d="M7.2 11.8 16.6 8.1c.4-.2.8.2.7.6l-1.6 7.6c-.1.5-.7.7-1.1.4l-2.2-1.7-1.2 1.1c-.3.3-.8.1-.8-.3v-1.8l4.2-3.8c.2-.2 0-.5-.2-.3l-5.5 3.5-1.8-.6c-.5-.2-.5-.8-.1-1z" fill="white" />
    </svg>
  );
}

const LONG_POST_CHARS = 320;

export default function ContentMachine({ offer, audience, userId, projectId }: ContentMachineProps) {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [postType, setPostType] = useState<PostType>("hook");
  const [model, setModel] = useState<ModelId>("claude");
  const [customPrompt, setCustomPrompt] = useState("");
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [postImages, setPostImages] = useState<Record<string, PostImageState>>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [creditsError, setCreditsError] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [postsLoading, setPostsLoading] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [postActionBusyId, setPostActionBusyId] = useState<string | null>(null);
  const creditsBal = useCreditsBalance();

  const fetchGeneratedPosts = useCallback(async () => {
    if (!userId || !projectId) {
      setPosts([]);
      return;
    }
    setPostsLoading(true);
    const supabase = getSupabaseClient();
    const { data, error: qErr } = await supabase
      .from("generated_posts")
      .select("id, platform, post_type, content")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setPostsLoading(false);
    if (qErr || !data?.length) {
      if (qErr) console.warn("generated_posts:", qErr.message);
      return;
    }
    const rows = data as { id: string; platform: string; post_type: string | null; content: string }[];
    setPosts(
      rows.map((row) => ({
        id: row.id,
        text: row.content,
        platform: asPlatform(row.platform),
        postType: asPostType(row.post_type ?? undefined)
      }))
    );
  }, [userId, projectId]);

  useEffect(() => {
    void fetchGeneratedPosts();
  }, [fetchGeneratedPosts]);

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

      if (projectId) {
        const insertRows = data.posts.map((p) => ({
          user_id: userId,
          project_id: projectId,
          platform,
          post_type: postType,
          content: p.text
        }));
        const { data: inserted, error: insErr } = await supabase
          .from("generated_posts")
          .insert(insertRows as never)
          .select("id, platform, post_type, content");
        if (!insErr && inserted?.length) {
          const rows = inserted as { id: string; platform: string; post_type: string | null; content: string }[];
          setPosts(
            rows.map((row) => ({
              id: row.id,
              text: row.content,
              platform: asPlatform(row.platform),
              postType: asPostType(row.post_type ?? undefined)
            }))
          );
        } else {
          if (insErr) console.warn("generated_posts insert:", insErr.message);
          setPosts(
            data.posts.map((p, i) => ({
              id: `local-${Date.now()}-${i}`,
              text: p.text,
              platform,
              postType
            }))
          );
        }
      } else {
        setPosts(
          data.posts.map((p, i) => ({
            id: `local-${Date.now()}-${i}`,
            text: p.text,
            platform,
            postType
          }))
        );
      }
      setPostImages({});
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [audience, customPrompt, offer, model, platform, postType, userId, projectId]);

  async function generatePostImage(postId: string, postText: string) {
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

    const post = posts.find((p) => p.id === postId);
    const imgPlatform = post?.platform ?? platform;

    try {
      const res = await fetch("/api/content/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          platform: imgPlatform,
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

  async function handleRegeneratePost(postId: string) {
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

    const target = posts.find((p) => p.id === postId);
    const regenPlatform = target?.platform ?? platform;
    const regenPostType = target?.postType ?? postType;

    setRegeneratingId(postId);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          platform: regenPlatform,
          postType: regenPostType,
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
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, text: newText } : p))
      );
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

  async function handleCopy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 2000);
  }

  function startEditPost(post: PostItem) {
    setEditingPostId(post.id);
    setEditingText(post.text);
  }

  async function saveEditPost(postId: string) {
    const content = editingText.trim();
    if (!content) return;
    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    setPostActionBusyId(postId);
    try {
      const res = await fetch("/api/content/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ post_id: postId, content })
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not save post.");
        return;
      }
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, text: content } : p)));
      setEditingPostId(null);
      setEditingText("");
    } finally {
      setPostActionBusyId(null);
    }
  }

  async function deletePost(postId: string) {
    const ok = window.confirm("Delete this post?");
    if (!ok) return;
    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    setPostActionBusyId(postId);
    try {
      const res = await fetch("/api/content/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ post_id: postId })
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not delete post.");
        return;
      }
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setPostImages((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      if (editingPostId === postId) {
        setEditingPostId(null);
        setEditingText("");
      }
    } finally {
      setPostActionBusyId(null);
    }
  }

  const pillCls = (on: boolean) =>
    `rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors duration-150 border ${
      on
        ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-300"
        : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white/70"
    }`;

  const platformTabCls = (on: boolean) =>
    `flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
      on
        ? "border-indigo-500/45 bg-indigo-500/18 text-indigo-200"
        : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white/75"
    }`;

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
        <div className="mb-4 flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              className={platformTabCls(platform === p.id)}
              title={p.label}
            >
              <PlatformBrandIcon platform={p.id} />
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
            <span className="text-xs text-white/45">Use the Credits widget in the sidebar to buy more credits.</span>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void runGenerate()}
            disabled={loading || !offer.trim() || !userId}
            className={`flex-1 rounded-xl py-3.5 text-sm font-semibold transition-colors duration-150 ${
              loading || !offer.trim()
                ? "cursor-not-allowed bg-white/10 text-white/35 content-machine-generating"
                : "bg-indigo-600 text-white hover:bg-indigo-500"
            }`}
          >
            {loading ? "Generating…" : "Generate post →"}
          </button>
          {posts.length > 0 ? (
            <button
              type="button"
              onClick={() => void runGenerate()}
              disabled={loading || !offer.trim() || !userId}
              className="rounded-xl border border-white/15 px-4 py-3.5 text-sm font-medium text-white/60 transition-colors hover:border-indigo-500/40 hover:text-indigo-300 disabled:opacity-40"
            >
              Generate new
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-center text-xs text-white/30">
          Uses credits per run
          {creditsBal !== null ? ` · ${creditsBal} remaining` : ""}
        </p>
        {error ? <p className="mt-2 text-center text-sm text-red-400">{error}</p> : null}
      </section>

      <section>
        {postsLoading && posts.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/40">Loading saved posts…</p>
        ) : null}
        {posts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {posts.map((post, idx) => {
              const img = postImages[post.id];
              const isLong = post.text.length > LONG_POST_CHARS;
              const expanded = expandedPosts[post.id];
              return (
                <div
                  key={`${post.id}-${idx}`}
                  className="group rounded-xl border border-white/[0.08] bg-white/[0.04] p-5 transition-colors hover:border-white/[0.15]"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-wider text-white/50">
                        {platformLabel(post.platform)}
                      </span>
                      <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-white/25">
                        {postTypeLabel(post.postType)}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={postActionBusyId === post.id}
                        onClick={() => void deletePost(post.id)}
                        className="rounded p-1 text-xs text-red-400/0 transition-all group-hover:text-red-400/75 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
                        aria-label="Delete post"
                      >
                        ✕
                      </button>
                      <button
                        type="button"
                        disabled={postActionBusyId === post.id}
                        onClick={() => startEditPost(post)}
                        className="text-xs text-white/40 transition-colors hover:text-white/70 disabled:opacity-50"
                      >
                        Edit
                      </button>
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
                  {editingPostId === post.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={6}
                        className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm leading-relaxed text-white placeholder:text-white/25 focus:border-indigo-500/50 focus:outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPostId(null);
                            setEditingText("");
                          }}
                          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/50 hover:text-white/70"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={postActionBusyId === post.id || !editingText.trim()}
                          onClick={() => void saveEditPost(post.id)}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className={`text-sm leading-relaxed text-white/70 whitespace-pre-wrap ${
                        !expanded && isLong ? "line-clamp-6" : ""
                      }`}
                    >
                      {post.text}
                    </p>
                  )}
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
        ) : !loading && !postsLoading ? (
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
