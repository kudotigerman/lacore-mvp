"use client";

import { FormEvent, Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bebas_Neue } from "next/font/google";
import { getSupabaseClient } from "@/lib/supabase";

const landingBebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"]
});

const sans = "var(--font-geist-sans), system-ui, sans-serif";

const STEPS = [
  {
    num: "01",
    icon: "◆",
    title: "OFFER",
    body: "Tell LACORE what you do. Get a sharp, compelling offer in seconds."
  },
  {
    num: "02",
    icon: "⬡",
    title: "LANDING PAGE",
    body: "A high-converting landing page. Live in minutes. Your domain."
  },
  {
    num: "03",
    icon: "✦",
    title: "CONTENT",
    body: "AI-generated posts for Instagram, X, LinkedIn, Threads and Telegram."
  },
  {
    num: "04",
    icon: "◎",
    title: "LEADS",
    body: "Every form submission captured. See who's interested in real time."
  },
  {
    num: "05",
    icon: "⟐",
    title: "CLOSING",
    body: "Scripts, follow-ups, objection handling. Close more deals."
  },
  {
    num: "06",
    icon: "▦",
    title: "ANALYTICS",
    body: "Track what's working. Double down on what gets clients."
  }
] as const;

const AUDIENCE_CARDS = [
  {
    emoji: "🎨",
    title: "Designers & Creatives",
    desc: "Turn your portfolio into a client machine."
  },
  {
    emoji: "💼",
    title: "Consultants",
    desc: "Position your expertise. Attract premium clients."
  },
  {
    emoji: "🧠",
    title: "Coaches",
    desc: "Your methodology deserves more students."
  },
  {
    emoji: "🏢",
    title: "Small Agencies",
    desc: "Scale your pipeline without scaling your team."
  },
  {
    emoji: "💻",
    title: "Developers & Tech",
    desc: "Ship your offer. Let LACORE find the users."
  },
  {
    emoji: "✍️",
    title: "Copywriters & Marketers",
    desc: "Practice what you preach. Automate your own sales."
  }
] as const;

const HERO_PLACEHOLDER_PHRASES = [
  "I help restaurants design spaces that increase revenue...",
  "I coach founders on building high-performance teams...",
  "I create brand identities for premium lifestyle brands...",
  "I help e-commerce stores grow with paid ads...",
  "I build custom software for logistics companies...",
  "I consult small agencies on pricing and positioning..."
];

export default function LandingPage() {
  const router = useRouter();
  const [heroInput, setHeroInput] = useState("");
  const [heroInputFocused, setHeroInputFocused] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const u = () => setIsMobile(window.innerWidth < 768);
    u();
    window.addEventListener("resize", u);
    return () => window.removeEventListener("resize", u);
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
    if (heroInput.trim() || heroInputFocused) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let phraseIndex = 0;
    let displayedLen = 0;
    type Phase = "typing" | "pause" | "deleting";
    let phase: Phase = "typing";

    const schedule = (fn: () => void, ms: number) => {
      if (timeoutId !== null) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        timeoutId = null;
        if (!cancelled) fn();
      }, ms);
    };

    const step = () => {
      if (cancelled) return;
      const text = HERO_PLACEHOLDER_PHRASES[phraseIndex] ?? "";

      if (phase === "typing") {
        if (displayedLen < text.length) {
          displayedLen += 1;
          setCurrentPlaceholder(text.slice(0, displayedLen));
          schedule(step, 30);
        } else {
          phase = "pause";
          schedule(() => {
            if (cancelled) return;
            phase = "deleting";
            step();
          }, 3000);
        }
      } else if (phase === "deleting") {
        if (displayedLen > 0) {
          displayedLen -= 1;
          setCurrentPlaceholder(text.slice(0, displayedLen));
          schedule(step, 15);
        } else {
          phraseIndex = (phraseIndex + 1) % HERO_PLACEHOLDER_PHRASES.length;
          phase = "typing";
          step();
        }
      }
    };

    setCurrentPlaceholder("");
    displayedLen = 0;
    phraseIndex = 0;
    phase = "typing";
    schedule(step, 0);

    return () => {
      cancelled = true;
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [heroInput, heroInputFocused]);

  function scrollToSection(sectionId: string) {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleHeroSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!heroInput.trim()) return;
    router.push(isLoggedIn ? "/dashboard" : "/auth");
  }

  const navH = 64;

  return (
    <>
      <style>{`
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
        .lacore-footer-heading {
          margin: 0 0 20px;
          font-family: var(--font-geist-sans), system-ui, sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: #52525b;
        }
        .lacore-footer-link {
          display: block;
          margin-bottom: 12px;
          font-family: var(--font-geist-sans), system-ui, sans-serif;
          font-size: 14px;
          color: #a1a1aa;
          text-decoration: none;
          transition: color 0.2s;
        }
        .lacore-footer-link:hover {
          color: #f4f4f5;
        }
        .lacore-footer-scroll {
          display: block;
          margin-bottom: 12px;
          padding: 0;
          border: none;
          background: none;
          cursor: pointer;
          text-align: left;
          font-family: var(--font-geist-sans), system-ui, sans-serif;
          font-size: 14px;
          color: #a1a1aa;
          text-decoration: none;
          transition: color 0.2s;
        }
        .lacore-footer-scroll:hover {
          color: #f4f4f5;
        }
        .lacore-footer-social {
          color: #52525b;
          font-size: 13px;
          text-decoration: none;
          transition: color 0.2s;
        }
        .lacore-footer-social:hover {
          color: #f4f4f5;
        }
        .home-anchor-section {
          scroll-margin-top: ${navH + 8}px;
        }
        .home-steps-row {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 28px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .home-step-arrow {
          display: none;
        }
        @media (min-width: 1024px) {
          .home-steps-row {
            flex-direction: row;
            flex-wrap: nowrap;
            justify-content: center;
            align-items: flex-start;
            gap: 8px;
          }
          .home-step-arrow {
            display: flex;
            align-items: center;
            color: #06b6d4;
            font-size: 18px;
            font-weight: 600;
            flex-shrink: 0;
            padding-top: 36px;
          }
        }
        .home-step-card {
          flex: 1 1 0;
          min-width: 0;
          text-align: center;
        }
        .home-audience-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          max-width: 800px;
          margin: 0 auto;
        }
        @media (min-width: 640px) {
          .home-audience-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 900px) {
          .home-audience-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .home-pain-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
          max-width: 900px;
          margin: 0 auto;
          text-align: center;
        }
        @media (min-width: 768px) {
          .home-pain-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .home-social-stats {
          display: grid;
          grid-template-columns: 1fr;
          gap: 28px;
          text-align: center;
          align-items: center;
        }
        @media (min-width: 768px) {
          .home-social-stats {
            grid-template-columns: repeat(3, 1fr);
            gap: 0;
          }
          .home-social-stat-cell {
            border-right: 1px solid #1c1c22;
            padding: 0 20px;
          }
          .home-social-stat-cell:last-child {
            border-right: none;
          }
        }
        .home-social-testimonials {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          max-width: 1100px;
          margin: 0 auto;
        }
        @media (min-width: 900px) {
          .home-social-testimonials {
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
            align-items: stretch;
          }
        }
      `}</style>

      <main
        style={{
          minHeight: "100vh",
          background: "var(--bg-primary)",
          color: "var(--text-primary)",
          fontFamily: sans,
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* NAV */}
        <nav
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            height: navH,
            background: "color-mix(in srgb, var(--bg-primary) 92%, transparent)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border-primary)",
            display: "flex",
            alignItems: "center",
            padding: "0 24px"
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 1200,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16
            }}
          >
            <Link
              href="/"
              className={landingBebas.className}
              style={{
                fontSize: 20,
                color: "#ffffff",
                textDecoration: "none",
                letterSpacing: "0.02em"
              }}
            >
              LACORE
            </Link>
            <Link
              href={isLoggedIn ? "/dashboard" : "/auth"}
              style={{
                background: "#06B6D4",
                color: "#000000",
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                fontFamily: sans,
                borderRadius: 6,
                whiteSpace: "nowrap"
              }}
            >
              {isLoggedIn ? "GO TO DASHBOARD →" : "START FOR FREE →"}
            </Link>
          </div>
        </nav>

        <div style={{ height: navH }} />

        {/* HERO */}
        <section
          style={{
            minHeight: "calc(100vh - 64px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "48px 24px 64px",
            background: "var(--bg-primary)",
            boxSizing: "border-box"
          }}
        >
          <span
            style={{
              display: "inline-block",
              border: "1px solid rgba(6,182,212,0.3)",
              color: "#06B6D4",
              fontSize: 12,
              padding: "6px 16px",
              borderRadius: 20,
              letterSpacing: "0.08em",
              fontWeight: 600,
              fontFamily: sans
            }}
          >
            YOUR BUSINESS. OUR SALES MACHINE.
          </span>

          <h1
            className={landingBebas.className}
            style={{
              margin: "28px 0 0",
              lineHeight: 0.95,
              textTransform: "uppercase",
              maxWidth: 1100
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: "clamp(52px, 8vw, 96px)",
                color: "#ffffff"
              }}
            >
              YOU SAY WHAT YOU SELL.
            </span>
            <span
              style={{
                display: "block",
                fontSize: "clamp(52px, 8vw, 96px)",
                color: "#06B6D4",
                marginTop: 4
              }}
            >
              LACORE DOES THE REST.
            </span>
          </h1>

          <p
            style={{
              margin: "24px auto 0",
              fontSize: 18,
              color: "var(--text-secondary)",
              maxWidth: 520,
              lineHeight: 1.6,
              fontFamily: sans
            }}
          >
            From offer to first client — in 60 minutes. No marketing degree required.
          </p>

          <form
            onSubmit={handleHeroSubmit}
            style={{
              marginTop: 32,
              width: "100%",
              maxWidth: 560,
              marginLeft: "auto",
              marginRight: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              alignItems: "stretch"
            }}
          >
            <input
              type="text"
              value={heroInput}
              onChange={(e) => setHeroInput(e.target.value)}
              onFocus={() => setHeroInputFocused(true)}
              onBlur={() => setHeroInputFocused(false)}
              placeholder={currentPlaceholder}
              style={{
                width: "100%",
                height: 56,
                padding: "16px 20px",
                fontSize: 16,
                fontFamily: sans,
                border: "1px solid var(--border-primary)",
                borderRadius: 8,
                background: "var(--bg-input)",
                color: "var(--text-primary)",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
            <button
              type="submit"
              disabled={!heroInput.trim()}
              style={{
                width: "100%",
                padding: "14px 24px",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: sans,
                border: "none",
                borderRadius: 8,
                background: heroInput.trim() ? "#06B6D4" : "var(--border-primary)",
                color: "#000000",
                cursor: heroInput.trim() ? "pointer" : "not-allowed",
                letterSpacing: "0.04em",
                boxSizing: "border-box"
              }}
            >
              BUILD MY SALES MACHINE →
            </button>
          </form>

          <p
            style={{
              margin: "20px 0 0",
              fontSize: 13,
              color: "var(--text-muted)",
              fontFamily: sans
            }}
          >
            Joined by designers, consultants, coaches and agencies
          </p>
        </section>

        {/* SOCIAL PROOF — stats */}
        <section
          style={{
            background: "#111116",
            borderTop: "1px solid #1C1C22",
            borderBottom: "1px solid #1C1C22"
          }}
        >
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 24px", boxSizing: "border-box" }}>
            <div className="home-social-stats">
              <div className="home-social-stat-cell">
                <p
                  style={{
                    margin: 0,
                    fontSize: 48,
                    fontWeight: 900,
                    color: "#06B6D4",
                    lineHeight: 1.05,
                    fontFamily: sans
                  }}
                >
                  200+
                </p>
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 14,
                    color: "#A1A1AA",
                    lineHeight: 1.45,
                    fontFamily: sans
                  }}
                >
                  Freelancers using LACORE
                </p>
              </div>
              <div className="home-social-stat-cell">
                <p
                  style={{
                    margin: 0,
                    fontSize: 48,
                    fontWeight: 900,
                    color: "#06B6D4",
                    lineHeight: 1.05,
                    fontFamily: sans
                  }}
                >
                  500+
                </p>
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 14,
                    color: "#A1A1AA",
                    lineHeight: 1.45,
                    fontFamily: sans
                  }}
                >
                  Landing pages created
                </p>
              </div>
              <div className="home-social-stat-cell">
                <p
                  style={{
                    margin: 0,
                    fontSize: 48,
                    fontWeight: 900,
                    color: "#06B6D4",
                    lineHeight: 1.05,
                    fontFamily: sans
                  }}
                >
                  $2M+
                </p>
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 14,
                    color: "#A1A1AA",
                    lineHeight: 1.45,
                    fontFamily: sans
                  }}
                >
                  Revenue generated for users
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF — testimonials */}
        <section
          className="home-anchor-section"
          style={{
            background: "var(--bg-primary)",
            padding: "60px 24px 80px",
            boxSizing: "border-box"
          }}
        >
          <div className="home-social-testimonials">
            <div
              style={{
                background: "#111116",
                border: "1px solid #1C1C22",
                borderRadius: 12,
                padding: 28,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                gap: 16
              }}
            >
              <span
                style={{
                  fontSize: 48,
                  lineHeight: 1,
                  color: "#06B6D4",
                  fontFamily: "Georgia, serif",
                  fontWeight: 400
                }}
                aria-hidden
              >
                &ldquo;
              </span>
              <p
                style={{
                  margin: 0,
                  fontSize: 15,
                  lineHeight: 1.65,
                  color: "#FAFAFA",
                  fontFamily: sans
                }}
              >
                LACORE helped me land my first $3,000 client in week one. The landing page looked more professional than
                anything I could build myself.
              </p>
              <p style={{ margin: "auto 0 0", fontSize: 13, color: "#A1A1AA", fontFamily: sans, lineHeight: 1.5 }}>
                Alex K., Freelance Designer, 🇺🇸
              </p>
            </div>
            <div
              style={{
                background: "#111116",
                border: "1px solid #1C1C22",
                borderRadius: 12,
                padding: 28,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                gap: 16
              }}
            >
              <span
                style={{
                  fontSize: 48,
                  lineHeight: 1,
                  color: "#06B6D4",
                  fontFamily: "Georgia, serif",
                  fontWeight: 400
                }}
                aria-hidden
              >
                &ldquo;
              </span>
              <p
                style={{
                  margin: 0,
                  fontSize: 15,
                  lineHeight: 1.65,
                  color: "#FAFAFA",
                  fontFamily: sans
                }}
              >
                I went from zero online presence to 5 inbound leads in 2 weeks. The AI offer generator finally made me
                sound like a pro.
              </p>
              <p style={{ margin: "auto 0 0", fontSize: 13, color: "#A1A1AA", fontFamily: sans, lineHeight: 1.5 }}>
                Maria S., Business Consultant, 🇩🇪
              </p>
            </div>
            <div
              style={{
                background: "#111116",
                border: "1px solid #1C1C22",
                borderRadius: 12,
                padding: 28,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                gap: 16
              }}
            >
              <span
                style={{
                  fontSize: 48,
                  lineHeight: 1,
                  color: "#06B6D4",
                  fontFamily: "Georgia, serif",
                  fontWeight: 400
                }}
                aria-hidden
              >
                &ldquo;
              </span>
              <p
                style={{
                  margin: 0,
                  fontSize: 15,
                  lineHeight: 1.65,
                  color: "#FAFAFA",
                  fontFamily: sans
                }}
              >
                Set up in 20 minutes. My Calendly got 3 bookings the same day I launched. Insane ROI for a free tool.
              </p>
              <p style={{ margin: "auto 0 0", fontSize: 13, color: "#A1A1AA", fontFamily: sans, lineHeight: 1.5 }}>
                James T., Executive Coach, 🇬🇧
              </p>
            </div>
          </div>
        </section>

        {/* PAIN */}
        <section
          className="home-anchor-section"
          style={{
            background: "var(--bg-secondary)",
            padding: "80px 24px",
            textAlign: "center"
          }}
        >
          <h2
            className={landingBebas.className}
            style={{
              margin: 0,
              fontSize: 48,
              color: "#ffffff",
              lineHeight: 1.05,
              textTransform: "uppercase",
              letterSpacing: "0.02em"
            }}
          >
            The tools exist. The clients don&apos;t.
          </h2>

          <div className="home-pain-grid" style={{ marginTop: 48 }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", fontFamily: sans }}>ChatGPT gives you</p>
              <p style={{ margin: "12px 0 0", fontSize: 32, fontWeight: 800, color: "var(--text-muted)", fontFamily: sans }}>
                Text.
              </p>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--text-muted)", fontFamily: sans }}>But not a system.</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", fontFamily: sans }}>Webflow gives you</p>
              <p style={{ margin: "12px 0 0", fontSize: 32, fontWeight: 800, color: "var(--text-muted)", fontFamily: sans }}>
                A website.
              </p>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--text-muted)", fontFamily: sans }}>But not clients.</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", fontFamily: sans }}>LACORE gives you</p>
              <p style={{ margin: "12px 0 0", fontSize: 32, fontWeight: 800, color: "#06B6D4", fontFamily: sans }}>Clients.</p>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--text-muted)", fontFamily: sans }}>
                The whole system. Automated.
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section
          className="home-anchor-section"
          style={{
            position: "relative",
            padding: "100px 24px",
            textAlign: "center",
            background: "var(--bg-primary)"
          }}
        >
          <span
            id="how-it-works"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 1,
              height: 1,
              overflow: "hidden",
              clip: "rect(0,0,0,0)",
              whiteSpace: "nowrap"
            }}
            aria-hidden
          />
          <span
            id="what-you-get"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 1,
              height: 1,
              overflow: "hidden",
              clip: "rect(0,0,0,0)",
              whiteSpace: "nowrap"
            }}
            aria-hidden
          />

          <h2
            className={landingBebas.className}
            style={{
              margin: 0,
              fontSize: 56,
              lineHeight: 1.05,
              color: "var(--text-primary)",
              textTransform: "uppercase",
              letterSpacing: "0.02em"
            }}
          >
            60 MINUTES TO YOUR FIRST CLIENT
          </h2>
          <p
            style={{
              margin: "16px auto 0",
              fontSize: 16,
              color: "var(--text-secondary)",
              fontFamily: sans,
              maxWidth: 520,
              lineHeight: 1.5
            }}
          >
            Six layers. One system. Zero marketing experience required.
          </p>

          <div className="home-steps-row" style={{ marginTop: 56 }}>
            {STEPS.map((step, i) => (
              <Fragment key={step.num}>
                {i > 0 ? <span className="home-step-arrow" aria-hidden>→</span> : null}
                <div className="home-step-card">
                  <p
                    style={{
                      margin: 0,
                      color: "#06B6D4",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      fontFamily: sans
                    }}
                  >
                    {step.num}
                  </p>
                  <div style={{ marginTop: 10, fontSize: 22, lineHeight: 1 }} aria-hidden>
                    {step.icon}
                  </div>
                  <p
                    style={{
                      margin: "10px 0 0",
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#ffffff",
                      fontFamily: sans
                    }}
                  >
                    {step.title}
                  </p>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: 13,
                      color: "var(--text-muted)",
                      lineHeight: 1.5,
                      fontFamily: sans,
                      maxWidth: 200,
                      marginLeft: "auto",
                      marginRight: "auto"
                    }}
                  >
                    {step.body}
                  </p>
                </div>
              </Fragment>
            ))}
          </div>
        </section>

        {/* FOR WHO */}
        <section
          style={{
            background: "var(--bg-secondary)",
            padding: "80px 24px",
            textAlign: "center"
          }}
        >
          <h2
            className={landingBebas.className}
            style={{
              margin: 0,
              fontSize: 48,
              lineHeight: 1.05,
              color: "var(--text-primary)",
              textTransform: "uppercase",
              letterSpacing: "0.02em"
            }}
          >
            BUILT FOR PEOPLE WHO SELL EXPERTISE
          </h2>

          <div className="home-audience-grid" style={{ marginTop: 40 }}>
            {AUDIENCE_CARDS.map((card) => (
              <div
                key={card.title}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-primary)",
                  borderRadius: 8,
                  padding: 24,
                  textAlign: "left",
                  boxSizing: "border-box"
                }}
              >
                <p style={{ margin: 0, fontSize: 20, lineHeight: 1.2 }}>
                  <span aria-hidden>{card.emoji}</span>{" "}
                  <span style={{ fontSize: 16, fontWeight: 600, color: "#ffffff", fontFamily: sans }}>{card.title}</span>
                </p>
                <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, fontFamily: sans }}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* PRICING — unchanged */}
        <section
          id="pricing"
          className="home-anchor-section"
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
                fontFamily: sans,
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
                fontFamily: sans,
                fontSize: 16,
                color: "var(--text-muted)",
                lineHeight: 1.6
              }}
            >
              Start free. Upgrade when you&apos;re ready to scale.
            </p>

            <div className="pricing-grid">
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
                    fontFamily: sans,
                    color: "var(--text-primary)"
                  }}
                >
                  STARTER
                </span>
                <div className="pricing-price">FREE</div>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontFamily: sans,
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
                        fontFamily: sans,
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
                    fontFamily: sans,
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
                    fontFamily: sans,
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
                    fontFamily: sans,
                    color: "var(--text-primary)"
                  }}
                >
                  PRO
                </span>
                <div className="pricing-price">$49</div>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontFamily: sans,
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
                        fontFamily: sans,
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
                    fontFamily: sans,
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
                    fontFamily: sans,
                    color: "var(--text-primary)"
                  }}
                >
                  SCALE
                </span>
                <div className="pricing-price">$99</div>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontFamily: sans,
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
                        fontFamily: sans,
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
                    fontFamily: sans,
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

        {/* FINAL CTA */}
        <section
          style={{
            padding: "120px 24px",
            textAlign: "center",
            background: "var(--bg-primary)"
          }}
        >
          <h2
            className={landingBebas.className}
            style={{
              margin: 0,
              fontSize: "clamp(40px, 6vw, 72px)",
              lineHeight: 1.05,
              color: "#ffffff",
              textTransform: "uppercase",
              letterSpacing: "0.02em",
              maxWidth: 900,
              marginLeft: "auto",
              marginRight: "auto"
            }}
          >
            YOUR NEXT CLIENT IS 60 MINUTES AWAY.
          </h2>
          <p
            style={{
              margin: "20px 0 0",
              fontSize: 16,
              color: "var(--text-muted)",
              fontFamily: sans
            }}
          >
            Free to start. No credit card. No setup.
          </p>
          <Link
            href={isLoggedIn ? "/dashboard" : "/auth"}
            style={{
              display: "inline-block",
              marginTop: 28,
              background: "#06B6D4",
              color: "#000000",
              padding: "18px 40px",
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textDecoration: "none",
              fontFamily: sans,
              borderRadius: 8
            }}
          >
            BUILD YOUR SALES MACHINE →
          </Link>
        </section>

        {/* FOOTER — unchanged */}
        <footer
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "#060608",
            borderTop: "1px solid #1C1C1F",
            padding: "80px 0 40px"
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "0 32px"
            }}
          >
            {isMobile ? (
              <>
                <div style={{ marginBottom: 40 }}>
                  <div
                    style={{
                      fontFamily: sans,
                      fontSize: 20,
                      fontWeight: 800,
                      color: "#06B6D4"
                    }}
                  >
                    LACORE
                  </div>
                  <p
                    style={{
                      margin: "12px 0 0",
                      fontFamily: sans,
                      fontSize: 14,
                      color: "#52525B",
                      lineHeight: 1.5,
                      maxWidth: 280
                    }}
                  >
                    From idea to first client. Automatically.
                  </p>
                  <div
                    style={{
                      marginTop: 24,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 16
                    }}
                  >
                    <a href="https://x.com" target="_blank" rel="noreferrer" className="lacore-footer-social">
                      𝕏
                    </a>
                    <a href="https://threads.net" target="_blank" rel="noreferrer" className="lacore-footer-social">
                      Threads
                    </a>
                    <a href="https://instagram.com" target="_blank" rel="noreferrer" className="lacore-footer-social">
                      Instagram
                    </a>
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 32
                  }}
                >
                  <div>
                    <p className="lacore-footer-heading">PRODUCT</p>
                    <button type="button" className="lacore-footer-scroll" onClick={() => scrollToSection("how-it-works")}>
                      How it works
                    </button>
                    <button type="button" className="lacore-footer-scroll" onClick={() => scrollToSection("pricing")}>
                      Pricing
                    </button>
                    <Link href="/dashboard" className="lacore-footer-link">
                      Dashboard
                    </Link>
                    <button type="button" className="lacore-footer-scroll" onClick={() => scrollToSection("what-you-get")}>
                      What you get
                    </button>
                  </div>
                  <div>
                    <p className="lacore-footer-heading">RESOURCES</p>
                    <Link href="/blog" className="lacore-footer-link">
                      Documentation
                    </Link>
                    <Link href="/blog" className="lacore-footer-link">
                      Blog
                    </Link>
                    <Link href="/blog" className="lacore-footer-link">
                      Changelog
                    </Link>
                  </div>
                  <div>
                    <p className="lacore-footer-heading">LEGAL</p>
                    <Link href="/privacy" className="lacore-footer-link">
                      Privacy Policy
                    </Link>
                    <Link href="/terms" className="lacore-footer-link">
                      Terms of Service
                    </Link>
                    <Link href="/cookies" className="lacore-footer-link">
                      Cookie Policy
                    </Link>
                  </div>
                  <div>
                    <p className="lacore-footer-heading">CONNECT</p>
                    <a href="https://x.com" target="_blank" rel="noreferrer" className="lacore-footer-link">
                      X / Twitter
                    </a>
                    <a href="https://threads.net" target="_blank" rel="noreferrer" className="lacore-footer-link">
                      Threads
                    </a>
                    <a href="https://instagram.com" target="_blank" rel="noreferrer" className="lacore-footer-link">
                      Instagram
                    </a>
                    <a href="mailto:contact@lacore.ai" className="lacore-footer-link">
                      contact@lacore.ai
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                  gap: 48
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: sans,
                      fontSize: 20,
                      fontWeight: 800,
                      color: "#06B6D4"
                    }}
                  >
                    LACORE
                  </div>
                  <p
                    style={{
                      margin: "12px 0 0",
                      fontFamily: sans,
                      fontSize: 14,
                      color: "#52525B",
                      lineHeight: 1.5,
                      maxWidth: 200
                    }}
                  >
                    From idea to first client. Automatically.
                  </p>
                  <div style={{ marginTop: 24, display: "flex", gap: 16 }}>
                    <a href="https://x.com" target="_blank" rel="noreferrer" className="lacore-footer-social">
                      𝕏
                    </a>
                    <a href="https://threads.net" target="_blank" rel="noreferrer" className="lacore-footer-social">
                      Threads
                    </a>
                    <a href="https://instagram.com" target="_blank" rel="noreferrer" className="lacore-footer-social">
                      Instagram
                    </a>
                  </div>
                </div>
                <div>
                  <p className="lacore-footer-heading">PRODUCT</p>
                  <button type="button" className="lacore-footer-scroll" onClick={() => scrollToSection("how-it-works")}>
                    How it works
                  </button>
                  <button type="button" className="lacore-footer-scroll" onClick={() => scrollToSection("pricing")}>
                    Pricing
                  </button>
                  <Link href="/dashboard" className="lacore-footer-link">
                    Dashboard
                  </Link>
                  <button type="button" className="lacore-footer-scroll" onClick={() => scrollToSection("what-you-get")}>
                    What you get
                  </button>
                </div>
                <div>
                  <p className="lacore-footer-heading">RESOURCES</p>
                  <Link href="/blog" className="lacore-footer-link">
                    Documentation
                  </Link>
                  <Link href="/blog" className="lacore-footer-link">
                    Blog
                  </Link>
                  <Link href="/blog" className="lacore-footer-link">
                    Changelog
                  </Link>
                </div>
                <div>
                  <p className="lacore-footer-heading">LEGAL</p>
                  <Link href="/privacy" className="lacore-footer-link">
                    Privacy Policy
                  </Link>
                  <Link href="/terms" className="lacore-footer-link">
                    Terms of Service
                  </Link>
                  <Link href="/cookies" className="lacore-footer-link">
                    Cookie Policy
                  </Link>
                </div>
                <div>
                  <p className="lacore-footer-heading">CONNECT</p>
                  <a href="https://x.com" target="_blank" rel="noreferrer" className="lacore-footer-link">
                    X / Twitter
                  </a>
                  <a href="https://threads.net" target="_blank" rel="noreferrer" className="lacore-footer-link">
                    Threads
                  </a>
                  <a href="https://instagram.com" target="_blank" rel="noreferrer" className="lacore-footer-link">
                    Instagram
                  </a>
                  <a href="mailto:contact@lacore.ai" className="lacore-footer-link">
                    contact@lacore.ai
                  </a>
                </div>
              </div>
            )}

            <div
              style={{
                marginTop: 64,
                borderTop: "1px solid #1C1C1F"
              }}
            />
            <div
              style={{
                marginTop: 32,
                display: "flex",
                justifyContent: isMobile ? "center" : "flex-start",
                alignItems: "center",
                textAlign: isMobile ? "center" : "left"
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: sans,
                  fontSize: 13,
                  color: "#52525B"
                }}
              >
                © 2026 LACORE. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
