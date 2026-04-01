"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";

type Offer = {
  offer: string;
  audience: string;
  pricing: string;
  positioning: string;
  headline: string;
};

export default function LandingPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const canSubmit = input.trim().length > 0 && !loading;

  const tickerText = useMemo(
    () =>
      "OFFER GENERATION · LANDING PAGE · LEAD CAPTURE · AUTO CONTENT · DEAL CLOSING · ANALYTICS · ",
    []
  );
  const layers = useMemo(
    () => [
      {
        number: "01",
        title: "OFFER & POSITIONING",
        description:
          "A sharp offer, target audience, pricing, and competitive positioning. Generated in seconds."
      },
      {
        number: "02",
        title: "YOUR PRESENCE",
        description:
          "Landing page live in minutes. Social profiles optimized. Stripe connected. Ready to take money."
      },
      {
        number: "03",
        title: "CONTENT MACHINE",
        description:
          "Posts published daily to Instagram, X, Threads, LinkedIn. AI-generated visuals. No effort from you."
      },
      {
        number: "04",
        title: "LEAD CAPTURE",
        description:
          "Every DM, comment, and form captured. Leads qualified automatically. Hot ones flagged in real time."
      },
      {
        number: "05",
        title: "CLOSING SYSTEM",
        description:
          "Scripts tailored to your offer. Auto follow-up sequences. Step-by-step guidance to close every deal."
      },
      {
        number: "06",
        title: "ANALYTICS BOARD",
        description:
          "Your entire business on one visual board. Revenue. Leads. What's working. What to do next."
      }
    ],
    []
  );
  const animatedExamples = useMemo(
    () => [
      "I'm a freelance designer working with brands. I want $5,000/month.",
      "I do SMM for small businesses. Looking for 3-4 clients at $1,500 each.",
      "I'm a copywriter, I write landing pages and email sequences. Goal: $8k/month.",
      "I teach English online. Want to fill my schedule and earn $3,000/month.",
      "I'm a video editor working with YouTubers. Want consistent $6k/month income.",
      "I do web design for restaurants and cafes. Want $10,000/month."
    ],
    []
  );

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 768);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    async function getSession() {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { session }
        } = await supabase.auth.getSession();
        setIsLoggedIn(Boolean(session?.user));
      } catch {
        setIsLoggedIn(false);
      }
    }

    void getSession();
  }, []);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    if (isFocused || input.length > 0) return;

    const currentText = animatedExamples[exampleIndex];
    let timeoutId: ReturnType<typeof setTimeout>;

    if (!isDeleting && typedText === currentText) {
      timeoutId = setTimeout(() => setIsDeleting(true), 1500);
      return () => clearTimeout(timeoutId);
    }

    if (isDeleting && typedText.length === 0) {
      timeoutId = setTimeout(() => {
        setIsDeleting(false);
        setExampleIndex((prev) => (prev + 1) % animatedExamples.length);
      }, 400);
      return () => clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(
      () => {
        setTypedText((prev) =>
          isDeleting ? prev.slice(0, -1) : currentText.slice(0, prev.length + 1)
        );
      },
      isDeleting ? 25 : 45
    );

    return () => clearTimeout(timeoutId);
  }, [animatedExamples, exampleIndex, input.length, isDeleting, isFocused, typedText]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setOffer(null);

    try {
      const response = await fetch("/api/generate-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput: trimmed })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to generate offer.");
      }

      setOffer(data.offer);
      setSaveStatus("idle");

      try {
        const supabase = getSupabaseClient();
        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (session?.user) {
          setIsLoggedIn(true);
          setSaveStatus("saving");
          const { error: saveError } = await supabase.from("offers").insert([
            {
              user_id: session.user.id,
              offer: data.offer.offer,
              audience: data.offer.audience,
              pricing: data.offer.pricing,
              positioning: data.offer.positioning,
              headline: data.offer.headline
            }
          ] as never);
          if (saveError) throw saveError;
          setSaveStatus("saved");
        } else {
          setIsLoggedIn(false);
        }
      } catch {
        setSaveStatus("error");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const showAnimatedPlaceholder = !isFocused && input.length === 0;
  const textareaDisplayValue = showAnimatedPlaceholder ? typedText : input;

  return (
    <>
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        @keyframes dot-pulse {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-2px); }
        }
        @keyframes offer-enter {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.45; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
      <main
        style={{
          minHeight: "100vh",
          background: "#09090B",
          color: "#F4F4F5",
          display: "flex",
          flexDirection: "column",
          padding: "0 20px"
        }}
      >
        <nav
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            height: 68,
            background: "rgba(9,9,11,0.9)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid #1C1C1F",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 24px"
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 1300,
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr auto 1fr",
              alignItems: "center",
              gap: 16
            }}
          >
            <p
              style={{
                margin: 0,
                justifySelf: "start",
                fontFamily: "var(--font-bebas-neue), sans-serif",
                fontSize: 22,
                letterSpacing: "0.06em",
                color: "#06B6D4"
              }}
            >
              LACORE
            </p>
            {!isMobile && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  justifySelf: "center",
                  textAlign: "center"
                }}
              >
                {[
                  { href: "#how-it-works", label: "HOW IT WORKS" },
                  { href: "#what-you-get", label: "WHAT YOU GET" },
                  { href: "#pricing", label: "PRICING" }
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    style={{
                      fontFamily: "var(--font-space-mono), monospace",
                      fontSize: 11,
                      letterSpacing: "0.15em",
                      color: "#52525B",
                      textDecoration: "none"
                    }}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            )}
            <button
              type="button"
              style={{
                justifySelf: "end",
                border: "1px solid #06B6D4",
                background: "transparent",
                color: "#06B6D4",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: isMobile ? 10 : 11,
                letterSpacing: "0.15em",
                padding: isMobile ? "8px 16px" : "10px 14px",
                cursor: "pointer"
              }}
            >
              START FOR FREE →
            </button>
          </div>
        </nav>

        <div style={{ height: 68 }} />

        <section
          style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center"
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#06B6D4"
            }}
          >
            LACORE
          </p>

          <h1
            style={{
              margin: "20px 0 0",
              fontFamily: "var(--font-bebas-neue), sans-serif",
              fontSize: isMobile ? "clamp(48px, 12vw, 72px)" : "clamp(72px, 12vw, 160px)",
              lineHeight: 0.95,
              letterSpacing: "0.02em",
              textTransform: "uppercase"
            }}
          >
            <span style={{ display: "block", color: "#F4F4F5" }}>YOU SAY WHAT YOU SELL.</span>
            <span style={{ display: "block", color: "#06B6D4" }}>LACORE DOES THE REST.</span>
          </h1>
          <p
            style={{
              margin: "24px 0 0",
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 12,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#52525B"
            }}
          >
            FROM IDEA TO FIRST CLIENT. AUTOMATICALLY.
          </p>
        </section>

        <section
          style={{
            minHeight: "40vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: "20px"
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              width: "100%",
              maxWidth: 720,
              margin: isMobile ? "0 16px" : "0 auto"
            }}
          >
            <div
              style={{
                background: "#0F0F12",
                border: "1px solid #1C1C1F",
                borderRadius: 2,
                padding: 32
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#06B6D4"
                }}
              >
                WHAT DO YOU SELL?
              </p>
              <textarea
                value={textareaDisplayValue}
                onChange={(event) => setInput(event.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={{
                  width: "100%",
                  marginTop: 14,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "#F4F4F5",
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: isMobile ? 14 : 15,
                  minHeight: 80,
                  resize: "none"
                }}
              />
              {showAnimatedPlaceholder && (
                <span
                  style={{
                    position: "relative",
                    top: -40,
                    marginLeft: 2,
                    color: "#06B6D4",
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: isMobile ? 14 : 15,
                    opacity: showCursor ? 1 : 0
                  }}
                >
                  |
                </span>
              )}
              <div
                style={{
                  marginTop: showAnimatedPlaceholder ? -4 : 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    color: "#3F3F46"
                  }}
                >
                  ↵ ENTER TO START
                </p>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  aria-label="Generate offer"
                  style={{
                    border: "none",
                    background: "transparent",
                    color: canSubmit ? "#06B6D4" : "#3F3F46",
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 28,
                    lineHeight: 1,
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    padding: 0
                  }}
                >
                  →
                </button>
              </div>
            </div>
          </form>

          {loading && (
            <div
              style={{
                width: "100%",
                maxWidth: 720,
                marginTop: 14,
                background: "#0F0F12",
                border: "1px solid #1C1C1F",
                borderRadius: 2,
                padding: "20px 32px",
                display: "flex",
                alignItems: "center",
                gap: 10
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  color: "#06B6D4"
                }}
              >
                ANALYZING YOUR BUSINESS...
              </span>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: "#06B6D4",
                  animation: "dot-pulse 1s ease-in-out infinite"
                }}
              />
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: "#06B6D4",
                  animation: "dot-pulse 1s ease-in-out 0.15s infinite"
                }}
              />
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: "#06B6D4",
                  animation: "dot-pulse 1s ease-in-out 0.3s infinite"
                }}
              />
            </div>
          )}

          {error && (
            <p
              style={{
                width: "100%",
                maxWidth: 720,
                margin: "12px auto 0",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 12,
                color: "#f87171"
              }}
            >
              {error}
            </p>
          )}

          {offer && (
            <div style={{ width: "100%", maxWidth: 720, marginTop: 14 }}>
              <section
                style={{
                  border: "1px solid #06B6D4",
                  background: "#0C0C0E",
                  padding: 20,
                  animation: "offer-enter 400ms ease"
                }}
              >
                <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <h2
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-bebas-neue), sans-serif",
                      fontSize: 38,
                      lineHeight: 1,
                      letterSpacing: "0.04em",
                      color: "#06B6D4"
                    }}
                  >
                    YOUR OFFER
                  </h2>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: "#06B6D4",
                      animation: "pulse-dot 1s ease-in-out infinite"
                    }}
                  />
                </div>
                {[
                  { label: "OFFER", value: offer.offer },
                  { label: "AUDIENCE", value: offer.audience },
                  { label: "PRICING", value: offer.pricing },
                  { label: "POSITIONING", value: offer.positioning },
                  { label: "HEADLINE", value: offer.headline }
                ].map((item, idx) => (
                  <div
                    key={item.label}
                    style={{
                      borderBottom: idx === 4 ? "none" : "1px solid #27272A",
                      padding: "14px 0"
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-space-mono), monospace",
                        fontSize: 10,
                        letterSpacing: "0.2em",
                        color: "#06B6D4"
                      }}
                    >
                      {item.label}
                    </p>
                    <p
                      style={{
                        margin: "8px 0 0",
                        fontFamily: "var(--font-space-mono), monospace",
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: "#F4F4F5"
                      }}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </section>

              {isLoggedIn ? (
                <p
                  style={{
                    margin: "10px 0 0",
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 11,
                    color:
                      saveStatus === "saved"
                        ? "#06B6D4"
                        : saveStatus === "error"
                          ? "#f87171"
                          : "#52525B"
                  }}
                >
                  {saveStatus === "saved"
                    ? "Saved to your dashboard."
                    : saveStatus === "saving"
                      ? "Saving to your dashboard..."
                      : saveStatus === "error"
                        ? "Could not save to dashboard."
                        : ""}
                </p>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-space-mono), monospace",
                      fontSize: 12,
                      color: "#A1A1AA"
                    }}
                  >
                    SAVE YOUR OFFER — Sign up to access your dashboard and continue building.
                  </p>
                  <Link
                    href="/auth"
                    style={{
                      display: "inline-block",
                      marginTop: 8,
                      border: "1px solid #06B6D4",
                      color: "#06B6D4",
                      background: "transparent",
                      textDecoration: "none",
                      fontFamily: "var(--font-space-mono), monospace",
                      fontSize: 11,
                      letterSpacing: "0.14em",
                      padding: "8px 12px"
                    }}
                  >
                    CREATE FREE ACCOUNT →
                  </Link>
                </div>
              )}
            </div>
          )}

          <div
            style={{
              marginTop: 18,
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              flexWrap: isMobile ? "nowrap" : "wrap",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              maxWidth: isMobile ? 720 : undefined
            }}
          >
            {[
              "< 60 SEC SETUP",
              "FIRST LEAD IN 24H",
              "NO MARKETING SKILLS NEEDED"
            ].map((item) => (
              <div
                key={item}
                style={{
                  border: "1px solid #1C1C1F",
                  padding: "6px 14px",
                  color: "#52525B",
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  width: isMobile ? "100%" : "auto",
                  textAlign: "center"
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            width: "100%",
            padding: isMobile ? "60px 24px" : "120px 0",
            textAlign: "center"
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.3em",
              color: "#06B6D4"
            }}
          >
            THE PROBLEM
          </p>
          <h2
            style={{
              margin: "24px 0 0",
              fontFamily: "var(--font-bebas-neue), sans-serif",
              fontSize: "clamp(48px, 6vw, 96px)",
              lineHeight: 0.95,
              color: "#F4F4F5"
            }}
          >
            <span style={{ display: "block" }}>MOST PEOPLE WHO HAVE SOMETHING TO SELL</span>
            <span style={{ display: "block" }}>NEVER MAKE REAL MONEY FROM IT.</span>
          </h2>
          <p
            style={{
              margin: "24px auto 0",
              maxWidth: 560,
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 14,
              lineHeight: 1.8,
              color: "#52525B"
            }}
          >
            Not because they&apos;re bad at what they do. Because they don&apos;t have a system.
            LACORE is that system.
          </p>
          <div style={{ width: "100%", height: 1, background: "#1C1C1F", marginTop: 56 }} />
        </section>

        <section
          id="how-it-works"
          style={{
            background: "#0C0C0E",
            padding: isMobile ? "60px 24px" : "120px 48px"
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.3em",
              color: "#06B6D4"
            }}
          >
            HOW IT WORKS
          </p>
          <h2
            style={{
              margin: "18px 0 0",
              fontFamily: "var(--font-bebas-neue), sans-serif",
              fontSize: "clamp(56px, 7vw, 112px)",
              lineHeight: 0.95
            }}
          >
            <span style={{ display: "block", color: "#F4F4F5" }}>ONE INPUT.</span>
            <span style={{ display: "block", color: "#06B6D4" }}>EVERYTHING ELSE IS AUTOMATIC.</span>
          </h2>
          <div
            style={{
              marginTop: 48,
              display: "grid",
              gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))",
              gap: 20
            }}
          >
            {layers.map((layer) => (
              <div
                key={layer.number}
                style={{
                  border: "1px solid #1C1C1F",
                  padding: 32,
                  background: "transparent"
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-bebas-neue), sans-serif",
                    fontSize: 48,
                    lineHeight: 1,
                    color: "#1C1C1F"
                  }}
                >
                  {layer.number}
                </p>
                <h3
                  style={{
                    margin: "10px 0 0",
                    fontFamily: "var(--font-bebas-neue), sans-serif",
                    fontSize: 28,
                    letterSpacing: "0.02em",
                    color: "#F4F4F5"
                  }}
                >
                  {layer.title}
                </h3>
                <p
                  style={{
                    margin: "12px 0 0",
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 12,
                    lineHeight: 1.8,
                    color: "#52525B"
                  }}
                >
                  {layer.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="what-you-get"
          style={{
            width: "100%",
            padding: isMobile ? "60px 24px" : "120px 48px",
            background: "#09090B",
            textAlign: "center"
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.3em",
              color: "#06B6D4"
            }}
          >
            THE MAGIC MOMENT
          </p>
          <h2
            style={{
              margin: "20px 0 0",
              fontFamily: "var(--font-bebas-neue), sans-serif",
              fontSize: "clamp(64px, 8vw, 128px)",
              lineHeight: 0.94
            }}
          >
            <span style={{ display: "block", color: "#F4F4F5" }}>60 MINUTES AFTER SIGNING UP</span>
            <span style={{ display: "block", color: "#06B6D4" }}>YOUR FIRST LEAD ARRIVES.</span>
          </h2>
          <div
            style={{
              margin: "34px auto 0",
              maxWidth: 600,
              textAlign: "left",
              background: "#0C0C0E",
              border: "1px solid #06B6D4",
              padding: isMobile ? 20 : 32,
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: isMobile ? 11 : 13,
              lineHeight: 1.9,
              color: "#F4F4F5"
            }}
          >
            <p style={{ margin: 0 }}>&gt; Offer generated ✓</p>
            <p style={{ margin: 0 }}>&gt; Landing page live ✓</p>
            <p style={{ margin: 0 }}>&gt; First post published ✓</p>
            <p style={{ margin: 0 }}>&gt; System running in background ✓</p>
            <p style={{ margin: 0 }}>&gt; NEW LEAD: Someone is interested.</p>
            <p style={{ margin: 0 }}>&gt; &quot;Here&apos;s exactly what to say.&quot; →</p>
          </div>
          <p
            style={{
              margin: "18px 0 0",
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 13,
              color: "#52525B"
            }}
          >
            That&apos;s the moment. That&apos;s what nobody else delivers.
          </p>
        </section>

        <section
          style={{
            background: "#0C0C0E",
            padding: isMobile ? "60px 24px" : "80px 48px",
            textAlign: "center"
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 12,
              color: "#3F3F46"
            }}
          >
            NOT A LANDING PAGE BUILDER · NOT A SOCIAL MEDIA SCHEDULER · NOT A CRM · NOT AN AI
            CONTENT TOOL
          </p>
          <p
            style={{
              margin: "20px auto 0",
              maxWidth: 1100,
              fontFamily: "var(--font-bebas-neue), sans-serif",
              fontSize: 36,
              lineHeight: 1.1,
              color: "#F4F4F5"
            }}
          >
            LACORE IS WHAT HAPPENS WHEN ALL OF THESE WORK TOGETHER TOWARD ONE GOAL: YOUR FIRST
            SALE.
          </p>
        </section>

        <section
          id="pricing"
          style={{
            width: "100%",
            padding: isMobile ? "60px 24px" : "160px 48px",
            textAlign: "center"
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-bebas-neue), sans-serif",
              fontSize: "clamp(64px, 8vw, 120px)",
              lineHeight: 0.94
            }}
          >
            <span style={{ display: "block", color: "#F4F4F5" }}>YOU SAY WHAT YOU SELL.</span>
            <span style={{ display: "block", color: "#06B6D4" }}>LACORE DOES THE REST.</span>
          </h2>
          <button
            type="button"
            style={{
              marginTop: 24,
              border: "1px solid #06B6D4",
              background: "transparent",
              color: "#06B6D4",
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 12,
              letterSpacing: "0.2em",
              padding: "12px 20px",
              cursor: "pointer"
            }}
          >
            START FOR FREE →
          </button>
          <p
            style={{
              margin: "16px 0 0",
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 12,
              color: "#3F3F46"
            }}
          >
            Free to start. No marketing skills needed. No agency. No team.
          </p>
        </section>

        <div
          style={{
            marginTop: "auto",
            width: "100%",
            overflow: "hidden",
            borderTop: "1px solid rgba(6,182,212,0.2)",
            borderBottom: "1px solid rgba(6,182,212,0.2)",
            padding: "10px 0"
          }}
        >
          <div
            style={{
              width: "max-content",
              display: "inline-flex",
              whiteSpace: "nowrap",
              animation: "ticker-scroll 24s linear infinite",
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 11,
              color: "#52525B",
              letterSpacing: "0.12em"
            }}
          >
            <span>{tickerText.repeat(2)}</span>
            <span>{tickerText.repeat(2)}</span>
          </div>
        </div>
      </main>
    </>
  );
}
