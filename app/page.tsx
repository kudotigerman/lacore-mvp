"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  type CSSProperties
} from "react";
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

const ff = "var(--font-geist-sans), system-ui, sans-serif" as const;

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

  const container: CSSProperties = {
    maxWidth: 1200,
    margin: "0 auto",
    padding: `0 ${isMobile ? 20 : 32}px`,
    boxSizing: "border-box"
  };

  const sectionY = isMobile ? "72px" : "120px";

  const sectionTitle: CSSProperties = {
    margin: 0,
    fontFamily: ff,
    fontWeight: 800,
    fontSize: "clamp(2rem, 4vw, 3.5rem)",
    lineHeight: 1.08,
    letterSpacing: "-0.02em",
    color: "var(--text-primary)",
    textAlign: "center"
  };

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

  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (nodes.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-reveal-visible", "true");
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
    );

    nodes.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

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

  const cardBase: CSSProperties = {
    borderRadius: 20,
    border: "1px solid var(--border-primary)",
    background: "var(--bg-card)",
    boxSizing: "border-box"
  };

  return (
    <>
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        @keyframes offer-enter {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes cursor-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes hero-mock-line-show {
          0%, 5% { opacity: 0; transform: translateY(6px); }
          10%, 78% { opacity: 1; transform: translateY(0); }
          85%, 100% { opacity: 0.4; transform: translateY(0); }
        }
        @keyframes hero-mock-dot-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes notif-slide {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .lacore-card {
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
        }
        [data-theme="dark"] .lacore-card {
          box-shadow: 0 4px 32px rgba(0, 0, 0, 0.35);
        }
        [data-reveal] {
          opacity: 0;
          transform: translateY(18px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        [data-reveal][data-reveal-visible="true"] {
          opacity: 1;
          transform: translateY(0);
        }
        .hero-mock-line-1 { animation: hero-mock-line-show 14s ease-in-out infinite; }
        .hero-mock-line-2 { animation: hero-mock-line-show 14s ease-in-out infinite 3.1s; }
        .hero-mock-line-3 { animation: hero-mock-line-show 14s ease-in-out infinite 6.2s; }
        .hero-mock-line-4 { animation: hero-mock-line-show 14s ease-in-out infinite 9.3s; }
        .hero-mock-dot { animation: hero-mock-dot-pulse 2s ease-in-out infinite; }
        .home-notif-1 { animation: notif-slide 0.55s ease forwards 0.15s; opacity: 0; }
        .home-notif-2 { animation: notif-slide 0.55s ease forwards 0.65s; opacity: 0; }
        .home-notif-3 { animation: notif-slide 0.55s ease forwards 1.15s; opacity: 0; }
      `}</style>
      <main
        style={{
          minHeight: "100vh",
          background: "var(--bg-primary)",
          color: "var(--text-primary)",
          display: "flex",
          flexDirection: "column",
          padding: 0
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
              maxWidth: 1200,
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
                fontFamily: ff,
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
                    fontFamily: ff,
                    fontSize: 11,
                    letterSpacing: "0.15em",
                    color: "var(--text-muted)",
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
                    fontFamily: ff,
                    fontSize: 11,
                    letterSpacing: "0.15em",
                    color: "var(--text-muted)",
                    cursor: "pointer"
                  }}
                >
                  WHAT YOU GET
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("pricing")}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontFamily: ff,
                    fontSize: 11,
                    letterSpacing: "0.15em",
                    color: "var(--text-muted)",
                    cursor: "pointer"
                  }}
                >
                  PRICING
                </button>
              </div>
            )}
            <Link
              href={isLoggedIn ? "/dashboard" : "/auth"}
              style={{
                justifySelf: "end",
                border: "1px solid var(--accent)",
                background: "transparent",
                color: "var(--accent)",
                fontFamily: ff,
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

        {/* ——— HERO ——— */}
        <section
          style={{
            padding: `${isMobile ? "48px" : "64px"} 0 ${sectionY}`,
            textAlign: "center"
          }}
        >
          <div style={container}>
            <p
              style={{
                margin: 0,
                fontFamily: ff,
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
                fontFamily: ff,
                fontSize: 12,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--text-muted)"
              }}
            >
              FROM IDEA TO FIRST CLIENT. AUTOMATICALLY.
            </p>

            <div
              style={{
                marginTop: 40,
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                alignItems: "stretch",
                gap: isMobile ? 28 : 36,
                textAlign: "left"
              }}
            >
              <form
                onSubmit={handleSubmit}
                style={{
                  flex: "1 1 0",
                  minWidth: 0,
                  maxWidth: isMobile ? "100%" : 640
                }}
              >
                <div
                  style={{
                    background: "var(--bg-input)",
                    padding: isMobile ? "24px 20px" : "28px 26px",
                    border: "1px solid var(--border-primary)",
                    borderRadius: 12,
                    boxSizing: "border-box"
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontFamily: ff,
                      fontSize: 11,
                      letterSpacing: "4px",
                      textTransform: "uppercase",
                      color: "var(--text-secondary)"
                    }}
                  >
                    ASK LACORE HOW TO SELL
                  </p>
                  <div style={{ position: "relative", marginTop: 18 }}>
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
                        fontFamily: ff,
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
                          fontFamily: ff,
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
                      marginTop: 18,
                      width: "100%",
                      border: "none",
                      background: canSubmit ? "var(--accent)" : "var(--text-muted)",
                      color: "#000000",
                      fontFamily: ff,
                      fontSize: 12,
                      letterSpacing: "0.15em",
                      fontWeight: 700,
                      cursor: canSubmit ? "pointer" : "not-allowed",
                      padding: "14px 28px",
                      borderRadius: 8,
                      transition: "opacity 180ms ease"
                    }}
                  >
                    GENERATE MY OFFER →
                  </button>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    flexWrap: "wrap",
                    gap: 8
                  }}
                >
                  {["< 60 SEC SETUP", "SYSTEM LIVE IN 60 MIN", "NO MARKETING SKILLS NEEDED"].map((item) => (
                    <div
                      key={item}
                      style={{
                        border: "1px solid var(--border-primary)",
                        borderRadius: 999,
                        padding: "8px 14px",
                        color: "var(--text-muted)",
                        fontFamily: ff,
                        fontSize: 10,
                        letterSpacing: "0.12em",
                        background: "var(--bg-secondary)"
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </form>

              <div
                aria-hidden
                className="lacore-card"
                style={{
                  width: isMobile ? "100%" : 480,
                  maxWidth: "100%",
                  height: 340,
                  flexShrink: 0,
                  margin: isMobile ? "0 auto" : undefined,
                  alignSelf: isMobile ? "center" : "flex-start",
                  border: "1px solid var(--border-primary)",
                  borderRadius: 12,
                  background: "var(--bg-card)",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    height: 32,
                    flexShrink: 0,
                    background: "var(--bg-card)",
                    borderBottom: "1px solid var(--border-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "0 12px"
                  }}
                >
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFBD2E" }} />
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 22,
                      borderRadius: 6,
                      background: "var(--bg-input)",
                      border: "1px solid var(--border-primary)",
                      display: "flex",
                      alignItems: "center",
                      padding: "0 10px",
                      fontFamily: ff,
                      fontSize: 10,
                      color: "var(--text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    yourname.lacore.ai
                  </div>
                </div>
                <div
                  style={{
                    flexShrink: 0,
                    padding: "12px 14px",
                    borderBottom: "1px solid var(--border-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                  }}
                >
                  <span
                    className="hero-mock-dot"
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#22C55E",
                      flexShrink: 0
                    }}
                  />
                  <span
                    style={{
                      fontFamily: ff,
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      color: "var(--accent)",
                      fontWeight: 600
                    }}
                  >
                    SALES BUILDER
                  </span>
                </div>
                <div
                  style={{
                    flex: 1,
                    padding: "12px 14px 8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    minHeight: 0,
                    background: "var(--bg-secondary)"
                  }}
                >
                  <p
                    className="hero-mock-line-1"
                    style={{
                      margin: 0,
                      fontFamily: ff,
                      fontSize: 12,
                      lineHeight: 1.45,
                      color: "var(--text-secondary)",
                      opacity: 0
                    }}
                  >
                    Analyzing your offer...
                  </p>
                  <p
                    className="hero-mock-line-2"
                    style={{
                      margin: 0,
                      fontFamily: ff,
                      fontSize: 12,
                      lineHeight: 1.45,
                      color: "var(--text-secondary)",
                      opacity: 0
                    }}
                  >
                    Detecting niche: Design / Creative
                  </p>
                  <p
                    className="hero-mock-line-3"
                    style={{
                      margin: 0,
                      fontFamily: ff,
                      fontSize: 12,
                      lineHeight: 1.45,
                      color: "var(--text-secondary)",
                      opacity: 0
                    }}
                  >
                    Building your landing page...
                  </p>
                  <p
                    className="hero-mock-line-4"
                    style={{
                      margin: 0,
                      fontFamily: ff,
                      fontSize: 12,
                      lineHeight: 1.45,
                      color: "var(--accent)",
                      fontWeight: 600,
                      opacity: 0
                    }}
                  >
                    ✓ Live — yourname.lacore.ai
                  </p>
                </div>
                <div
                  style={{
                    flexShrink: 0,
                    margin: "0 12px 12px",
                    height: 64,
                    borderRadius: 8,
                    background:
                      "linear-gradient(145deg, color-mix(in srgb, var(--accent) 40%, var(--bg-input)), var(--bg-card) 55%, color-mix(in srgb, var(--accent) 18%, var(--bg-secondary)))",
                    border: "1px solid var(--border-primary)"
                  }}
                />
              </div>
            </div>

            {loading && (
              <div style={{ marginTop: 32, textAlign: "center" }}>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: ff,
                    fontWeight: 800,
                    fontSize: isMobile ? 36 : 48,
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
                  margin: "16px 0 0",
                  fontFamily: ff,
                  fontSize: 13,
                  color: "#f87171",
                  textAlign: "center"
                }}
              >
                {error}
              </p>
            )}

            {variants && variants.length === 3 && (
              <div style={{ marginTop: 32, animation: "offer-enter 400ms ease" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    gap: 16,
                    justifyContent: "center",
                    flexWrap: "wrap"
                  }}
                >
                  {[...variants]
                    .sort((a, b) => a.variant.localeCompare(b.variant))
                    .map((v) => {
                      const isSelected = selectedVariantLetter === v.variant;
                      return (
                        <article
                          key={v.variant}
                          className="lacore-card"
                          style={{
                            ...cardBase,
                            flex: isMobile ? "none" : "1 1 280px",
                            maxWidth: isMobile ? "100%" : 360,
                            padding: "20px 18px",
                            background: isSelected
                              ? "color-mix(in srgb, var(--accent) 8%, var(--bg-card))"
                              : "var(--bg-card)",
                            border: isSelected ? "2px solid var(--accent)" : cardBase.border
                          }}
                        >
                          <span
                            style={{
                              fontFamily: ff,
                              fontWeight: 800,
                              fontSize: 44,
                              color: "var(--accent)"
                            }}
                          >
                            {v.variant}
                          </span>
                          <p
                            style={{
                              margin: "6px 0 0",
                              fontFamily: ff,
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
                              margin: "10px 0 0",
                              fontFamily: ff,
                              fontWeight: 800,
                              fontSize: 24,
                              lineHeight: 1.15,
                              color: "var(--text-primary)"
                            }}
                          >
                            {v.headline}
                          </h3>
                          <p style={{ margin: "10px 0 0", fontFamily: ff, fontSize: 13, color: "var(--accent)", fontWeight: 700 }}>
                            {v.pricing}
                          </p>
                          <button
                            type="button"
                            disabled={savingChoice}
                            onClick={() => void handleChooseStrategy(v)}
                            style={{
                              marginTop: 14,
                              width: "100%",
                              border: "none",
                              background: "var(--accent)",
                              color: "#000000",
                              fontFamily: ff,
                              fontSize: 11,
                              letterSpacing: "0.12em",
                              fontWeight: 700,
                              padding: "12px 14px",
                              borderRadius: 8,
                              cursor: savingChoice ? "wait" : "pointer",
                              opacity: savingChoice && !isSelected ? 0.45 : 1
                            }}
                          >
                            {savingChoice && isSelected ? "SAVING..." : "CHOOSE THIS STRATEGY →"}
                          </button>
                        </article>
                      );
                    })}
                </div>
                {guestNeedsAuth && (
                  <div
                    style={{
                      marginTop: 20,
                      padding: 16,
                      border: "1px solid var(--border-secondary)",
                      borderRadius: 12,
                      background: "var(--bg-input)",
                      maxWidth: 520,
                      marginLeft: "auto",
                      marginRight: "auto"
                    }}
                  >
                    <p style={{ margin: 0, fontFamily: ff, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      Sign in to save your chosen strategy and open your dashboard.
                    </p>
                    <Link
                      href="/auth"
                      style={{
                        display: "inline-block",
                        marginTop: 10,
                        border: "1px solid var(--accent)",
                        color: "var(--accent)",
                        textDecoration: "none",
                        fontFamily: ff,
                        fontSize: 11,
                        letterSpacing: "0.14em",
                        padding: "8px 12px",
                        borderRadius: 8
                      }}
                    >
                      CREATE FREE ACCOUNT →
                    </Link>
                  </div>
                )}
                {chooseError && (
                  <p style={{ margin: "14px 0 0", textAlign: "center", fontFamily: ff, fontSize: 12, color: "#f87171" }}>
                    {chooseError}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ——— WHAT YOU GET ——— */}
        <section
          id="what-you-get"
          style={{ padding: `${sectionY} 0`, background: "var(--bg-secondary)" }}
        >
          <div style={container}>
            <div data-reveal>
              <h2 style={{ ...sectionTitle, marginBottom: 12 }}>Here&apos;s what you get in 60 minutes</h2>
              <p
                style={{
                  margin: "0 auto 48px",
                  maxWidth: 640,
                  textAlign: "center",
                  fontFamily: ff,
                  fontSize: 16,
                  lineHeight: 1.6,
                  color: "var(--text-secondary)"
                }}
              >
                Three pillars working together — so you look legit, stay visible, and never miss a buyer.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                  gap: 24
                }}
              >
                {/* Card 1 — Landing */}
                <div className="lacore-card" style={{ ...cardBase, padding: 24, display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid var(--border-primary)",
                      overflow: "hidden",
                      marginBottom: 20
                    }}
                  >
                    <div
                      style={{
                        height: 32,
                        background: "var(--bg-card)",
                        borderBottom: "1px solid var(--border-primary)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "0 10px"
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF5F57" }} />
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FFBD2E" }} />
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#28C840" }} />
                      <span
                        style={{
                          flex: 1,
                          marginLeft: 6,
                          fontFamily: ff,
                          fontSize: 9,
                          color: "var(--text-muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                      >
                        yourname.lacore.ai
                      </span>
                    </div>
                    <div
                      style={{
                        height: 120,
                        background:
                          "linear-gradient(160deg, color-mix(in srgb, var(--accent) 45%, var(--bg-input)), var(--bg-secondary))",
                        padding: 14,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end"
                      }}
                    >
                      <span style={{ fontFamily: ff, fontWeight: 800, fontSize: 14, color: "var(--text-primary)" }}>
                        Your brand. Live today.
                      </span>
                    </div>
                  </div>
                  <h3 style={{ margin: 0, fontFamily: ff, fontWeight: 800, fontSize: 20, color: "var(--text-primary)" }}>
                    Your landing page
                  </h3>
                  <p style={{ margin: "10px 0 0", fontFamily: ff, fontSize: 14, lineHeight: 1.55, color: "var(--text-muted)" }}>
                    Live in 60 seconds. Looks like $10,000. Connected to your domain.
                  </p>
                </div>

                {/* Card 2 — Content */}
                <div className="lacore-card" style={{ ...cardBase, padding: 24, display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      alignSelf: "center",
                      width: isMobile ? "100%" : 200,
                      maxWidth: 220,
                      borderRadius: 32,
                      border: "3px solid var(--border-primary)",
                      background: "var(--bg-input)",
                      padding: "14px 12px",
                      marginBottom: 20,
                      boxSizing: "border-box"
                    }}
                  >
                    {[
                      { icon: "📸", line: "New carousel: your offer, clear CTA." },
                      { icon: "𝕏", line: "Thread breakdown — why you, why now." },
                      { icon: "in", line: "Founder story + link to book." }
                    ].map((post) => (
                      <div
                        key={post.icon}
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-start",
                          padding: "10px 0",
                          borderBottom: "1px solid var(--border-primary)"
                        }}
                      >
                        <span style={{ fontSize: 18, lineHeight: 1 }}>{post.icon}</span>
                        <p style={{ margin: 0, fontFamily: ff, fontSize: 11, lineHeight: 1.45, color: "var(--text-secondary)" }}>
                          {post.line}
                        </p>
                      </div>
                    ))}
                  </div>
                  <h3 style={{ margin: 0, fontFamily: ff, fontWeight: 800, fontSize: 20, color: "var(--text-primary)" }}>
                    Your content
                  </h3>
                  <p style={{ margin: "10px 0 0", fontFamily: ff, fontSize: 14, lineHeight: 1.55, color: "var(--text-muted)" }}>
                    Posts go out daily to Instagram, X, LinkedIn. Written in your voice. Zero effort.
                  </p>
                </div>

                {/* Card 3 — Leads */}
                <div className="lacore-card" style={{ ...cardBase, padding: 24, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20, minHeight: 168 }}>
                    <div
                      className="home-notif-1"
                      style={{
                        padding: "12px 14px",
                        borderRadius: 10,
                        background: "var(--bg-input)",
                        borderLeft: "3px solid var(--accent)",
                        fontFamily: ff,
                        fontSize: 12,
                        lineHeight: 1.45,
                        color: "var(--text-primary)"
                      }}
                    >
                      🔔 New lead: Maria S. wants to book a call
                    </div>
                    <div
                      className="home-notif-2"
                      style={{
                        padding: "12px 14px",
                        borderRadius: 10,
                        background: "var(--bg-input)",
                        borderLeft: "3px solid var(--accent)",
                        fontFamily: ff,
                        fontSize: 12,
                        lineHeight: 1.45,
                        color: "var(--text-primary)"
                      }}
                    >
                      💬 Hot lead: Alex M. replied to your post
                    </div>
                    <div
                      className="home-notif-3"
                      style={{
                        padding: "12px 14px",
                        borderRadius: 10,
                        background: "var(--bg-input)",
                        borderLeft: "3px solid var(--accent)",
                        fontFamily: ff,
                        fontSize: 12,
                        lineHeight: 1.45,
                        color: "var(--text-primary)"
                      }}
                    >
                      💰 Payment received: $2,500
                    </div>
                  </div>
                  <h3 style={{ margin: 0, fontFamily: ff, fontWeight: 800, fontSize: 20, color: "var(--text-primary)" }}>
                    Your clients
                  </h3>
                  <p style={{ margin: "10px 0 0", fontFamily: ff, fontSize: 14, lineHeight: 1.55, color: "var(--text-muted)" }}>
                    Leads captured automatically. You get notified. LACORE tells you exactly what to say.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ——— HOW IT WORKS ——— */}
        <section id="how-it-works" style={{ padding: `${sectionY} 0` }}>
          <div style={container}>
            <div data-reveal>
              <h2 style={{ ...sectionTitle, marginBottom: 48 }}>How it works</h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: isMobile ? "stretch" : "flex-start",
                  justifyContent: "center",
                  gap: isMobile ? 28 : 16
                }}
              >
                {[
                  {
                    n: "1",
                    icon: "✏️",
                    title: "You type one sentence",
                    desc: "What do you sell? That's all we need."
                  },
                  {
                    n: "2",
                    icon: "⚡",
                    title: "LACORE builds everything",
                    desc: "Landing page. Content. Lead system. All automatic."
                  },
                  {
                    n: "3",
                    icon: "💰",
                    title: "Clients find you",
                    desc: "You wake up to leads, messages, and payments."
                  }
                ].map((step, idx) => (
                  <div key={step.n} style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: "center", flex: 1, minWidth: 0 }}>
                    <div style={{ flex: 1, textAlign: isMobile ? "left" : "center", maxWidth: isMobile ? "100%" : 280 }}>
                      <p
                        style={{
                          margin: 0,
                          fontFamily: ff,
                          fontWeight: 800,
                          fontSize: "clamp(3rem, 8vw, 4.5rem)",
                          lineHeight: 1,
                          color: "color-mix(in srgb, var(--accent) 35%, var(--border-primary))"
                        }}
                      >
                        {step.n}
                      </p>
                      <p style={{ margin: "12px 0 0", fontSize: 28, lineHeight: 1 }}>{step.icon}</p>
                      <h3 style={{ margin: "12px 0 0", fontFamily: ff, fontWeight: 800, fontSize: 18, color: "var(--text-primary)" }}>
                        {step.title}
                      </h3>
                      <p style={{ margin: "8px 0 0", fontFamily: ff, fontSize: 14, lineHeight: 1.55, color: "var(--text-muted)" }}>
                        {step.desc}
                      </p>
                    </div>
                    {!isMobile && idx < 2 ? (
                      <div
                        style={{
                          fontFamily: ff,
                          fontSize: 22,
                          color: "var(--accent)",
                          padding: "0 8px",
                          marginTop: 48,
                          flexShrink: 0
                        }}
                        aria-hidden
                      >
                        →
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ——— SOCIAL PROOF ——— */}
        <section style={{ padding: `${sectionY} 0`, background: "var(--bg-secondary)" }}>
          <div style={container}>
            <div data-reveal>
              <h2 style={{ ...sectionTitle, marginBottom: 48 }}>Real businesses. Real results.</h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                  gap: 24
                }}
              >
                {[
                  {
                    quote:
                      "Finally have a website that looks professional. Got 3 inquiries in the first week.",
                    name: "Sarah K.",
                    role: "Interior Designer"
                  },
                  {
                    quote:
                      "I had no idea how to market myself. LACORE built my entire system in minutes.",
                    name: "David M.",
                    role: "Business Consultant"
                  },
                  {
                    quote: "My landing page looks better than my competitors who paid agencies $8,000.",
                    name: "Anna R.",
                    role: "Marketing Coach"
                  }
                ].map((t) => (
                  <div key={t.name} className="lacore-card" style={{ ...cardBase, padding: 28 }}>
                    <p style={{ margin: 0, fontFamily: ff, fontSize: 15, lineHeight: 1.65, color: "var(--text-primary)" }}>
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <p style={{ margin: "18px 0 0", fontFamily: ff, fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                      {t.name}
                    </p>
                    <p style={{ margin: "4px 0 0", fontFamily: ff, fontSize: 12, color: "var(--text-muted)" }}>{t.role}</p>
                    <p style={{ margin: "14px 0 0", fontSize: 14, letterSpacing: 2, color: "var(--accent)" }}>★★★★★</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ——— PRICING ——— */}
        <section id="pricing" style={{ padding: `${sectionY} 0` }}>
          <div style={container}>
            <div data-reveal>
              <h2 style={{ ...sectionTitle, marginBottom: 48 }}>One price. Everything included.</h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                  gap: 24,
                  maxWidth: 900,
                  margin: "0 auto"
                }}
              >
                <div className="lacore-card" style={{ ...cardBase, padding: 32 }}>
                  <p style={{ margin: 0, fontFamily: ff, fontSize: 11, letterSpacing: "0.2em", color: "var(--accent)" }}>
                    STARTER
                  </p>
                  <p style={{ margin: "12px 0 0", fontFamily: ff, fontWeight: 800, fontSize: 40, color: "var(--text-primary)" }}>
                    $49<span style={{ fontSize: 18, fontWeight: 600, color: "var(--text-muted)" }}>/mo</span>
                  </p>
                  <ul
                    style={{
                      margin: "20px 0 0",
                      paddingLeft: 18,
                      fontFamily: ff,
                      fontSize: 14,
                      lineHeight: 1.8,
                      color: "var(--text-secondary)"
                    }}
                  >
                    <li>Landing page + AI editor</li>
                    <li>Lead capture</li>
                    <li>1 social channel</li>
                  </ul>
                  <p style={{ margin: "24px 0 0", fontFamily: ff, fontSize: 12, color: "var(--text-muted)" }}>
                    Start free — no credit card needed
                  </p>
                </div>
                <div
                  className="lacore-card"
                  style={{
                    ...cardBase,
                    padding: 32,
                    border: "2px solid var(--accent)",
                    background: "color-mix(in srgb, var(--accent) 6%, var(--bg-card))"
                  }}
                >
                  <p style={{ margin: 0, fontFamily: ff, fontSize: 11, letterSpacing: "0.2em", color: "var(--accent)" }}>PRO</p>
                  <p style={{ margin: "12px 0 0", fontFamily: ff, fontWeight: 800, fontSize: 40, color: "var(--text-primary)" }}>
                    $99<span style={{ fontSize: 18, fontWeight: 600, color: "var(--text-muted)" }}>/mo</span>
                  </p>
                  <ul
                    style={{
                      margin: "20px 0 0",
                      paddingLeft: 18,
                      fontFamily: ff,
                      fontSize: 14,
                      lineHeight: 1.8,
                      color: "var(--text-secondary)"
                    }}
                  >
                    <li>Everything in Starter</li>
                    <li>All social channels</li>
                    <li>AI content daily</li>
                    <li>Analytics + priority support</li>
                  </ul>
                  <p style={{ margin: "24px 0 0", fontFamily: ff, fontSize: 12, color: "var(--text-muted)" }}>
                    Start free — no credit card needed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ——— FINAL CTA ——— */}
        <section style={{ padding: `${sectionY} 0`, background: "var(--bg-secondary)", textAlign: "center" }}>
          <div style={container}>
            <div data-reveal>
              <h2
                style={{
                  margin: 0,
                  fontFamily: ff,
                  fontWeight: 800,
                  fontSize: "clamp(2.25rem, 6vw, 4rem)",
                  lineHeight: 1.05,
                  color: "var(--text-primary)"
                }}
              >
                Your first client is waiting.
              </h2>
              <p
                style={{
                  margin: "20px auto 0",
                  maxWidth: 520,
                  fontFamily: ff,
                  fontSize: isMobile ? 16 : 18,
                  lineHeight: 1.55,
                  color: "var(--text-secondary)"
                }}
              >
                It takes 60 seconds to start. Everything else is automatic.
              </p>
              <Link
                href={isLoggedIn ? "/dashboard" : "/auth"}
                style={{
                  display: "inline-block",
                  marginTop: 32,
                  border: "none",
                  background: "var(--accent)",
                  color: "#000000",
                  fontFamily: ff,
                  fontSize: 14,
                  letterSpacing: "0.12em",
                  fontWeight: 700,
                  padding: "18px 36px",
                  borderRadius: 12,
                  textDecoration: "none"
                }}
              >
                START FOR FREE →
              </Link>
              <p style={{ margin: "16px 0 0", fontFamily: ff, fontSize: 13, color: "var(--text-muted)" }}>
                No credit card. No design skills. No agency.
              </p>
            </div>
          </div>
        </section>

        <div
          style={{
            marginTop: "auto",
            width: "100%",
            overflow: "hidden",
            borderTop: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
            padding: "12px 0"
          }}
        >
          <div
            style={{
              width: "max-content",
              display: "inline-flex",
              whiteSpace: "nowrap",
              animation: "ticker-scroll 24s linear infinite",
              fontFamily: ff,
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
