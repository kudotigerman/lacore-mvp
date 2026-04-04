"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bebas_Neue } from "next/font/google";
import { getSupabaseClient } from "@/lib/supabase";

const landingHeroBebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"]
});

type OfferVariant = {
  variant: "A" | "B" | "C";
  label: string;
  offer: string;
  audience: string;
  pricing: string;
  positioning: string;
  headline: string;
};

export default function LandingPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variants, setVariants] = useState<OfferVariant[] | null>(null);
  const [selectedVariantLetter, setSelectedVariantLetter] = useState<"A" | "B" | "C" | null>(null);
  const [chooseError, setChooseError] = useState<string | null>(null);
  const [savingChoice, setSavingChoice] = useState(false);
  const [guestNeedsAuth, setGuestNeedsAuth] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [animatedText, setAnimatedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [submitHover, setSubmitHover] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const canSubmit = input.trim().length > 0 && !loading;

  const loadingMessages = useMemo(
    () => [
      "ANALYZING YOUR MARKET...",
      "IDENTIFYING YOUR AUDIENCE...",
      "CRAFTING 3 STRATEGIES...",
      "ALMOST READY..."
    ],
    []
  );

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
      "real estate in Dubai",
      "online fitness coaching",
      "brand design services",
      "legal consulting",
      "restaurant franchise",
      "UX/UI design for SaaS",
      "luxury travel packages",
      "personal finance coaching",
      "wedding photography",
      "software development"
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
    const supabase = getSupabaseClient();
    let cancelled = false;

    async function syncSession() {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();
        if (!cancelled) setIsLoggedIn(Boolean(session?.user));
      } catch {
        if (!cancelled) setIsLoggedIn(false);
      }
    }

    void syncSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!loading) return;
    setLoadingMsgIndex(0);
    const id = setInterval(() => {
      setLoadingMsgIndex((i) => (i + 1) % loadingMessages.length);
    }, 2800);
    return () => clearInterval(id);
  }, [loading, loadingMessages.length]);

  useEffect(() => {
    if (isFocused || input.length > 0) return;

    const currentText = animatedExamples[exampleIndex];
    let timeoutId: ReturnType<typeof setTimeout>;

    if (isTyping && animatedText === currentText) {
      timeoutId = setTimeout(() => setIsTyping(false), 2000);
      return () => clearTimeout(timeoutId);
    }

    if (!isTyping && animatedText.length === 0) {
      timeoutId = setTimeout(() => {
        setIsTyping(true);
        setExampleIndex((prev) => (prev + 1) % animatedExamples.length);
      }, 400);
      return () => clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(
      () => {
        setAnimatedText((prev) =>
          isTyping ? currentText.slice(0, prev.length + 1) : prev.slice(0, -1)
        );
      },
      isTyping ? 45 : 20
    );

    return () => clearTimeout(timeoutId);
  }, [animatedExamples, exampleIndex, input.length, isFocused, isTyping, animatedText]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setVariants(null);
    setSelectedVariantLetter(null);
    setChooseError(null);
    setGuestNeedsAuth(false);

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

      if (!Array.isArray(data.variants) || data.variants.length !== 3) {
        throw new Error("Invalid response from server.");
      }

      setVariants(data.variants as OfferVariant[]);

      try {
        const supabase = getSupabaseClient();
        const {
          data: { session }
        } = await supabase.auth.getSession();
        setIsLoggedIn(Boolean(session?.user));
      } catch {
        setIsLoggedIn(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleChooseStrategy(v: OfferVariant) {
    setSelectedVariantLetter(v.variant);
    setChooseError(null);
    setGuestNeedsAuth(false);

    try {
      const supabase = getSupabaseClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setGuestNeedsAuth(true);
        return;
      }

      setSavingChoice(true);
      const { error: saveError } = await supabase.from("offers").upsert(
        {
          user_id: session.user.id,
          offer: v.offer,
          audience: v.audience,
          pricing: v.pricing,
          positioning: v.positioning,
          headline: v.headline
        } as never
      );
      if (saveError) throw saveError;
      setIsLoggedIn(true);
      router.push("/dashboard");
    } catch (e) {
      setChooseError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setSavingChoice(false);
    }
  }

  const showAnimatedPlaceholder = !isFocused && input.length === 0;
  const textareaDisplayValue = showAnimatedPlaceholder ? animatedText : input;

  function scrollToSection(sectionId: string) {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

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
        @keyframes cursor-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>
      <main
        style={{
          minHeight: "100vh",
          background: "var(--bg-primary)",
          color: "var(--text-primary)",
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
            background: "color-mix(in srgb, var(--bg-primary) 92%, transparent)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border-primary)",
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
            <Link
              href="/"
              style={{
                margin: 0,
                justifySelf: "start",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                fontSize: 22,
                color: "var(--accent)",
                textDecoration: "none"
              }}
            >
              LACORE
            </Link>
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
                <button
                  type="button"
                  onClick={() => scrollToSection("how-it-works")}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontSize: 11,
                    letterSpacing: "0.15em",
                    color: "var(--text-muted)",
                    textDecoration: "none",
                    cursor: "pointer"
                  }}
                >
                  HOW IT WORKS
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("what-you-get")}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontSize: 11,
                    letterSpacing: "0.15em",
                    color: "var(--text-muted)",
                    textDecoration: "none",
                    cursor: "pointer"
                  }}
                >
                  WHAT YOU GET
                </button>
                <Link
                  href="/auth"
                  style={{
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontSize: 11,
                    letterSpacing: "0.15em",
                    color: "var(--text-muted)",
                    textDecoration: "none"
                  }}
                >
                  PRICING
                </Link>
              </div>
            )}
            <Link
              href={isLoggedIn ? "/dashboard" : "/auth"}
              style={{
                justifySelf: "end",
                border: "1px solid var(--accent)",
                background: "transparent",
                color: "var(--accent)",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                fontSize: isMobile ? 10 : 11,
                letterSpacing: "0.15em",
                padding: isMobile ? "8px 16px" : "10px 14px",
                cursor: "pointer",
                textDecoration: "none"
              }}
            >
              {isLoggedIn ? "GO TO DASHBOARD →" : "START FOR FREE →"}
            </Link>
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
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontSize: 11,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "var(--accent)"
            }}
          >
            LACORE
          </p>

          <h1
            className={landingHeroBebas.className}
            style={{
              margin: "20px 0 0",
              fontSize: isMobile ? "clamp(48px, 12vw, 72px)" : "clamp(72px, 12vw, 160px)",
              lineHeight: 0.95,
              letterSpacing: "0.02em",
              textTransform: "uppercase"
            }}
          >
            <span style={{ display: "block", color: "var(--text-primary)" }}>YOU SAY WHAT YOU SELL.</span>
            <span style={{ display: "block", color: "var(--accent)" }}>LACORE DOES THE REST.</span>
          </h1>
          <p
            style={{
              margin: "24px 0 0",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontSize: 12,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--text-muted)"
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
                background: "var(--bg-input)",
                padding: isMobile ? "24px 20px" : "32px 28px",
                position: "relative",
                width: "100%",
                boxSizing: "border-box"
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                  fontSize: 11,
                  letterSpacing: "4px",
                  textTransform: "uppercase",
                  color: "var(--text-secondary)"
                }}
              >
                ASK LACORE HOW TO SELL
              </p>
              <div style={{ position: "relative", marginTop: 20 }}>
                <textarea
                  value={textareaDisplayValue}
                  onChange={(event) => setInput(event.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  style={{
                    width: "100%",
                    minHeight: 100,
                    border: "none",
                    outline: "none",
                    background: "var(--bg-input)",
                    color: showAnimatedPlaceholder ? "var(--text-muted)" : "var(--text-primary)",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontSize: isMobile ? 15 : 16,
                    lineHeight: 1.5,
                    fontStyle: showAnimatedPlaceholder ? "italic" : "normal",
                    resize: "vertical",
                    padding: 0,
                    display: "block",
                    caretColor: showAnimatedPlaceholder ? "transparent" : "var(--accent)"
                  }}
                />
                {showAnimatedPlaceholder && (
                  <span
                    style={{
                      position: "absolute",
                      left: `${Math.max(animatedText.length * (isMobile ? 8.2 : 8.6), 1)}px`,
                      top: 0,
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                      fontSize: isMobile ? 15 : 16,
                      fontStyle: "italic",
                      lineHeight: 1.5,
                      pointerEvents: "none",
                      animation: "cursor-blink 500ms infinite"
                    }}
                  >
                    |
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={!canSubmit}
                aria-label="Generate offer"
                onMouseEnter={() => setSubmitHover(true)}
                onMouseLeave={() => setSubmitHover(false)}
                style={{
                  marginTop: 20,
                  width: "100%",
                  border: "none",
                  background: canSubmit ? (submitHover ? "var(--accent)" : "var(--accent)") : "var(--text-muted)",
                  color: "#000000",
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                  fontSize: 12,
                  letterSpacing: "0.15em",
                  fontWeight: 700,
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  padding: "14px 28px",
                  transition: "background 180ms ease"
                }}
              >
                GENERATE MY OFFER →
              </button>
            </div>
          </form>

          {loading && (
            <div
              style={{
                width: "100%",
                maxWidth: 720,
                marginTop: 28,
                marginLeft: "auto",
                marginRight: "auto",
                padding: "32px 24px",
                textAlign: "center"
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                  fontWeight: 800,
                  fontSize: isMobile ? 42 : 56,
                  lineHeight: 1.05,
                  color: "var(--accent)",
                  letterSpacing: "0.02em"
                }}
              >
                {loadingMessages[loadingMsgIndex]}
              </h2>
            </div>
          )}

          {error && (
            <p
              style={{
                width: "100%",
                maxWidth: 720,
                margin: "12px auto 0",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                fontSize: 12,
                color: "#f87171"
              }}
            >
              {error}
            </p>
          )}

          {variants && variants.length === 3 && (
            <div
              style={{
                width: "100%",
                maxWidth: 1100,
                marginTop: 24,
                marginLeft: "auto",
                marginRight: "auto",
                animation: "offer-enter 400ms ease"
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: 16,
                  alignItems: "stretch",
                  justifyContent: "center"
                }}
              >
                {[...variants]
                  .sort((a, b) => a.variant.localeCompare(b.variant))
                  .map((v) => {
                    const isSelected = selectedVariantLetter === v.variant;
                    return (
                      <article
                        key={v.variant}
                        style={{
                          flex: isMobile ? "none" : "1 1 0",
                          minWidth: isMobile ? "100%" : 0,
                          maxWidth: isMobile ? "100%" : 360,
                          boxSizing: "border-box",
                          background: isSelected
                            ? "color-mix(in srgb, var(--accent) 6%, transparent)"
                            : "var(--bg-input)",
                          border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border-primary)",
                          padding: "20px 18px 18px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 12
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                            fontWeight: 800,
                            fontSize: 48,
                            lineHeight: 1,
                            color: "var(--accent)",
                            letterSpacing: "0.02em"
                          }}
                        >
                          {v.variant}
                        </span>
                        <p
                          style={{
                            margin: 0,
                            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                            fontSize: 10,
                            letterSpacing: "3px",
                            textTransform: "uppercase",
                            color: "var(--text-muted)"
                          }}
                        >
                          {v.label}
                        </p>
                        <h3
                          style={{
                            margin: 0,
                            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                            fontWeight: 800,
                            fontSize: 28,
                            lineHeight: 1.1,
                            color: "var(--text-primary)",
                            letterSpacing: "0.02em"
                          }}
                        >
                          {v.headline}
                        </h3>
                        <div>
                          <span
                            style={{
                              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                              fontSize: 9,
                              letterSpacing: "0.2em",
                              color: "var(--text-muted)",
                              textTransform: "uppercase"
                            }}
                          >
                            FOR{" "}
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                              fontSize: 13,
                              lineHeight: 1.5,
                              color: "var(--text-secondary)"
                            }}
                          >
                            {v.audience}
                          </span>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                            fontSize: 14,
                            lineHeight: 1.5,
                            color: "var(--accent)",
                            fontWeight: 700
                          }}
                        >
                          {v.pricing}
                        </p>
                        <button
                          type="button"
                          disabled={savingChoice}
                          onClick={() => void handleChooseStrategy(v)}
                          style={{
                            marginTop: "auto",
                            width: "100%",
                            border: "none",
                            background: savingChoice && isSelected ? "var(--accent)" : "var(--accent)",
                            color: "#000000",
                            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                            fontSize: 11,
                            letterSpacing: "0.12em",
                            fontWeight: 700,
                            padding: "12px 14px",
                            cursor: savingChoice ? "wait" : "pointer",
                            opacity: savingChoice && !isSelected ? 0.45 : 1
                          }}
                        >
                          {savingChoice && isSelected
                            ? "SAVING..."
                            : "CHOOSE THIS STRATEGY →"}
                        </button>
                      </article>
                    );
                  })}
              </div>

              {guestNeedsAuth && (
                <div
                  style={{
                    marginTop: 20,
                    padding: "16px 18px",
                    border: "1px solid var(--border-secondary)",
                    background: "var(--bg-input)",
                    maxWidth: 520,
                    marginLeft: "auto",
                    marginRight: "auto"
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      lineHeight: 1.5
                    }}
                  >
                    Sign in to save your chosen strategy and open your dashboard.
                  </p>
                  <Link
                    href="/auth"
                    style={{
                      display: "inline-block",
                      marginTop: 10,
                      border: "1px solid var(--accent)",
                      color: "var(--accent)",
                      background: "transparent",
                      textDecoration: "none",
                      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                      fontSize: 11,
                      letterSpacing: "0.14em",
                      padding: "8px 12px"
                    }}
                  >
                    CREATE FREE ACCOUNT →
                  </Link>
                </div>
              )}

              {chooseError && (
                <p
                  style={{
                    margin: "14px 0 0",
                    textAlign: "center",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontSize: 12,
                    color: "#f87171"
                  }}
                >
                  {chooseError}
                </p>
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
                  border: "1px solid var(--border-primary)",
                  padding: "6px 14px",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontSize: 11,
              letterSpacing: "0.3em",
              color: "var(--accent)"
            }}
          >
            THE PROBLEM
          </p>
          <h2
            style={{
              margin: "24px 0 0",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif", fontWeight: 800, letterSpacing: "-0.02em",
              fontSize: "clamp(48px, 6vw, 96px)",
              lineHeight: 0.95,
              color: "var(--text-primary)"
            }}
          >
            <span style={{ display: "block" }}>MOST PEOPLE WHO HAVE SOMETHING TO SELL</span>
            <span style={{ display: "block" }}>NEVER MAKE REAL MONEY FROM IT.</span>
          </h2>
          <p
            style={{
              margin: "24px auto 0",
              maxWidth: 560,
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontSize: 14,
              lineHeight: 1.8,
              color: "var(--text-muted)"
            }}
          >
            Not because they&apos;re bad at what they do. Because they don&apos;t have a system.
            LACORE is that system.
          </p>
          <div style={{ width: "100%", height: 1, background: "var(--border-primary)", marginTop: 56 }} />
        </section>

        <section
          id="how-it-works"
          style={{
            background: "var(--bg-input)",
            padding: isMobile ? "60px 24px" : "120px 48px"
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontSize: 11,
              letterSpacing: "0.3em",
              color: "var(--accent)"
            }}
          >
            HOW IT WORKS
          </p>
          <h2
            style={{
              margin: "18px 0 0",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif", fontWeight: 800, letterSpacing: "-0.02em",
              fontSize: "clamp(56px, 7vw, 112px)",
              lineHeight: 0.95
            }}
          >
            <span style={{ display: "block", color: "var(--text-primary)" }}>ONE INPUT.</span>
            <span style={{ display: "block", color: "var(--accent)" }}>EVERYTHING ELSE IS AUTOMATIC.</span>
          </h2>
          <div
            id="what-you-get"
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
                  border: "1px solid var(--border-primary)",
                  padding: 32,
                  background: "transparent"
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif", fontWeight: 800, letterSpacing: "-0.02em",
                    fontSize: 48,
                    lineHeight: 1,
                    color: "var(--border-primary)"
                  }}
                >
                  {layer.number}
                </p>
                <h3
                  style={{
                    margin: "10px 0 0",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontWeight: 800,
                    fontSize: 28,
                    letterSpacing: "0.02em",
                    color: "var(--text-primary)"
                  }}
                >
                  {layer.title}
                </h3>
                <p
                  style={{
                    margin: "12px 0 0",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontSize: 12,
                    lineHeight: 1.8,
                    color: "var(--text-muted)"
                  }}
                >
                  {layer.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="magic-moment"
          style={{
            width: "100%",
            padding: isMobile ? "60px 24px" : "120px 48px",
            background: "var(--bg-primary)",
            textAlign: "center"
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontSize: 11,
              letterSpacing: "0.3em",
              color: "var(--accent)"
            }}
          >
            THE MAGIC MOMENT
          </p>
          <h2
            style={{
              margin: "20px 0 0",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif", fontWeight: 800, letterSpacing: "-0.02em",
              fontSize: "clamp(64px, 8vw, 128px)",
              lineHeight: 0.94
            }}
          >
            <span style={{ display: "block", color: "var(--text-primary)" }}>60 MINUTES AFTER SIGNING UP</span>
            <span style={{ display: "block", color: "var(--accent)" }}>YOUR FIRST LEAD ARRIVES.</span>
          </h2>
          <div
            style={{
              margin: "34px auto 0",
              maxWidth: 600,
              textAlign: "left",
              background: "var(--bg-input)",
              border: "1px solid var(--accent)",
              padding: isMobile ? 20 : 32,
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontSize: isMobile ? 11 : 13,
              lineHeight: 1.9,
              color: "var(--text-primary)"
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
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontSize: 13,
              color: "var(--text-muted)"
            }}
          >
            That&apos;s the moment. That&apos;s what nobody else delivers.
          </p>
        </section>

        <section
          style={{
            background: "var(--bg-input)",
            padding: isMobile ? "60px 24px" : "80px 48px",
            textAlign: "center"
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontSize: 12,
              color: "var(--text-muted)"
            }}
          >
            NOT A LANDING PAGE BUILDER · NOT A SOCIAL MEDIA SCHEDULER · NOT A CRM · NOT AN AI
            CONTENT TOOL
          </p>
          <p
            style={{
              margin: "20px auto 0",
              maxWidth: 1100,
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif", fontWeight: 800, letterSpacing: "-0.02em",
              fontSize: 36,
              lineHeight: 1.1,
              color: "var(--text-primary)"
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
            className={landingHeroBebas.className}
            style={{
              margin: 0,
              fontSize: "clamp(64px, 8vw, 120px)",
              lineHeight: 0.94
            }}
          >
            <span style={{ display: "block", color: "var(--text-primary)" }}>YOU SAY WHAT YOU SELL.</span>
            <span style={{ display: "block", color: "var(--accent)" }}>LACORE DOES THE REST.</span>
          </h2>
          <Link
            href={isLoggedIn ? "/dashboard" : "/auth"}
            style={{
              display: "inline-block",
              marginTop: 24,
              border: "1px solid var(--accent)",
              background: "transparent",
              color: "var(--accent)",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontSize: 12,
              letterSpacing: "0.2em",
              padding: "12px 20px",
              cursor: "pointer",
              textDecoration: "none"
            }}
          >
            {isLoggedIn ? "GO TO DASHBOARD →" : "START FOR FREE →"}
          </Link>
          <p
            style={{
              margin: "16px 0 0",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontSize: 12,
              color: "var(--text-muted)"
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
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontSize: 11,
              color: "var(--text-muted)",
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
