"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

type ChatMessage = { role: "user" | "assistant"; text: string };

export default function PublicLandingPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const editMode = searchParams.get("edit") === "true";
  const slug = params.slug;

  const [html, setHtml] = useState("");
  const [currentHtml, setCurrentHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [updating, setUpdating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Tell me what you want to change and I will apply it to your page."
    }
  ]);
  const [showPromo, setShowPromo] = useState(false);
  const [updateMessageIndex, setUpdateMessageIndex] = useState(0);

  const pageUrl = useMemo(() => `https://www.lacore.ai/p/${slug}`, [slug]);

  const updateStatusMessages = useMemo(
    () => [
      "Analyzing your request...",
      "Rewriting HTML structure...",
      "Applying design changes...",
      "Almost done..."
    ],
    []
  );

  const fetchHtml = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    const { data } = (await supabase
      .from("landing_pages")
      .select("html_content")
      .eq("slug", slug)
      .single()) as unknown as { data: { html_content: string } | null };
    const content = (data as { html_content: string } | null)?.html_content ?? "";
    setHtml(content);
    setCurrentHtml(content);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    void fetchHtml();
  }, [fetchHtml]);

  useEffect(() => {
    if (!updating) return;
    setUpdateMessageIndex(0);
    const id = setInterval(() => {
      setUpdateMessageIndex((i) => (i + 1) % updateStatusMessages.length);
    }, 2000);
    return () => clearInterval(id);
  }, [updating, updateStatusMessages.length]);

  async function handleShare() {
    await navigator.clipboard.writeText(pageUrl);
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const instruction = chatInput.trim();
    if (!instruction || updating) return;

    setMessages((prev) => [...prev, { role: "user", text: instruction }]);
    setChatInput("");
    setUpdating(true);

    try {
      const supabase = getSupabaseClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Sign in required to edit this page.");
      }

      const response = await fetch("/api/edit-landing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ slug, instruction, currentHtml })
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Failed to update page.");
      }

      setHtml(result.html);
      setCurrentHtml(result.html);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Updated: ${instruction}` }
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update page.";
      setMessages((prev) => [...prev, { role: "assistant", text: message }]);
    } finally {
      setUpdating(false);
    }
  }

  const promoModal = showPromo && (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lacore-promo-title"
      onClick={() => setShowPromo(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(9,9,11,0.96)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 560,
          background: "#09090B",
          border: "1px solid #1C1C1F",
          padding: "48px 40px 40px",
          boxShadow: "0 0 0 1px rgba(6,182,212,0.08), 0 24px 80px rgba(0,0,0,0.55)"
        }}
      >
        <button
          type="button"
          onClick={() => setShowPromo(false)}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            border: "none",
            background: "transparent",
            color: "#06B6D4",
            fontSize: 28,
            lineHeight: 1,
            cursor: "pointer",
            padding: 4,
            fontFamily: "var(--font-space-mono), monospace"
          }}
        >
          ×
        </button>

        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-space-mono), monospace",
            fontSize: 10,
            letterSpacing: "4px",
            color: "#06B6D4",
            textTransform: "uppercase"
          }}
        >
          BUILT WITH
        </p>
        <h2
          id="lacore-promo-title"
          style={{
            margin: "12px 0 0",
            fontFamily: "var(--font-bebas-neue), sans-serif",
            fontSize: "clamp(72px, 22vw, 120px)",
            lineHeight: 0.9,
            color: "#F4F4F5",
            letterSpacing: "-0.02em"
          }}
        >
          LACORE
        </h2>
        <p
          style={{
            margin: "8px 0 0",
            fontFamily: "var(--font-bebas-neue), sans-serif",
            fontSize: "clamp(32px, 8vw, 48px)",
            lineHeight: 0.95,
            color: "#06B6D4"
          }}
        >
          From idea to first client.
        </p>
        <p
          style={{
            margin: "20px 0 0",
            fontFamily: "var(--font-space-mono), monospace",
            fontSize: 14,
            lineHeight: 1.65,
            color: "#A1A1AA"
          }}
        >
          One sentence. 60 minutes. A working sales machine.
        </p>
        <div
          style={{
            marginTop: 28,
            height: 1,
            background: "linear-gradient(90deg, transparent, #06B6D4, transparent)",
            opacity: 0.6
          }}
        />
        <div
          style={{
            marginTop: 28,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            textAlign: "center"
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-bebas-neue), sans-serif",
                fontSize: 42,
                lineHeight: 1,
                color: "#F4F4F5"
              }}
            >
              60 min
            </p>
            <p
              style={{
                margin: "10px 0 0",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 11,
                letterSpacing: "0.06em",
                color: "#71717A",
                textTransform: "uppercase"
              }}
            >
              to live landing page
            </p>
          </div>
          <div>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-bebas-neue), sans-serif",
                fontSize: 42,
                lineHeight: 1,
                color: "#06B6D4"
              }}
            >
              0
            </p>
            <p
              style={{
                margin: "10px 0 0",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 11,
                letterSpacing: "0.06em",
                color: "#71717A",
                textTransform: "uppercase"
              }}
            >
              design skills needed
            </p>
          </div>
        </div>
        <a
          href="https://www.lacore.ai"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "block",
            marginTop: 36,
            width: "100%",
            textAlign: "center",
            textDecoration: "none",
            background: "#06B6D4",
            color: "#000000",
            fontFamily: "var(--font-bebas-neue), sans-serif",
            fontSize: 24,
            letterSpacing: "0.04em",
            padding: "18px 24px",
            border: "none",
            cursor: "pointer",
            boxSizing: "border-box"
          }}
        >
          CREATE YOUR FREE SITE →
        </a>
        <p
          style={{
            margin: "14px 0 0",
            textAlign: "center",
            fontFamily: "var(--font-space-mono), monospace",
            fontSize: 11,
            color: "#52525B",
            letterSpacing: "0.04em"
          }}
        >
          No credit card. No code. No agency.
        </p>
      </div>
    </div>
  );

  if (!editMode) {
    return (
      <>
        <main style={{ minHeight: "100vh", margin: 0, padding: 0, position: "relative" }}>
          {loading ? (
            <div
              style={{
                minHeight: "100vh",
                background: "#09090B",
                color: "#A1A1AA",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-space-mono), monospace"
              }}
            >
              Loading page...
            </div>
          ) : (
            <>
              <iframe
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                srcDoc={html}
                title="Landing page preview"
                style={{ width: "100%", height: "100vh", border: "none", display: "block" }}
              />
              <button
                type="button"
                onClick={() => setShowPromo(true)}
                style={{
                  position: "fixed",
                  bottom: 20,
                  right: 20,
                  zIndex: 9998,
                  border: "1px solid #06B6D4",
                  background: "rgba(9,9,11,0.92)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  color: "#06B6D4",
                  borderRadius: 4,
                  padding: "8px 14px",
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 9,
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
                }}
              >
                ⚡ Built with LACORE
              </button>
            </>
          )}
        </main>
        {promoModal}
      </>
    );
  }

  return (
    <>
    <main style={{ minHeight: "100vh", margin: 0, padding: 0, background: "#09090B" }}>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <section style={{ width: "70%", minHeight: "100vh", background: "#06080d" }}>
          <div
            style={{
              height: 56,
              borderBottom: "1px solid #1C1C1F",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 16px"
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 11,
                color: "#A1A1AA"
              }}
            >
              lacore.ai/p/{slug}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleShare}
                style={{
                  border: "1px solid #1C1C1F",
                  background: "transparent",
                  color: "#A1A1AA",
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  padding: "8px 10px",
                  cursor: "pointer"
                }}
              >
                SHARE →
              </button>
              <button
                type="button"
                onClick={() => void fetchHtml()}
                style={{
                  border: "1px solid #06B6D4",
                  background: "transparent",
                  color: "#06B6D4",
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  padding: "8px 10px",
                  cursor: "pointer"
                }}
              >
                REGENERATE
              </button>
            </div>
          </div>
          {loading ? (
            <div
              style={{
                height: "calc(100vh - 56px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#A1A1AA",
                fontFamily: "var(--font-space-mono), monospace"
              }}
            >
              Loading page...
            </div>
          ) : (
            <iframe
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              srcDoc={html}
              title="Landing page preview"
              style={{
                width: "100%",
                height: "calc(100vh - 56px)",
                border: "none",
                display: "block"
              }}
            />
          )}
        </section>

        <aside
          style={{
            width: "30%",
            minHeight: "100vh",
            borderLeft: "1px solid #1C1C1F",
            background: "#09090B",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div style={{ padding: 16, borderBottom: "1px solid #1C1C1F" }}>
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-bebas-neue), sans-serif",
                fontSize: 38,
                color: "#06B6D4"
              }}
            >
              EDIT YOUR PAGE
            </h2>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "grid", gap: 10 }}>
            {messages.map((message, idx) => (
              <div
                key={`${message.role}-${idx}`}
                style={{
                  border: `1px solid ${message.role === "assistant" ? "#1C1C1F" : "#06B6D4"}`,
                  background: message.role === "assistant" ? "#111115" : "rgba(6,182,212,0.08)",
                  padding: 10
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 11,
                    color: message.role === "assistant" ? "#A1A1AA" : "#06B6D4"
                  }}
                >
                  {message.text}
                </p>
              </div>
            ))}
            {updating && (
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 11,
                  color: "#06B6D4"
                }}
              >
                {updateStatusMessages[updateMessageIndex]}
              </p>
            )}
          </div>

          <form onSubmit={handleEdit} style={{ padding: 16, borderTop: "1px solid #1C1C1F" }}>
            <input
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Tell me what to change..."
              style={{
                width: "100%",
                border: "1px solid #1C1C1F",
                background: "#0F0F12",
                color: "#F4F4F5",
                padding: "10px 12px",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 12,
                outline: "none"
              }}
            />
            <button
              type="submit"
              disabled={updating || !chatInput.trim()}
              style={{
                marginTop: 8,
                width: "100%",
                border: "1px solid #06B6D4",
                background: "transparent",
                color: "#06B6D4",
                padding: "10px 12px",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 11,
                letterSpacing: "0.14em",
                cursor: updating || !chatInput.trim() ? "not-allowed" : "pointer"
              }}
            >
              APPLY →
            </button>
          </form>

          <button
            type="button"
            onClick={() => setShowPromo(true)}
            style={{
              margin: "0 16px 16px",
              border: "1px solid #06B6D4",
              background: "rgba(9,9,11,0.92)",
              color: "#06B6D4",
              borderRadius: 4,
              padding: "8px 14px",
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 9,
              letterSpacing: "0.08em",
              cursor: "pointer",
              boxShadow: "0 8px 32px rgba(0,0,0,0.35)"
            }}
          >
            ⚡ Built with LACORE
          </button>
        </aside>
      </div>
    </main>
    {promoModal}
    </>
  );
}
