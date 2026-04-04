"use client";

import { useCallback, useState, type CSSProperties } from "react";
import { dash } from "@/components/dashboard/dashTokens";
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

const MODELS: { id: ModelId; label: string }[] = [
  { id: "claude", label: "Claude" },
  { id: "gpt4o", label: "GPT-4o" },
  { id: "gemini", label: "Gemini" }
];

function platformLabel(p: Platform): string {
  return PLATFORMS.find((x) => x.id === p)?.label.toUpperCase() ?? p;
}

function modelLabel(m: ModelId): string {
  if (m === "gpt4o") return "GPT-4O";
  return m.toUpperCase();
}

const pillBase: CSSProperties = {
  borderRadius: 20,
  padding: "6px 14px",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
  border: "1px solid #1C1C22",
  background: "rgba(255,255,255,0.03)",
  color: "#71717A"
};

const pillActive: CSSProperties = {
  ...pillBase,
  background: "rgba(6,182,212,0.1)",
  border: "1px solid rgba(6,182,212,0.3)",
  color: "#06B6D4"
};

function downloadImageViaProxy(url: string) {
  window.location.href = `/api/content/proxy-image?url=${encodeURIComponent(url)}`;
}

export default function ContentMachine({ offer, audience, userId }: ContentMachineProps) {
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [postType, setPostType] = useState<PostType>("hook");
  const [model, setModel] = useState<ModelId>("claude");
  const [posts, setPosts] = useState<{ id: number; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [postImages, setPostImages] = useState<Record<number, PostImageState>>({});

  const runGenerate = useCallback(async () => {
    setError("");
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
          userId
        })
      });
      const data = (await res.json()) as { posts?: { id: number; text: string }[]; error?: string };
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
  }, [audience, offer, model, platform, postType, userId]);

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
          userId
        })
      });
      const data = (await res.json()) as { posts?: { id: number; text: string }[]; error?: string };
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

  const rowStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10
  };

  return (
    <div style={{ fontFamily: "inherit", maxWidth: 720 }}>
      <style>{`
        @keyframes content-machine-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .content-machine-generating {
          animation: content-machine-pulse 1.2s ease-in-out infinite;
        }
      `}</style>

      <div style={{ marginBottom: 28 }}>
        <div style={{ ...rowStyle, marginBottom: 10 }}>
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              className={platform === p.id ? undefined : "content-machine-pill"}
              style={platform === p.id ? pillActive : pillBase}
              title={p.label}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ ...rowStyle, marginBottom: 10 }}>
          {POST_TYPES.map((pt) => (
            <button
              key={pt.id}
              type="button"
              onClick={() => setPostType(pt.id)}
              className={postType === pt.id ? undefined : "content-machine-pill"}
              style={postType === pt.id ? pillActive : pillBase}
            >
              {pt.label}
            </button>
          ))}
        </div>
        <div style={{ ...rowStyle, marginBottom: 0 }}>
          {MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModel(m.id)}
              className={model === m.id ? undefined : "content-machine-pill"}
              style={model === m.id ? pillActive : pillBase}
            >
              {m.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void runGenerate()}
          disabled={loading || !offer.trim() || !userId}
          className={loading ? "content-machine-generating" : undefined}
          style={{
            width: "100%",
            border: "none",
            background: loading || !offer.trim() ? "#1C1C22" : "#06B6D4",
            color: loading || !offer.trim() ? "#52525B" : "#000",
            fontSize: 13,
            fontWeight: 700,
            padding: 13,
            borderRadius: 7,
            letterSpacing: "0.08em",
            marginTop: 16,
            cursor: loading || !offer.trim() ? "not-allowed" : "pointer",
            fontFamily: "inherit"
          }}
        >
          {loading ? "Generating…" : "GENERATE"}
        </button>
        {error ? (
          <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#ef4444" }}>{error}</p>
        ) : null}
      </div>

      {posts.length > 0 ? (
        <div style={{ marginBottom: 32 }}>
          <p
            style={{
              margin: "0 0 16px",
              fontSize: "11px",
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              fontWeight: 600
            }}
          >
            5 POSTS FOR {platformLabel(platform)} — {modelLabel(model)}
          </p>
          {posts.map((post, idx) => {
            const img = postImages[post.id];
            return (
              <div
                key={`${post.id}-${idx}`}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-primary)",
                  padding: 20,
                  marginBottom: 14
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#06B6D4",
                    marginBottom: 10
                  }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <div
                  style={{
                    fontSize: "15px",
                    lineHeight: 1.75,
                    color: "var(--text-primary)",
                    whiteSpace: "pre-wrap",
                    marginBottom: 16
                  }}
                >
                  {post.text}
                </div>

                {img?.loading ? (
                  <p
                    className="content-machine-generating"
                    style={{
                      margin: "0 0 12px",
                      fontSize: "11px",
                      color: "var(--text-muted)"
                    }}
                  >
                    Generating image...
                  </p>
                ) : null}
                {img?.error ? (
                  <p style={{ margin: "0 0 12px", fontSize: "11px", color: "#ef4444" }}>{img.error}</p>
                ) : null}

                {img?.url ? (
                  <div style={{ marginTop: 16, marginBottom: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- ephemeral OpenAI URLs */}
                    <img
                      src={img.url}
                      alt=""
                      style={{
                        width: "100%",
                        aspectRatio: "1",
                        objectFit: "cover",
                        borderRadius: 8,
                        border: "1px solid #1C1C22",
                        display: "block"
                      }}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => downloadImageViaProxy(img.url!)}
                        style={{
                          ...dash.btnGhostSm,
                          fontSize: 11,
                          padding: "5px 12px"
                        }}
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        disabled={img.loading}
                        onClick={() => void generatePostImage(post.id, post.text)}
                        style={{
                          ...dash.btnGhostSm,
                          fontSize: 11,
                          padding: "5px 12px",
                          opacity: img.loading ? 0.5 : 1
                        }}
                      >
                        New image
                      </button>
                    </div>
                  </div>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                    flexWrap: "wrap",
                    marginTop: 12,
                    borderTop: "1px solid #1C1C22",
                    paddingTop: 12
                  }}
                >
                  <button
                    type="button"
                    onClick={() => void handleCopy(post.text, post.id)}
                    style={{ ...dash.btnGhostSm, fontSize: 11, padding: "5px 12px" }}
                  >
                    {copiedId === post.id ? "Copied" : "COPY"}
                  </button>
                  <button
                    type="button"
                    disabled={regeneratingId !== null || loading}
                    onClick={() => void handleRegeneratePost(post.id)}
                    style={{
                      ...dash.btnGhostSm,
                      fontSize: 11,
                      padding: "5px 12px",
                      opacity: regeneratingId !== null || loading ? 0.5 : 1
                    }}
                  >
                    {regeneratingId === post.id ? "…" : "Regenerate"}
                  </button>
                  <button
                    type="button"
                    disabled={img?.loading || loading || !offer.trim()}
                    onClick={() => void generatePostImage(post.id, post.text)}
                    style={{
                      ...dash.btnGhostSm,
                      fontSize: 11,
                      padding: "5px 12px",
                      opacity: img?.loading || loading || !offer.trim() ? 0.5 : 1
                    }}
                  >
                    GENERATE IMAGE
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {!loading && posts.length === 0 ? (
        <p
          style={{
            fontSize: "14px",
            color: "var(--text-muted)",
            textAlign: "center",
            padding: "60px 0",
            margin: 0,
            lineHeight: 1.6
          }}
        >
          Select platform, post type and AI model above
          <br />
          then click GENERATE
        </p>
      ) : null}
    </div>
  );
}
