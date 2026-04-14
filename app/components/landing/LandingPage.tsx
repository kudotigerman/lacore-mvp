"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { NICHE_THEMES, STYLE_THEMES, type LandingContent, type LandingStyle } from "@/types/landing";
import {
  ArrowRight,
} from "@/app/components/landing/Icons";

type Props = {
  content: LandingContent;
  slug: string;
  style?: LandingStyle;
  /** When false, hide the “Built with LACORE” footer link (paid plans). */
  showBrandWatermark?: boolean;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((x) => x[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type HoverEvent = { currentTarget: HTMLElement };

export default function LandingPage({ content, slug, style, showBrandWatermark = true }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const theme =
    (style ? STYLE_THEMES[style] : null) ?? NICHE_THEMES[content.niche] ?? NICHE_THEMES.default;

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/aos@2.3.1/dist/aos.js";
    script.onload = () => (window as any).AOS?.init({ duration: 800, once: true });
    document.head.appendChild(script);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/aos@2.3.1/dist/aos.css";
    document.head.appendChild(link);
  }, []);

  const heroBg = useMemo(() => {
    if (theme.heroStyle === "gradient-mesh") {
      return {
        backgroundImage: `radial-gradient(circle at 20% 20%, ${theme.accent}22, transparent 45%), radial-gradient(circle at 80% 80%, ${theme.accentLight}1f, transparent 45%), linear-gradient(135deg, ${theme.bgPrimary} 0%, ${theme.bgSecondary} 100%)`,
      };
    }
    if (theme.heroStyle === "solid-glow") {
      return {
        backgroundImage: `radial-gradient(circle at 50% 25%, ${theme.accent}26 0%, transparent 55%), linear-gradient(180deg, ${theme.bgPrimary} 0%, ${theme.bgSecondary} 100%)`,
      };
    }
    return { background: theme.bgPrimary };
  }, [theme]);

  const sectionLabelStyle = {
    color: theme.accent,
    fontSize: 11,
    letterSpacing: "0.12em",
    fontWeight: 700,
    textTransform: "uppercase" as const,
  };

  const buttonBaseStyle = {
    borderRadius: 8,
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    fontSize: 13,
    transition: "all 0.2s ease",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  };

  const primaryButtonStyle = {
    ...buttonBaseStyle,
    letterSpacing: "0.05em",
    background: theme.accent,
    color: "#fff",
    padding: "14px 28px",
    border: "none",
  };

  const secondaryButtonStyle = {
    ...buttonBaseStyle,
    background: "transparent",
    color: "#fff",
    padding: "14px 28px",
    border: "1px solid rgba(255,255,255,0.15)",
  };

  const buttonHoverOn = (e: HoverEvent) => {
    e.currentTarget.style.transform = "translateY(-2px)";
    e.currentTarget.style.boxShadow = `0 8px 30px ${theme.accent}66`;
  };
  const buttonHoverOff = (e: HoverEvent) => {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = "none";
  };
  const secondaryHoverOn = (e: HoverEvent) => {
    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
    e.currentTarget.style.transform = "translateY(-2px)";
  };
  const secondaryHoverOff = (e: HoverEvent) => {
    e.currentTarget.style.background = "transparent";
    e.currentTarget.style.transform = "translateY(0)";
  };
  const cardHoverOn = (e: HoverEvent) => {
    e.currentTarget.style.transform = "translateY(-4px)";
    e.currentTarget.style.borderColor = `${theme.accent}66`;
    e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.3)";
  };
  const cardHoverOff = (e: HoverEvent) => {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.borderColor = theme.cardBorder;
    e.currentTarget.style.boxShadow = "none";
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/leads/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name, email, message }),
      });
      setSubmitted(true);
      setName("");
      setEmail("");
      setMessage("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: theme.bgPrimary, color: "#FAFAFA", fontFamily: "Inter, sans-serif", fontWeight: 400 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        .container { width: min(1100px, 100% - 48px); margin: 0 auto; }
        section { position: relative; padding: 120px 0; overflow: hidden; }
        .grid3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
        .hero-orb { position: absolute; inset: 0; pointer-events: none; z-index: 0; animation: lacore-float 8s ease-in-out infinite; }
        .hero-orb-2 { animation-delay: 1.2s; }
        .hero-orb-3 { animation-delay: 2.3s; }
        @keyframes lacore-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @media (max-width: 900px) { .grid3 { grid-template-columns: 1fr; } }
        @media (max-width: 768px) {
          section { padding: 80px 0; }
          .container { width: min(1100px, 100% - 40px); }
          .hide-mobile { display: none !important; }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 9999,
          opacity: 0.03,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
          backgroundSize: "180px 180px",
        }}
      />

      <nav
        data-aos="fade-up"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          background: "rgba(10,10,13,0.75)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="container" style={{ display: "flex", height: 80, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "Plus Jakarta Sans", fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>{content.brand}</div>
          <div className="hide-mobile" style={{ display: "flex", gap: 28, alignItems: "center" }}>
            <a href="#benefits" style={{ color: "#A1A1AA" }}>Benefits</a>
            <a href="#process" style={{ color: "#A1A1AA" }}>Process</a>
            <a href="#testimonials" style={{ color: "#A1A1AA" }}>Results</a>
            <a
              href="#contact-form"
              style={{ ...primaryButtonStyle, padding: "10px 20px" }}
              onMouseOver={buttonHoverOn}
              onMouseOut={buttonHoverOff}
            >
              {content.ctaPrimary}
            </a>
          </div>
        </div>
      </nav>

      <section data-aos="fade-up" style={{ minHeight: "100vh", display: "flex", alignItems: "center", ...heroBg }}>
        <div className="hero-orb" style={{ background: `radial-gradient(ellipse 800px 500px at 50% -100px, ${theme.accent}33, transparent)` }} />
        <div className="hero-orb hero-orb-2" style={{ background: `radial-gradient(ellipse 600px 400px at 20% 50%, ${theme.accentLight}1A, transparent)` }} />
        <div className="hero-orb hero-orb-3" style={{ background: `radial-gradient(ellipse 400px 300px at 80% 60%, ${theme.accent}0F, transparent)` }} />
        <div className="container" style={{ position: "relative", zIndex: 1, paddingTop: 60 }}>
          <div data-aos="fade-up" style={{ display: "inline-flex", gap: 8, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "8px 14px", marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: theme.accent, marginTop: 6 }} />
            <span style={{ color: "#A1A1AA", fontSize: 11, letterSpacing: "0.12em", fontWeight: 700 }}>{content.badge}</span>
          </div>
          <h1 data-aos="fade-up" style={{ fontFamily: "Plus Jakarta Sans", fontWeight: 900, fontSize: "clamp(44px,7vw,82px)", lineHeight: 1.02, margin: "0 0 20px", letterSpacing: "-0.03em" }}>
            {content.headline}
            <br />
            <span style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentLight})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{content.headlineAccent}</span>
          </h1>
          <p data-aos="fade-up" style={{ color: "#A1A1AA", fontSize: 20, maxWidth: 700, lineHeight: 1.7, fontWeight: 400 }}>{content.subheadline}</p>
          <div data-aos="fade-up" style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 30 }}>
            <a
              href="#contact-form"
              style={primaryButtonStyle}
              onMouseOver={buttonHoverOn}
              onMouseOut={buttonHoverOff}
            >
              {content.ctaPrimary}
              <ArrowRight color="#fff" />
            </a>
            <a
              href="#process"
              style={secondaryButtonStyle}
              onMouseOver={secondaryHoverOn}
              onMouseOut={secondaryHoverOff}
            >
              {content.ctaSecondary}
            </a>
          </div>
          <div data-aos="fade-up" style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 42 }}>
            <div style={{ display: "flex" }}>
              {["A", "M", "K"].map((x, i) => (
                <div key={x} style={{ width: 36, height: 36, marginLeft: i ? -8 : 0, borderRadius: "50%", display: "grid", placeItems: "center", border: `2px solid ${theme.bgPrimary}`, background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentLight})`, fontSize: 12, fontWeight: 700 }}>{x}</div>
              ))}
            </div>
            <div>
              <div style={{ marginBottom: 4 }}>⭐⭐⭐⭐⭐</div>
              <div style={{ color: "#A1A1AA", fontSize: 13 }}>{content.socialProof}</div>
            </div>
          </div>
        </div>
      </section>

      <section data-aos="fade-up" style={{ background: theme.bgSecondary, borderTop: `1px solid ${theme.cardBorder}`, borderBottom: `1px solid ${theme.cardBorder}`, padding: "64px 0" }}>
        <div className="container grid3">
          {content.stats.slice(0, 3).map((s, i) => (
            <div
              data-aos="fade-up"
              data-aos-delay={i * 100}
              key={s.label}
              style={{
                textAlign: "center",
                borderLeft: i > 0 ? `1px solid ${theme.cardBorder}` : "none",
                borderRight: i < 2 ? `1px solid ${theme.cardBorder}` : "none",
                padding: "0 20px",
              }}
            >
              <div style={{ color: theme.accent, fontFamily: "Plus Jakarta Sans", fontWeight: 900, letterSpacing: "-0.04em", fontSize: "clamp(56px, 8vw, 96px)", lineHeight: 1 }}>
                {s.number}
              </div>
              <div style={{ color: "#A1A1AA", fontSize: 14 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="benefits" data-aos="fade-up">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={sectionLabelStyle}>THE PROBLEM</div>
            <h2 style={{ fontFamily: "Plus Jakarta Sans", fontWeight: 900, letterSpacing: "-0.03em", fontSize: "clamp(32px,5vw,52px)", marginTop: 14 }}>{content.problemHeadline}</h2>
          </div>
          <div className="grid3">
            {content.problems.slice(0, 3).map((p, i) => (
              <div
                data-aos="fade-up"
                data-aos-delay={i * 100}
                key={p.title}
                onMouseOver={cardHoverOn}
                onMouseOut={cardHoverOff}
                style={{ background: theme.bgSecondary, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 28, transition: "all 0.25s ease" }}
              >
                <div style={{
                  width: 40, height: 40,
                  borderRadius: 8,
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 16,
                  fontSize: 18, color: "#EF4444", fontWeight: 700
                }}>✕</div>
                <h3 style={{ margin: "0 0 10px", fontFamily: "Plus Jakarta Sans", fontWeight: 900, letterSpacing: "-0.03em" }}>{p.title}</h3>
                <p style={{ margin: 0, color: "#A1A1AA", lineHeight: 1.65, fontWeight: 400 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section data-aos="fade-up" style={{ background: theme.bgSecondary }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={sectionLabelStyle}>THE SOLUTION</div>
            <h2 style={{ fontFamily: "Plus Jakarta Sans", fontWeight: 900, letterSpacing: "-0.03em", fontSize: "clamp(32px,5vw,52px)", marginTop: 14 }}>{content.solutionHeadline}</h2>
          </div>
          <div className="grid3">
            {content.features.slice(0, 3).map((f, i) => {
              return (
                <div
                  data-aos="fade-up"
                  data-aos-delay={i * 100}
                  key={f.title}
                  onMouseOver={cardHoverOn}
                  onMouseOut={cardHoverOff}
                  style={{ background: theme.bgPrimary, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 28, transition: "all 0.25s ease" }}
                >
                  <div style={{
                    width: 44, height: 44,
                    borderRadius: 8,
                    background: `${theme.accent}18`,
                    border: `1px solid ${theme.accent}35`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 20,
                    fontSize: 20, fontWeight: 800, color: theme.accent,
                    fontFamily: "monospace"
                  }}>
                    {({"Zap":"⚡︎","Target":"◎","Shield":"⊕","TrendingUp":"↗","Clock":"◷","Users":"⊛","Star":"✦","Check":"✓"} as Record<string,string>)[f.icon] ?? f.title.charAt(0).toUpperCase()}
                  </div>
                  <h3 style={{ margin: "0 0 10px", fontFamily: "Plus Jakarta Sans", fontWeight: 900, letterSpacing: "-0.03em" }}>{f.title}</h3>
                  <p style={{ margin: 0, color: "#A1A1AA", lineHeight: 1.65, fontWeight: 400 }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="process" data-aos="fade-up">
        <div className="container" style={{ maxWidth: 860 }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={sectionLabelStyle}>HOW IT WORKS</div>
            <h2 style={{ fontFamily: "Plus Jakarta Sans", fontWeight: 900, letterSpacing: "-0.03em", fontSize: "clamp(32px,5vw,52px)", marginTop: 14 }}>{content.processHeadline}</h2>
          </div>
          {content.steps.slice(0, 3).map((s, i) => (
            <div data-aos="fade-up" data-aos-delay={i * 100} key={s.title} style={{ display: "flex", gap: 18, paddingBottom: i < 2 ? 28 : 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: theme.accent, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, boxShadow: `0 0 20px ${theme.accent}66` }}>{i + 1}</div>
                {i < 2 ? <div style={{ width: 2, flex: 1, marginTop: 6, background: `repeating-linear-gradient(to bottom, ${theme.accent}, ${theme.accent} 6px, transparent 6px, transparent 12px)` }} /> : null}
              </div>
              <div style={{ paddingTop: 6 }}>
                <h3 style={{ margin: "0 0 8px", fontFamily: "Plus Jakarta Sans", fontWeight: 900, letterSpacing: "-0.03em" }}>{s.title}</h3>
                <p style={{ margin: 0, color: "#A1A1AA", fontWeight: 400 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="testimonials" data-aos="fade-up" style={{ background: theme.bgSecondary }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={sectionLabelStyle}>RESULTS</div>
            <h2 style={{ fontFamily: "Plus Jakarta Sans", fontWeight: 900, letterSpacing: "-0.03em", fontSize: "clamp(32px,5vw,52px)", marginTop: 14 }}>{content.testimonialsHeadline}</h2>
          </div>
          <div className="grid3">
            {content.testimonials.slice(0, 3).map((t, i) => (
              <div
                data-aos="fade-up"
                data-aos-delay={i * 100}
                key={t.name}
                onMouseOver={cardHoverOn}
                onMouseOut={cardHoverOff}
                style={{ background: theme.bgPrimary, border: `1px solid ${theme.cardBorder}`, borderLeft: `3px solid ${theme.accent}`, borderRadius: 12, padding: 28, transition: "all 0.25s ease" }}
              >
                <div style={{ marginBottom: 12, display: "flex", gap: 2 }}>
                  {Array.from({ length: 5 }).map((_, starIdx) => (
                    <span key={starIdx} style={{ color: "#F59E0B", fontSize: 14 }}>★</span>
                  ))}
                </div>
                <span style={{ display: "block", fontSize: 48, color: theme.accent, opacity: 0.4, lineHeight: 0.8, marginBottom: -16 }}>&quot;</span>
                <p style={{ color: "#FAFAFA", lineHeight: 1.7, fontStyle: "italic", margin: "0 0 20px", fontWeight: 400 }}>{t.text}</p>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentLight})`, display: "grid", placeItems: "center", fontWeight: 800 }}>{initials(t.name)}</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{t.name}</div>
                    <div style={{ color: "#A1A1AA", fontSize: 13 }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section data-aos="fade-up" style={{ background: `linear-gradient(135deg, ${theme.accent}1f 0%, ${theme.bgPrimary} 60%)` }}>
        <div className="container" style={{ textAlign: "center", maxWidth: 860 }}>
          <h2 style={{ fontFamily: "Plus Jakarta Sans", fontWeight: 900, letterSpacing: "-0.03em", fontSize: "clamp(36px,6vw,64px)", margin: "0 0 18px" }}>{content.ctaHeadline}</h2>
          <p style={{ color: "#A1A1AA", fontSize: 18, margin: "0 0 28px", fontWeight: 400 }}>{content.ctaSubtext}</p>
          <a href="#contact-form" style={{ ...primaryButtonStyle, padding: "16px 32px" }} onMouseOver={buttonHoverOn} onMouseOut={buttonHoverOff}>{content.ctaButton}<ArrowRight color="#fff" /></a>
        </div>
      </section>

      <section id="contact-form" data-aos="fade-up">
        <div className="container" style={{ maxWidth: 720 }}>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <h2 style={{ fontFamily: "Plus Jakarta Sans", fontWeight: 900, letterSpacing: "-0.03em", fontSize: "clamp(30px,5vw,46px)", margin: 0 }}>{content.formHeadline}</h2>
          </div>
          <form onSubmit={handleSubmit} style={{ background: theme.bgSecondary, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 30 }}>
            <div style={{ display: "grid", gap: 16 }}>
              <input value={name} onChange={(e) => setName(e.target.value)} required name="name" placeholder="Your name" style={{ width: "100%", background: theme.bgPrimary, border: "1px solid #1C1C22", color: "#FAFAFA", borderRadius: 10, padding: "13px 14px" }} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" name="email" placeholder="Email address" style={{ width: "100%", background: theme.bgPrimary, border: "1px solid #1C1C22", color: "#FAFAFA", borderRadius: 10, padding: "13px 14px" }} />
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} name="message" rows={5} placeholder="Tell me about your goals..." style={{ width: "100%", background: theme.bgPrimary, border: "1px solid #1C1C22", color: "#FAFAFA", borderRadius: 10, padding: "13px 14px", resize: "vertical" }} />
              <button
                disabled={loading}
                type="submit"
                style={{ ...primaryButtonStyle, width: "100%", padding: "16px", fontSize: 14, cursor: "pointer" }}
                onMouseOver={buttonHoverOn}
                onMouseOut={buttonHoverOff}
              >
                {loading ? "Sending..." : content.formButton}
              </button>
              {submitted ? <div id="success-msg" style={{ color: theme.accent, textAlign: "center", fontWeight: 600 }}>Message sent successfully.</div> : null}
            </div>
          </form>
        </div>
      </section>

      <footer data-aos="fade-up" style={{ padding: "36px 0", background: "#060608", borderTop: `1px solid ${theme.cardBorder}` }}>
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`, opacity: 0.3, marginBottom: 0 }} />
        <div className="container" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          <div style={{ fontFamily: "Plus Jakarta Sans", fontWeight: 800, letterSpacing: "-0.02em" }}>{content.brand}</div>
          <div style={{ color: "#52525B", fontSize: 13 }}>© 2026 {content.brand}. All rights reserved.</div>
          {showBrandWatermark ? (
            <a
              href="https://lacore.ai"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#A1A1AA",
                border: "1px solid #1C1C22",
                background: "#111116",
                borderRadius: 999,
                padding: "8px 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              ⚡ Built with LACORE
            </a>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
