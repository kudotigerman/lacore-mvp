"use client";

import {
  type ComponentType,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { compileLandingJsx } from "@/lib/compileLandingJsx";

type ChatMessage = { role: "user" | "assistant"; text: string; time?: string };

function LiveLandingView({ jsxSource }: { jsxSource: string }) {
  const [Comp, setComp] = useState<ComponentType | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setCompileError(null);
      const C = compileLandingJsx(jsxSource);
      setComp(() => C);
    } catch (e) {
      setComp(null);
      setCompileError(e instanceof Error ? e.message : "Could not load this page.");
    }
  }, [jsxSource]);

  if (compileError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#09090B",
          color: "#f87171",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "var(--font-space-mono), monospace",
          fontSize: 13,
          textAlign: "center"
        }}
      >
        {compileError}
      </div>
    );
  }

  if (!Comp) {
    return (
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
    );
  }

  return <Comp />;
}

export default function PublicLandingPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const editMode = searchParams.get("edit") === "true";
  const slug = params.slug;

  const [html, setHtml] = useState("");
  const [jsxContent, setJsxContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [updating, setUpdating] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return [
      {
        role: "assistant",
        text: "Your landing page is live. Tell me what you'd like to change.",
        time
      }
    ];
  });
  const [showPromo, setShowPromo] = useState(false);
  const [updateMessageIndex, setUpdateMessageIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [dashBackHover, setDashBackHover] = useState(false);
  const [chatInputFocused, setChatInputFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const pageUrl = useMemo(() => `https://www.lacore.ai/p/${slug}`, [slug]);

  const updateStatusMessages = useMemo(
    () => [
      "Analyzing your request...",
      "Rewriting structure...",
      "Applying design changes...",
      "Almost done..."
    ],
    []
  );

  const useLiveReact = Boolean(jsxContent.trim());

  const fetchHtml = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    const { data } = (await supabase
      .from("landing_pages")
      .select("html_content, jsx_content")
      .eq("slug", slug)
      .single()) as unknown as {
      data: { html_content: string | null; jsx_content: string | null } | null;
    };
    const row = data as { html_content: string | null; jsx_content: string | null } | null;
    setHtml(row?.html_content ?? "");
    setJsxContent(row?.jsx_content ?? "");
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, updating]);

  async function handleShare() {
    await navigator.clipboard.writeText(pageUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function handleEditDirect() {
    const instruction = chatInput.trim();
    if (!instruction || updating) return;

    const timeUser = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { role: "user", text: instruction, time: timeUser }]);
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

      const bodyPayload = useLiveReact
        ? { slug, instruction, currentJsx: jsxContent }
        : { slug, instruction, currentHtml: html };

      const response = await fetch("/api/edit-landing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(bodyPayload)
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Failed to update page.");
      }

      if (typeof result.jsx === "string" && result.jsx.trim()) {
        setJsxContent(result.jsx);
      }
      if (typeof result.html === "string" && result.html.trim()) {
        setHtml(result.html);
      }
      const timeAssistant = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Updated: ${instruction}`, time: timeAssistant }
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update page.";
      const timeAssistant = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [...prev, { role: "assistant", text: message, time: timeAssistant }]);
    } finally {
      setUpdating(false);
    }
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleEditDirect();
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
          ) : useLiveReact ? (
            <>
              <div style={{ width: "100%", minHeight: "100vh" }}>
                <LiveLandingView
                  jsxSource={jsxContent}
                  key={jsxContent.slice(0, 120) + jsxContent.length}
                />
              </div>
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
          ) : (
            <>
              <iframe
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
                srcDoc={html}
                title="Landing page preview"
                style={{
                  width: "100%",
                  height: "100vh",
                  minHeight: "100vh",
                  border: "none",
                  display: "block"
                }}
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
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
        }
        @keyframes progressSlide {
          0% { width: 0%; left: 0; }
          50% { width: 60%; left: 20%; }
          100% { width: 0%; left: 100%; }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "#09090B"
        }}
      >
        <header
          style={{
            height: 52,
            flexShrink: 0,
            background: "#09090B",
            borderBottom: "1px solid #1C1C1F",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/dashboard";
              }}
              onMouseEnter={() => setDashBackHover(true)}
              onMouseLeave={() => setDashBackHover(false)}
              style={{
                border: "none",
                background: "transparent",
                color: "#06B6D4",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 11,
                letterSpacing: "2px",
                cursor: "pointer",
                padding: "6px 0",
                opacity: dashBackHover ? 0.7 : 1
              }}
            >
              ← DASHBOARD
            </button>
            <div style={{ width: 1, height: 20, background: "#1C1C1F" }} />
            <span
              style={{
                background: "#111115",
                border: "1px solid #1C1C1F",
                color: "#A1A1AA",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 11,
                padding: "5px 12px",
                borderRadius: 4
              }}
            >
              lacore.ai/p/{slug}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => void handleShare()}
              style={{
                border: "1px solid #1C1C1F",
                background: "transparent",
                color: copied ? "#06B6D4" : "#A1A1AA",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 10,
                letterSpacing: "2px",
                padding: "7px 14px",
                cursor: "pointer"
              }}
            >
              {copied ? "COPIED!" : "SHARE"}
            </button>
            <button
              type="button"
              onClick={() => window.open(`/p/${slug}`, "_blank")}
              style={{
                border: "1px solid #1C1C1F",
                background: "transparent",
                color: "#A1A1AA",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 10,
                letterSpacing: "2px",
                padding: "7px 14px",
                cursor: "pointer"
              }}
            >
              PREVIEW ↗
            </button>
            <button
              type="button"
              onClick={() => void fetchHtml()}
              style={{
                border: "1px solid #1C1C1F",
                background: "transparent",
                color: "#A1A1AA",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 10,
                padding: "7px 14px",
                cursor: "pointer"
              }}
            >
              REGENERATE
            </button>
          </div>
        </header>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            height: "calc(100vh - 52px)",
            flex: 1,
            minHeight: 0
          }}
        >
          <aside
            style={{
              width: 360,
              flexShrink: 0,
              background: "#09090B",
              borderRight: "1px solid #1C1C1F",
              display: "flex",
              flexDirection: "column",
              height: "100%",
              minHeight: 0
            }}
          >
            <div
              style={{
                flexShrink: 0,
                padding: "20px 20px 16px",
                borderBottom: "1px solid #1C1C1F"
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#22C55E",
                    animation: "pulse 2s ease-in-out infinite",
                    flexShrink: 0
                  }}
                />
                <span
                  style={{
                    marginLeft: 10,
                    fontFamily: "var(--font-bebas-neue), sans-serif",
                    fontSize: 22,
                    color: "#F4F4F5",
                    letterSpacing: "1px"
                  }}
                >
                  LACORE AGENT
                </span>
              </div>
              <p
                style={{
                  margin: "6px 0 0",
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 10,
                  color: "#52525B",
                  lineHeight: 1.6
                }}
              >
                Your landing page is live. Tell me what you&apos;d like to change.
              </p>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                minHeight: 0
              }}
            >
              {messages.map((message, idx) =>
                message.role === "assistant" ? (
                  <div
                    key={`${message.role}-${idx}`}
                    style={{
                      background: "#111115",
                      borderLeft: "3px solid #06B6D4",
                      padding: "12px 14px",
                      borderRadius: "0 4px 4px 0",
                      alignSelf: "stretch"
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-space-mono), monospace",
                        fontSize: 12,
                        color: "#E4E4E7",
                        lineHeight: 1.7
                      }}
                    >
                      {message.text}
                    </p>
                    {message.time ? (
                      <p
                        style={{
                          margin: "6px 0 0",
                          fontFamily: "var(--font-space-mono), monospace",
                          fontSize: 9,
                          color: "#3F3F46"
                        }}
                      >
                        {message.time}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div
                    key={`${message.role}-${idx}`}
                    style={{
                      background: "#0C0C0E",
                      border: "1px solid #1C1C1F",
                      padding: "12px 14px",
                      borderRadius: 4,
                      alignSelf: "flex-end",
                      maxWidth: "85%"
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-space-mono), monospace",
                        fontSize: 12,
                        color: "#A1A1AA",
                        lineHeight: 1.7
                      }}
                    >
                      {message.text}
                    </p>
                    {message.time ? (
                      <p
                        style={{
                          margin: "6px 0 0",
                          fontFamily: "var(--font-space-mono), monospace",
                          fontSize: 9,
                          color: "#3F3F46",
                          textAlign: "right"
                        }}
                      >
                        {message.time}
                      </p>
                    ) : null}
                  </div>
                )
              )}
              {updating ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    background: "#111115",
                    borderLeft: "3px solid #06B6D4"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#06B6D4",
                        animation: "bounce 1.2s ease-in-out infinite",
                        animationDelay: "0s"
                      }}
                    />
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#06B6D4",
                        animation: "bounce 1.2s ease-in-out infinite",
                        animationDelay: "0.2s"
                      }}
                    />
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#06B6D4",
                        animation: "bounce 1.2s ease-in-out infinite",
                        animationDelay: "0.4s"
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-space-mono), monospace",
                      fontSize: 11,
                      color: "#06B6D4",
                      marginLeft: 4
                    }}
                  >
                    {updateStatusMessages[updateMessageIndex]}
                  </span>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleEdit}
              style={{
                flexShrink: 0,
                borderTop: "1px solid #1C1C1F",
                padding: 16,
                margin: 0
              }}
            >
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleEditDirect();
                  }
                }}
                onFocus={() => setChatInputFocused(true)}
                onBlur={() => setChatInputFocused(false)}
                placeholder="Tell me what to change..."
                rows={3}
                disabled={updating}
                style={{
                  width: "100%",
                  background: "#0C0C0E",
                  border: `1px solid ${chatInputFocused ? "#06B6D4" : "#1C1C1F"}`,
                  color: "#F4F4F5",
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 12,
                  padding: 12,
                  resize: "none",
                  outline: "none",
                  lineHeight: 1.6,
                  boxSizing: "border-box"
                }}
              />
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 9,
                    color: "#3F3F46"
                  }}
                >
                  ⏎ send &nbsp; ⇧⏎ newline
                </span>
                <button
                  type="submit"
                  disabled={updating || !chatInput.trim()}
                  style={{
                    background: updating || !chatInput.trim() ? "#1C1C1F" : "#06B6D4",
                    color: updating || !chatInput.trim() ? "#3F3F46" : "#000000",
                    fontFamily: "var(--font-bebas-neue), sans-serif",
                    fontSize: 16,
                    letterSpacing: "1px",
                    border: "none",
                    padding: "10px 24px",
                    cursor: updating || !chatInput.trim() ? "not-allowed" : "pointer"
                  }}
                >
                  APPLY →
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowPromo(true)}
                style={{
                  marginTop: 12,
                  width: "100%",
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
            </form>
          </aside>

          <div
            style={{
              flex: 1,
              height: "100%",
              overflow: "hidden",
              position: "relative",
              background: "#06080d",
              minWidth: 0
            }}
          >
            {updating ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 10,
                  pointerEvents: "none"
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(9,9,11,0.15)"
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    overflow: "hidden",
                    zIndex: 11
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      height: 3,
                      background: "linear-gradient(90deg, #06B6D4, #0891B2)",
                      animation: "progressSlide 2s ease-in-out infinite"
                    }}
                  />
                </div>
              </div>
            ) : null}
            <div style={{ height: "100%", overflow: "auto" }}>
              {loading ? (
                <div
                  style={{
                    height: "100%",
                    minHeight: 240,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#A1A1AA",
                    fontFamily: "var(--font-space-mono), monospace"
                  }}
                >
                  Loading page...
                </div>
              ) : useLiveReact ? (
                <LiveLandingView
                  jsxSource={jsxContent}
                  key={jsxContent.slice(0, 120) + jsxContent.length}
                />
              ) : (
                <iframe
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
                  srcDoc={html}
                  title="Landing page preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    minHeight: "100%",
                    border: "none",
                    display: "block"
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      {promoModal}
    </>
  );
}
