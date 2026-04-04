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

  const SALES_MACHINE_MS = 2800;
  const [salesMachineStage, setSalesMachineStage] = useState(0);
  const [salesMachinePaused, setSalesMachinePaused] = useState(false);
  const [salesMachineCycleKey, setSalesMachineCycleKey] = useState(0);

  useEffect(() => {
    if (salesMachinePaused) return;
    const id = window.setInterval(() => {
      setSalesMachineStage((s) => (s + 1) % 5);
    }, SALES_MACHINE_MS);
    return () => clearInterval(id);
  }, [salesMachinePaused, salesMachineCycleKey]);

  const salesMachineNextLabels = useMemo(
    () => [
      "Next: Page live →",
      "Next: Posts live →",
      "Next: Lead capture →",
      "Next: Close deal →",
      "Next: Offer input →"
    ],
    []
  );

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
        @keyframes sales-machine-slide-in {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes sales-machine-bar-fill {
          from { width: 0%; }
          to { width: 100%; }
        }
        .pricing-section-inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 max(24px, 5vw);
        }
        .pricing-grid {
          margin-top: 48px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 28px;
          max-width: 440px;
          margin-left: auto;
          margin-right: auto;
          align-items: stretch;
        }
        @media (min-width: 768px) {
          .pricing-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            max-width: none;
            margin-left: 0;
            margin-right: 0;
          }
        }
        @media (min-width: 1025px) {
          .pricing-grid {
            gap: 20px;
            align-items: center;
          }
        }
        .pricing-card {
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          padding: 40px 36px;
        }
        .pricing-card--featured {
          padding-top: 44px;
        }
        .pricing-price {
          margin-top: 12px;
          font-size: 3.5rem;
          font-weight: 900;
          color: var(--accent);
          line-height: 1;
          font-family: var(--font-geist-sans), system-ui, sans-serif;
        }
        @media (max-width: 1024px) {
          .pricing-price {
            font-size: 2.5rem;
          }
          .pricing-card {
            padding: 28px 20px;
          }
          .pricing-card--featured {
            padding-top: 40px;
          }
        }
        @media (min-width: 1025px) {
          .pricing-card--featured {
            transform: scale(1.03);
          }
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
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
                  }
                  style={{
                    border: "none",
                    background: "transparent",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: isMobile ? "24px 0 16px" : "32px 0 20px"
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
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingBottom: isMobile ? 16 : 24
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
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              lineHeight: 1.1
            }}
          >
            <span style={{ display: "block", color: "var(--text-primary)" }}>60 MINUTES AFTER SIGNING UP</span>
            <span style={{ display: "block", color: "var(--accent)" }}>YOUR FIRST LEAD ARRIVES.</span>
          </h2>
          <p
            style={{
              margin: "12px 0 0",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontSize: 12,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--text-muted)"
            }}
          >
            The machine in action
          </p>

          <div
            onMouseEnter={() => setSalesMachinePaused(true)}
            onMouseLeave={() => {
              if (salesMachinePaused) setSalesMachineCycleKey((k) => k + 1);
              setSalesMachinePaused(false);
            }}
            style={{
              margin: "60px auto 0",
              maxWidth: 1100,
              background: "#0A0A0F",
              border: "1px solid #1C1C1F",
              borderRadius: 24,
              overflow: "hidden",
              textAlign: "left"
            }}
          >
            <div
              style={{
                height: 44,
                background: "#111115",
                borderBottom: "1px solid #1C1C1F",
                display: "flex",
                alignItems: "center",
                padding: "0 20px",
                gap: 8
              }}
            >
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F57", flexShrink: 0 }} />
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#FEBC2E", flexShrink: 0 }} />
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#28C840", flexShrink: 0 }} />
              <span
                style={{
                  marginLeft: 16,
                  fontSize: 13,
                  color: "#52525B",
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
                }}
              >
                lacore.ai — Sales Machine
              </span>
              <span style={{ flex: 1 }} />
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  color: "#22C55E",
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                  fontWeight: 600
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }} />
                LIVE
              </span>
            </div>

            <div style={{ height: 3, background: "#1C1C1F", width: "100%" }}>
              <div
                key={`${salesMachineStage}-${salesMachineCycleKey}`}
                style={{
                  height: "100%",
                  width: "0%",
                  background: "#06B6D4",
                  boxShadow: "0 0 8px rgba(6,182,212,0.6)",
                  animation: `sales-machine-bar-fill ${SALES_MACHINE_MS}ms linear forwards`,
                  animationPlayState: salesMachinePaused ? "paused" : "running"
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "repeat(5, minmax(148px, 1fr))" : "repeat(5, 1fr)",
                borderBottom: "1px solid #1C1C1F",
                overflowX: isMobile ? "auto" : undefined
              }}
            >
              {[
                {
                  label: "01 / INPUT",
                  title: "Your offer",
                  key: "offer"
                },
                {
                  label: "02 / BUILD",
                  title: "Page live",
                  key: "landing"
                },
                {
                  label: "03 / PUBLISH",
                  title: "Posts live",
                  key: "content"
                },
                {
                  label: "04 / CAPTURE",
                  title: "Leads in",
                  key: "leads"
                },
                {
                  label: "05 / CLOSE",
                  title: "Deal closed",
                  key: "close"
                }
              ].map((stage, idx) => {
                const active = salesMachineStage === idx;
                return (
                  <button
                    key={stage.key}
                    type="button"
                    onClick={() => {
                      setSalesMachineStage(idx);
                      setSalesMachineCycleKey((k) => k + 1);
                    }}
                    style={{
                      margin: 0,
                      padding: "24px 20px",
                      border: "none",
                      borderBottom: active ? "2px solid #06B6D4" : "2px solid transparent",
                      background: active ? "rgba(6,182,212,0.06)" : "transparent",
                      opacity: active ? 1 : 0.45,
                      cursor: "pointer",
                      textAlign: "left",
                      boxSizing: "border-box",
                      font: "inherit",
                      color: "inherit",
                      transition: "all 0.4s ease"
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: active ? "#06B6D4" : "#52525B",
                        marginBottom: 12,
                        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                        transition: "all 0.4s ease"
                      }}
                    >
                      {stage.label}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#F4F4F5",
                        marginBottom: 16,
                        fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
                      }}
                    >
                      {stage.title}
                    </div>

                    {idx === 0 && (
                      <div>
                        <div
                          style={{
                            background: "#1A1A1F",
                            borderRadius: 8,
                            padding: 12,
                            fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontSize: 11,
                              fontStyle: "italic",
                              color: "#71717A"
                            }}
                          >
                            I sell legal consulting...
                          </p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                            {["Legal", "B2B", "Consulting"].map((tag) => (
                              <span
                                key={tag}
                                style={{
                                  padding: "3px 8px",
                                  background: "rgba(6,182,212,0.1)",
                                  borderRadius: 4,
                                  fontSize: 10,
                                  color: "#06B6D4",
                                  fontWeight: 600
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {idx === 1 && (
                      <div>
                        <div
                          style={{
                            borderRadius: 8,
                            overflow: "hidden",
                            border: "1px solid #1C1C1F"
                          }}
                        >
                          <div
                            style={{
                              height: 20,
                              background: "#1A1A1F",
                              display: "flex",
                              alignItems: "center",
                              padding: "0 8px",
                              gap: 4
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF5F57" }} />
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FEBC2E" }} />
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#28C840" }} />
                          </div>
                          <div
                            style={{
                              height: 80,
                              background: "linear-gradient(135deg, #0A0C10 0%, #1a1040 100%)",
                              padding: "12px 14px",
                              boxSizing: "border-box"
                            }}
                          >
                            <div
                              style={{
                                width: "60%",
                                height: 8,
                                borderRadius: 4,
                                background: "rgba(255,255,255,0.7)"
                              }}
                            />
                            <div
                              style={{
                                width: "40%",
                                height: 6,
                                borderRadius: 4,
                                background: "rgba(255,255,255,0.28)",
                                marginTop: 8
                              }}
                            />
                            <div
                              style={{
                                width: 50,
                                height: 18,
                                background: "#06B6D4",
                                borderRadius: 4,
                                marginTop: 8
                              }}
                            />
                          </div>
                        </div>
                        <p
                          style={{
                            margin: "8px 0 0",
                            fontSize: 10,
                            color: "#06B6D4",
                            fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
                          }}
                        >
                          yourname.lacore.ai
                        </p>
                      </div>
                    )}

                    {idx === 2 && (
                      <div>
                        {[
                          { icon: "𝕏", iconStyle: { color: "#fff", fontSize: 14 }, text: "Why I stopped charging per hour..." },
                          {
                            icon: "in",
                            iconStyle: { color: "#0A66C2", fontSize: 14, fontWeight: 900 },
                            text: "3 mistakes consultants make..."
                          },
                          {
                            icon: "ig",
                            iconStyle: {},
                            text: "My client got 5 leads from...",
                            ig: true
                          }
                        ].map((post, pi) => (
                          <div
                            key={pi}
                            style={{
                              background: "#1A1A1F",
                              borderRadius: 6,
                              padding: "8px 10px",
                              marginBottom: 6,
                              display: "flex",
                              alignItems: "center",
                              gap: 8
                            }}
                          >
                            {post.ig ? (
                              <span
                                style={{
                                  width: 14,
                                  height: 14,
                                  borderRadius: 4,
                                  flexShrink: 0,
                                  background:
                                    "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)"
                                }}
                              />
                            ) : (
                              <span style={{ ...post.iconStyle, flexShrink: 0, lineHeight: 1 }}>{post.icon}</span>
                            )}
                            <span
                              style={{
                                fontSize: 10,
                                color: "#A1A1AA",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
                              }}
                            >
                              {post.text}
                            </span>
                          </div>
                        ))}
                        <p
                          style={{
                            margin: "4px 0 0",
                            fontSize: 10,
                            color: "#52525B",
                            fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
                          }}
                        >
                          Published automatically
                        </p>
                      </div>
                    )}

                    {idx === 3 && (
                      <div>
                        {[
                          {
                            top: "🔔 New lead",
                            topColor: "#22C55E",
                            border: "#22C55E",
                            sub: "Maria S. — wants to book a call",
                            delay: "0s"
                          },
                          {
                            top: "💬 Hot lead",
                            topColor: "#F59E0B",
                            border: "#F59E0B",
                            sub: "Alex M. — replied to your post",
                            delay: "0.12s"
                          },
                          {
                            top: "💰 Payment",
                            topColor: "#06B6D4",
                            border: "#06B6D4",
                            sub: "$2,500 received via Stripe",
                            delay: "0.24s"
                          }
                        ].map((n, ni) => (
                          <div
                            key={ni}
                            style={{
                              background: "#1A1A1F",
                              borderLeft: `2px solid ${n.border}`,
                              borderRadius: "0 6px 6px 0",
                              padding: "8px 10px",
                              marginBottom: 6,
                              animation:
                                salesMachineStage === 3
                                  ? `sales-machine-slide-in 0.3s ease ${n.delay} both`
                                  : undefined,
                              fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
                            }}
                          >
                            <div style={{ fontSize: 10, color: n.topColor, fontWeight: 700 }}>{n.top}</div>
                            <div style={{ fontSize: 10, color: "#A1A1AA", marginTop: 2 }}>{n.sub}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {idx === 4 && (
                      <div>
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: "2rem",
                              fontWeight: 900,
                              color: "#22C55E",
                              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                              lineHeight: 1
                            }}
                          >
                            $2,500
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#52525B",
                              marginTop: 4,
                              fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
                            }}
                          >
                            New client closed
                          </div>
                        </div>
                        <div style={{ height: 1, background: "#1C1C1F", margin: "12px 0" }} />
                        <div
                          style={{
                            background: "#1A1A1F",
                            borderRadius: 6,
                            padding: "8px 10px",
                            fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
                          }}
                        >
                          <div style={{ fontSize: 10, color: "#52525B" }}>AI suggested reply:</div>
                          <div
                            style={{
                              fontSize: 10,
                              color: "#A1A1AA",
                              marginTop: 4,
                              fontStyle: "italic",
                              lineHeight: 1.4
                            }}
                          >
                            &quot;Hi Maria, thank you for reaching out...&quot;
                          </div>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div
              style={{
                height: 40,
                background: "#0A0A0F",
                borderTop: "1px solid #1C1C1F",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 20px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {[0, 1, 2, 3, 4].map((dot) => (
                  <button
                    key={dot}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSalesMachineStage(dot);
                      setSalesMachineCycleKey((k) => k + 1);
                    }}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      background: salesMachineStage === dot ? "#FAFAFA" : "#3F3F46"
                    }}
                    aria-label={`Stage ${dot + 1}`}
                  />
                ))}
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: "#52525B",
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
                }}
              >
                {salesMachineNextLabels[salesMachineStage]}
              </span>
            </div>
          </div>

          <Link
            href="/auth"
            style={{
              marginTop: 48,
              display: "block",
              marginLeft: "auto",
              marginRight: "auto",
              width: "fit-content",
              background: "#06B6D4",
              color: "#000000",
              padding: "18px 48px",
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 16,
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              textDecoration: "none",
              textAlign: "center"
            }}
          >
            BUILD YOUR SALES MACHINE →
          </Link>

          <p
            style={{
              margin: "24px auto 0",
              maxWidth: 1100,
              textAlign: "center",
              fontSize: 14,
              color: "#52525B",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
            }}
          >
            This runs automatically. 24/7. While you sleep.
          </p>
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
            background: "var(--bg-primary)",
            padding: isMobile ? "60px 0" : "120px 0"
          }}
        >
          <div className="pricing-section-inner">
            <h2
              style={{
                margin: 0,
                textAlign: "center",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                fontWeight: 800,
                fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
                letterSpacing: "-0.02em",
                color: "var(--text-primary)"
              }}
            >
              Simple pricing. No surprises.
            </h2>
            <p
              style={{
                margin: "16px 0 0",
                textAlign: "center",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                fontSize: 16,
                color: "var(--text-muted)",
                lineHeight: 1.6
              }}
            >
              Start free. Upgrade when you&apos;re ready to scale.
            </p>

            <div className="pricing-grid">
              {/* STARTER */}
              <div
                className="pricing-card"
                style={{
                  border: "1px solid var(--border-primary)",
                  background: "var(--bg-card)"
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    opacity: 0.5,
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    color: "var(--text-primary)"
                  }}
                >
                  STARTER
                </span>
                <div className="pricing-price">FREE</div>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontSize: 14,
                    color: "var(--text-muted)"
                  }}
                >
                  During beta
                </p>
                <ul
                  style={{
                    listStyle: "none",
                    margin: "28px 0",
                    padding: 0,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14
                  }}
                >
                  {[
                    "AI offer generation",
                    "Landing page (lacore.ai/p/yourname)",
                    "AI visual editor",
                    "Lead capture form",
                    "Sales Builder AI chat",
                    "1 active landing page"
                  ].map((text) => (
                    <li
                      key={text}
                      style={{
                        display: "flex",
                        gap: 10,
                        fontSize: "0.94rem",
                        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                        color: "var(--text-secondary)",
                        lineHeight: 1.45
                      }}
                    >
                      <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>✓</span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 16,
                    fontWeight: 700,
                    borderRadius: 12,
                    marginTop: "auto",
                    textAlign: "center",
                    textDecoration: "none",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontSize: 13,
                    letterSpacing: "0.06em",
                    border: "2px solid var(--accent)",
                    background: "transparent",
                    color: "var(--accent)",
                    display: "block"
                  }}
                >
                  START FOR FREE →
                </Link>
              </div>

              {/* PRO */}
              <div
                className="pricing-card pricing-card--featured"
                style={{
                  position: "relative",
                  border: "2px solid var(--accent)",
                  background: "var(--bg-card)",
                  boxShadow: "0 0 40px rgba(6,182,212,0.15)"
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: -16,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "var(--accent)",
                    color: "#ffffff",
                    borderRadius: 999,
                    padding: "6px 20px",
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    letterSpacing: "0.08em",
                    whiteSpace: "nowrap"
                  }}
                >
                  MOST POPULAR
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    opacity: 0.5,
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    color: "var(--text-primary)"
                  }}
                >
                  PRO
                </span>
                <div className="pricing-price">$49</div>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontSize: 14,
                    color: "var(--text-muted)"
                  }}
                >
                  /month
                </p>
                <ul
                  style={{
                    listStyle: "none",
                    margin: "28px 0",
                    padding: 0,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14
                  }}
                >
                  {[
                    "Everything in Starter",
                    "Custom domain connection",
                    "Content machine — daily posts to Instagram, X, Threads, LinkedIn",
                    "AI writes in your voice",
                    "Lead notifications (email + Telegram)",
                    "3 active landing pages",
                    "Analytics dashboard",
                    "Priority support"
                  ].map((text) => (
                    <li
                      key={text}
                      style={{
                        display: "flex",
                        gap: 10,
                        fontSize: "0.94rem",
                        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                        color: "var(--text-secondary)",
                        lineHeight: 1.45
                      }}
                    >
                      <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>✓</span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 16,
                    fontWeight: 700,
                    borderRadius: 12,
                    marginTop: "auto",
                    textAlign: "center",
                    textDecoration: "none",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontSize: 13,
                    letterSpacing: "0.06em",
                    border: "none",
                    background: "var(--accent)",
                    color: "#ffffff",
                    display: "block"
                  }}
                >
                  GET PRO →
                </Link>
              </div>

              {/* SCALE */}
              <div
                className="pricing-card"
                style={{
                  border: "1px solid var(--border-primary)",
                  background: "var(--bg-card)"
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    opacity: 0.5,
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    color: "var(--text-primary)"
                  }}
                >
                  SCALE
                </span>
                <div className="pricing-price">$99</div>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontSize: 14,
                    color: "var(--text-muted)"
                  }}
                >
                  /month
                </p>
                <ul
                  style={{
                    listStyle: "none",
                    margin: "28px 0",
                    padding: 0,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14
                  }}
                >
                  {[
                    "Everything in Pro",
                    "All social platforms (TikTok, YouTube Shorts, Pinterest, Telegram)",
                    "AI closing scripts — personalized for every lead",
                    "Auto follow-up sequences",
                    "WhatsApp & Telegram lead bot",
                    "Stripe payments on landing page",
                    "Unlimited landing pages",
                    "CRM — full lead pipeline view",
                    "Dedicated AI sales agent",
                    "White-label option"
                  ].map((text) => (
                    <li
                      key={text}
                      style={{
                        display: "flex",
                        gap: 10,
                        fontSize: "0.94rem",
                        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                        color: "var(--text-secondary)",
                        lineHeight: 1.45
                      }}
                    >
                      <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>✓</span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 16,
                    fontWeight: 700,
                    borderRadius: 12,
                    marginTop: "auto",
                    textAlign: "center",
                    textDecoration: "none",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontSize: 13,
                    letterSpacing: "0.06em",
                    border: "2px solid var(--accent)",
                    background: "transparent",
                    color: "var(--accent)",
                    display: "block"
                  }}
                >
                  GET SCALE →
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
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
