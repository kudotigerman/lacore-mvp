"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from "react";

function StarButton({
  index,
  value,
  onPick,
  size
}: {
  index: number;
  value: number;
  onPick: (n: number) => void;
  size: number;
}) {
  const filled = index <= value;
  return (
    <button
      type="button"
      aria-label={`${index} star${index > 1 ? "s" : ""}`}
      onClick={() => onPick(index)}
      style={{
        fontSize: size,
        lineHeight: 1,
        padding: "4px 6px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color: filled ? "#c9a227" : "rgba(0,0,0,0.12)",
        transition: "transform 0.12s ease, color 0.12s ease",
        filter: filled ? "drop-shadow(0 2px 6px rgba(201,162,39,0.35))" : "none"
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      ★
    </button>
  );
}

export default function ReviewPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const [hostName, setHostName] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientRole, setClientRole] = useState("");
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    void fetch(`/api/public/landing-host?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((j: { display_name?: string | null }) => {
        if (!cancelled) setHostName(typeof j.display_name === "string" && j.display_name.trim() ? j.display_name.trim() : null);
      })
      .catch(() => {
        if (!cancelled) setHostName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!slug || submitting) return;
      setError(null);
      setSubmitting(true);
      try {
        const res = await fetch("/api/testimonials/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            client_name: clientName.trim(),
            client_role: clientRole.trim() || undefined,
            rating,
            content: content.trim()
          })
        });
        const j = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(typeof j.error === "string" ? j.error : "Something went wrong.");
          return;
        }
        setDone(true);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [slug, submitting, clientName, clientRole, rating, content]
  );

  const starSize = 44;

  if (!slug) {
    return (
      <div style={shell}>
        <p style={{ color: "#78716c" }}>Invalid link.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div style={shell}>
        <div
          style={{
            maxWidth: 420,
            textAlign: "center",
            padding: "48px 36px",
            borderRadius: 20,
            background: "#fffefb",
            border: "1px solid rgba(120,113,108,0.12)",
            boxShadow: "0 24px 80px rgba(28,25,23,0.08)"
          }}
        >
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1c1917", letterSpacing: "-0.02em", lineHeight: 1.55 }}>
            Thank you! Your review has been submitted 🙏
          </p>
        </div>
      </div>
    );
  }

  const headline =
    hostName != null ? `Share your experience with ${hostName}` : "Share your experience";

  return (
    <div style={shell}>
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          padding: "44px 32px 48px",
          borderRadius: 20,
          background: "#fffefb",
          border: "1px solid rgba(120,113,108,0.12)",
          boxShadow: "0 24px 80px rgba(28,25,23,0.08)"
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#a8a29e",
            fontWeight: 600,
            textAlign: "center"
          }}
        >
          Quick review
        </p>
        <h1
          style={{
            margin: "12px 0 0",
            fontSize: "clamp(22px, 5vw, 26px)",
            fontWeight: 700,
            color: "#1c1917",
            letterSpacing: "-0.03em",
            textAlign: "center",
            lineHeight: 1.25
          }}
        >
          {headline}
        </h1>
        <p style={{ margin: "10px 0 0", fontSize: 14, color: "#78716c", textAlign: "center", lineHeight: 1.5 }}>
          Your honest feedback helps others trust their work.
        </p>

        <form onSubmit={(e) => void onSubmit(e)} style={{ marginTop: 32 }}>
          <label style={label}>
            Your name
            <input
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Jane Doe"
              style={input}
              autoComplete="name"
            />
          </label>

          <label style={{ ...label, marginTop: 18 }}>
            Role or company <span style={{ color: "#a8a29e", fontWeight: 400 }}>(optional)</span>
            <input
              value={clientRole}
              onChange={(e) => setClientRole(e.target.value)}
              placeholder="Founder, Acme Co."
              style={input}
              autoComplete="organization"
            />
          </label>

          <div style={{ marginTop: 22 }}>
            <span style={{ ...label, display: "block", marginBottom: 10 }}>Rating</span>
            <div
              role="group"
              aria-label="Star rating"
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 2,
                marginTop: 8
              }}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <StarButton key={i} index={i} value={rating} onPick={setRating} size={starSize} />
              ))}
            </div>
          </div>

          <label style={{ ...label, marginTop: 22 }}>
            Your review
            <textarea
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What went well? Would you recommend them?"
              rows={5}
              style={{ ...input, resize: "vertical", minHeight: 120, lineHeight: 1.55 }}
            />
          </label>

          {error ? (
            <p style={{ margin: "14px 0 0", fontSize: 13, color: "#b45309", textAlign: "center" }}>{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 24,
              width: "100%",
              padding: "14px 20px",
              borderRadius: 12,
              border: "none",
              background: submitting ? "#d6d3d1" : "#1c1917",
              color: "#fafaf9",
              fontSize: 15,
              fontWeight: 600,
              cursor: submitting ? "wait" : "pointer",
              letterSpacing: "0.02em"
            }}
          >
            {submitting ? "Sending…" : "Submit review"}
          </button>
        </form>
      </div>
    </div>
  );
}

const shell: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  boxSizing: "border-box",
  background: "linear-gradient(165deg, #faf7f2 0%, #f5f0e8 45%, #efe8dd 100%)",
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
};

const label: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#44403c",
  letterSpacing: "0.02em"
};

const input: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 8,
  padding: "12px 14px",
  fontSize: 16,
  borderRadius: 10,
  border: "1px solid rgba(120,113,108,0.2)",
  background: "#fff",
  color: "#1c1917",
  boxSizing: "border-box",
  outline: "none"
};
