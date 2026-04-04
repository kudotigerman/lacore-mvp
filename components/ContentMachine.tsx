"use client";

import { useCallback, useState, type CSSProperties } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type Platform = "instagram" | "x" | "linkedin" | "threads" | "telegram";
type PostType = "hook" | "value" | "story" | "offer" | "case_study";
type ModelId = "claude" | "gpt4o" | "gemini";
type ImageStyle = "professional" | "creative" | "minimal" | "bold";

interface ContentMachineProps {
  offer: string;
  audience: string;
  userId: string;
}

const PLATFORMS: { id: Platform; label: string; short: string }[] = [
  { id: "instagram", label: "Instagram", short: "IG" },
  { id: "x", label: "X", short: "𝕏" },
  { id: "linkedin", label: "LinkedIn", short: "in" },
  { id: "threads", label: "Threads", short: "〒" },
  { id: "telegram", label: "Telegram", short: "✈️" }
];

const IMAGE_STYLES: { id: ImageStyle; label: string }[] = [
  { id: "professional", label: "Professional" },
  { id: "creative", label: "Creative" },
  { id: "minimal", label: "Minimal" },
  { id: "bold", label: "Bold" }
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

export default function ContentMachine({ offer, audience, userId }: ContentMachineProps) {
  const [activeTab, setActiveTab] = useState<"text" | "image">("text");

  const [platform, setPlatform] = useState<Platform>("instagram");
  const [postType, setPostType] = useState<PostType>("hook");
  const [model, setModel] = useState<ModelId>("claude");
  const [posts, setPosts] = useState<{ id: number; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);

  const [imagePlatform, setImagePlatform] = useState<Platform>("instagram");
  const [imageStyle, setImageStyle] = useState<ImageStyle>("professional");
  const [images, setImages] = useState<{ id: number; url: string }[] | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState("");

  const btnBase: CSSProperties = {
    border: "1px solid var(--border-primary)",
    color: "var(--text-secondary)",
    background: "transparent",
    padding: "8px 12px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    borderRadius: 4
  };

  const btnActive: CSSProperties = {
    ...btnBase,
    background: "#06B6D4",
    color: "#000",
    border: "1px solid #06B6D4"
  };

  const tabBase: CSSProperties = {
    padding: "10px 24px",
    fontSize: "12px",
    letterSpacing: "0.08em",
    cursor: "pointer",
    fontFamily: "inherit",
    border: "1px solid var(--border-primary)",
    color: "var(--text-secondary)",
    background: "transparent"
  };

  const tabActive: CSSProperties = {
    ...tabBase,
    background: "#06B6D4",
    color: "#000",
    fontWeight: 700,
    border: "1px solid #06B6D4"
  };

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
      setError("Add your offer in Layer 01 first.");
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
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [audience, offer, model, platform, postType, userId]);

  const runImageGenerate = useCallback(async () => {
    setImageError("");
    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setImageError("Sign in required.");
      return;
    }
    if (!offer.trim()) {
      setImageError("Add your offer in Layer 01 first.");
      return;
    }

    setImageLoading(true);
    try {
      const res = await fetch("/api/content/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          platform: imagePlatform,
          style: imageStyle,
          offer: offer.trim(),
          audience: audience.trim(),
          userId
        })
      });
      const data = (await res.json()) as {
        images?: { id: number; url: string }[];
        error?: string;
      };
      if (!res.ok) {
        setImageError(data.error ?? "Image generation failed.");
        return;
      }
      if (!data.images?.length) {
        setImageError("No images returned.");
        return;
      }
      setImages(data.images);
    } catch {
      setImageError("Network error.");
    } finally {
      setImageLoading(false);
    }
  }, [audience, imagePlatform, imageStyle, offer, userId]);

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
    marginBottom: 12
  };

  const outerMaxWidth = activeTab === "image" && images && images.length > 0 ? 720 : 640;

  return (
    <div style={{ fontFamily: "inherit", maxWidth: outerMaxWidth }}>
      <style>{`
        @keyframes content-machine-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .content-machine-generating {
          animation: content-machine-pulse 1.2s ease-in-out infinite;
        }
      `}</style>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => setActiveTab("text")}
          style={activeTab === "text" ? tabActive : tabBase}
        >
          TEXT
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("image")}
          style={activeTab === "image" ? tabActive : tabBase}
        >
          IMAGE
        </button>
      </div>

      {activeTab === "text" ? (
        <>
          <div style={{ marginBottom: 28 }}>
            <div style={{ ...rowStyle, marginBottom: 10 }}>
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlatform(p.id)}
                  style={platform === p.id ? btnActive : btnBase}
                  title={p.label}
                >
                  {p.short} {p.label}
                </button>
              ))}
            </div>
            <div style={{ ...rowStyle, marginBottom: 10 }}>
              {POST_TYPES.map((pt) => (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => setPostType(pt.id)}
                  style={postType === pt.id ? btnActive : btnBase}
                >
                  {pt.label}
                </button>
              ))}
            </div>
            <div style={{ ...rowStyle, marginBottom: 16 }}>
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModel(m.id)}
                  style={model === m.id ? btnActive : btnBase}
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
                background: loading || !offer.trim() ? "var(--border-primary)" : "#06B6D4",
                color: loading || !offer.trim() ? "var(--text-muted)" : "#000",
                fontSize: "13px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                padding: "16px",
                cursor: loading || !offer.trim() ? "not-allowed" : "pointer",
                fontFamily: "inherit"
              }}
            >
              {loading ? "GENERATING..." : "⚡ GENERATE 5 POSTS"}
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
              {posts.map((post, idx) => (
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
                      fontSize: "14px",
                      lineHeight: 1.7,
                      color: "var(--text-primary)",
                      whiteSpace: "pre-wrap",
                      marginBottom: 14
                    }}
                  >
                    {post.text}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => void handleCopy(post.text, post.id)}
                      style={{
                        ...btnBase,
                        fontSize: "11px",
                        letterSpacing: "0.08em"
                      }}
                    >
                      {copiedId === post.id ? "✓ COPIED" : "COPY"}
                    </button>
                    <button
                      type="button"
                      disabled={regeneratingId !== null || loading}
                      onClick={() => void handleRegeneratePost(post.id)}
                      style={{
                        ...btnBase,
                        fontSize: "11px",
                        letterSpacing: "0.06em",
                        opacity: regeneratingId !== null || loading ? 0.5 : 1
                      }}
                    >
                      {regeneratingId === post.id ? "…" : "↺ REGENERATE"}
                    </button>
                  </div>
                </div>
              ))}
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
        </>
      ) : (
        <>
          <div style={{ marginBottom: 28 }}>
            <div style={{ ...rowStyle, marginBottom: 10 }}>
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setImagePlatform(p.id)}
                  style={imagePlatform === p.id ? btnActive : btnBase}
                  title={p.label}
                >
                  {p.short} {p.label}
                </button>
              ))}
            </div>
            <div style={{ ...rowStyle, marginBottom: 16 }}>
              {IMAGE_STYLES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setImageStyle(st.id)}
                  style={imageStyle === st.id ? btnActive : btnBase}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void runImageGenerate()}
              disabled={imageLoading || !offer.trim() || !userId}
              className={imageLoading ? "content-machine-generating" : undefined}
              style={{
                width: "100%",
                border: "none",
                background: imageLoading || !offer.trim() ? "var(--border-primary)" : "#06B6D4",
                color: imageLoading || !offer.trim() ? "var(--text-muted)" : "#000",
                fontSize: "13px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                padding: "16px",
                cursor: imageLoading || !offer.trim() ? "not-allowed" : "pointer",
                fontFamily: "inherit"
              }}
            >
              {imageLoading ? "GENERATING..." : "⚡ GENERATE 2 IMAGES"}
            </button>
            {imageError ? (
              <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#ef4444" }}>{imageError}</p>
            ) : null}
          </div>

          {images && images.length > 0 ? (
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 12
                }}
              >
                {images.map((img) => (
                  <div key={img.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- ephemeral OpenAI URLs, not in next.config */}
                    <img
                      src={img.url}
                      alt={`Generated ${img.id}`}
                      style={{
                        width: "100%",
                        aspectRatio: "1",
                        objectFit: "cover",
                        borderRadius: 4,
                        border: "1px solid var(--border-primary)",
                        display: "block"
                      }}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => window.open(img.url, "_blank", "noopener,noreferrer")}
                        style={{
                          ...btnBase,
                          fontSize: "11px",
                          letterSpacing: "0.06em"
                        }}
                      >
                        ⬇ DOWNLOAD
                      </button>
                      <button
                        type="button"
                        disabled={imageLoading}
                        onClick={() => void runImageGenerate()}
                        style={{
                          ...btnBase,
                          fontSize: "11px",
                          letterSpacing: "0.06em",
                          opacity: imageLoading ? 0.5 : 1
                        }}
                      >
                        {imageLoading ? "…" : "↺ REGENERATE"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                ⚠ Download images now — links expire in 1 hour
              </p>
            </div>
          ) : null}

          {!imageLoading && (!images || images.length === 0) ? (
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
              Select platform and style above
              <br />
              then click GENERATE
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
