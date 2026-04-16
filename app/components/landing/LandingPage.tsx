"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { NICHE_THEMES, STYLE_THEMES, type LandingContent, type LandingStyle } from "@/types/landing";
import { ChevronDown } from "lucide-react";
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
type LandingContentExtended = LandingContent & {
  sectionOrder?: string[];
  faqHeadline?: string;
  faq?: Array<{ question: string; answer: string }>;
  pricingHeadline?: string;
  pricing?: Array<{
    name: string;
    price: string;
    period?: string;
    description?: string;
    features?: string[];
    highlighted?: boolean;
    ctaLabel?: string;
  }>;
  video?: { url?: string; headline?: string; subheadline?: string };
  aboutHeadline?: string;
  about?: {
    name?: string;
    title?: string;
    bio?: string;
    photo?: string;
    highlights?: string[];
  };
  calendly?: {
    url?: string;
    headline?: string;
    subheadline?: string;
  };
};

export default function LandingPage({ content, slug, style, showBrandWatermark = true }: Props) {
  const extendedContent = content as LandingContentExtended;
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const theme =
    (style ? STYLE_THEMES[style] : null) ?? NICHE_THEMES[content.niche] ?? NICHE_THEMES.default;
  const fontHeading = theme.isDark
    ? (style === "dark-purple" || style === "dark-pink" ? "'Space Grotesk', 'Plus Jakarta Sans', sans-serif" : "'Plus Jakarta Sans', sans-serif")
    : (style === "warm-cream" ? "'Playfair Display', Georgia, serif" : "'DM Sans', 'Plus Jakarta Sans', sans-serif");

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

  const hexToRgb = (hex: string) => {
    const value = hex.replace("#", "");
    const normalized = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
    const n = Number.parseInt(normalized, 16);
    if (Number.isNaN(n)) return { r: 255, g: 255, b: 255 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };

  const getContrastColor = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? "#0A0A0D" : "#FFFFFF";
  };

  const primaryButtonTextColor = getContrastColor(theme.accent);
  const hasOptionalSection = (key: string) => {
    if (key === "about") return Boolean(extendedContent.about);
    if (key === "faq") return Array.isArray(extendedContent.faq) && extendedContent.faq.length > 0;
    if (key === "pricing") return Array.isArray(extendedContent.pricing) && extendedContent.pricing.length > 0;
    if (key === "video") return Boolean(extendedContent.video);
    if (key === "calendly") return Boolean(extendedContent.calendly);
    return false;
  };
  const sectionKeyWhitelist = ["hero", "features", "problems", "steps", "stats", "testimonials", "about", "faq", "pricing", "video", "calendly", "cta"] as const;
  const coreMiddleSections = ["stats", "problems", "features", "steps", "testimonials"] as const;
  const optionalMiddleSections = ["about", "faq", "pricing", "video", "calendly"] as const;
  const defaultMiddleSectionOrder = [...coreMiddleSections, ...optionalMiddleSections] as const;
  const requestedOrder = Array.isArray(extendedContent.sectionOrder)
    ? extendedContent.sectionOrder.filter((k): k is (typeof sectionKeyWhitelist)[number] => (sectionKeyWhitelist as readonly string[]).includes(k))
    : [];
  const requestedMiddle = requestedOrder.filter((k) => k !== "hero" && k !== "cta");
  const isRenderableMiddleSection = (key: (typeof defaultMiddleSectionOrder)[number]) =>
    (coreMiddleSections as readonly string[]).includes(key) || hasOptionalSection(key);
  const remainingDefault = defaultMiddleSectionOrder.filter((k) => !requestedMiddle.includes(k) && isRenderableMiddleSection(k));
  const middleSectionOrder = requestedMiddle.length > 0
    ? [...requestedMiddle.filter((k) => isRenderableMiddleSection(k)), ...remainingDefault]
    : defaultMiddleSectionOrder.filter((k) => isRenderableMiddleSection(k));
  const computedSectionOrder = ["hero", ...middleSectionOrder, "cta"];
  const getSectionOrder = (key: string) => {
    const idx = computedSectionOrder.indexOf(key);
    return idx >= 0 ? idx : computedSectionOrder.length + 1;
  };
  const contactFormOrder = getSectionOrder("cta") + 0.5; // always after cta

  const primaryButtonStyle = {
    ...buttonBaseStyle,
    letterSpacing: "0.05em",
    background: theme.accent,
    color: primaryButtonTextColor,
    padding: "14px 28px",
    border: "none",
  };

  const secondaryButtonStyle = {
    ...buttonBaseStyle,
    background: "transparent",
    color: theme.textPrimary,
    padding: "14px 28px",
    border: theme.isDark ? "1px solid rgba(255,255,255,0.15)" : `1px solid ${theme.accent}40`,
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

  const SectionDivider = ({ flip = false }: { flip?: boolean }) => (
    <div style={{
      height: 1,
      background: flip
        ? `linear-gradient(90deg, ${theme.accent}60, transparent, ${theme.accent}60)`
        : `linear-gradient(90deg, transparent, ${theme.accent}60, transparent)`,
      opacity: 0.5,
      margin: 0,
    }} />
  );

  const extractVideoEmbedUrl = (rawUrl?: string) => {
    const url = (rawUrl ?? "").trim();
    if (!url) return "";
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      if (host.includes("youtube.com")) {
        const id = u.searchParams.get("v");
        if (id) return `https://www.youtube.com/embed/${id}`;
        const parts = u.pathname.split("/").filter(Boolean);
        const maybeEmbed = parts[parts.length - 1];
        if (maybeEmbed) return `https://www.youtube.com/embed/${maybeEmbed}`;
      }
      if (host.includes("youtu.be")) {
        const id = u.pathname.split("/").filter(Boolean)[0];
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      if (host.includes("loom.com")) {
        const parts = u.pathname.split("/").filter(Boolean);
        const idx = parts.findIndex((p) => p === "share" || p === "embed");
        const id = idx >= 0 ? parts[idx + 1] : parts[parts.length - 1];
        if (id) return `https://www.loom.com/embed/${id}`;
      }
      if (host.includes("vimeo.com")) {
        const id = u.pathname.split("/").filter(Boolean)[0];
        if (id) return `https://player.vimeo.com/video/${id}`;
      }
      return url;
    } catch {
      return "";
    }
  };

  const extractCalendlyEmbedUrl = (rawUrl?: string) => {
    const url = (rawUrl ?? "").trim();
    if (!url) return "";
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      if (!host.includes("calendly.com") && !host.includes("cal.com")) return "";
      u.searchParams.set("embed_type", "Inline");
      u.searchParams.set("hide_landing_page_details", "1");
      u.searchParams.set("hide_event_type_details", "1");
      u.searchParams.set("hide_gdpr_banner", "1");
      return u.toString();
    } catch {
      return "";
    }
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
    <div style={{ background: theme.bgPrimary, color: theme.textPrimary, fontFamily: "Inter, sans-serif", fontWeight: 400, display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;0,800;0,900;1,700;1,800&family=DM+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        .container { width: min(1100px, 100% - 48px); margin: 0 auto; }
        section { position: relative; overflow: hidden; }
        .grid3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
        .hero-orb { position: absolute; inset: 0; pointer-events: none; z-index: 0; animation: lacore-float 8s ease-in-out infinite; }
        .hero-orb-2 { animation-delay: 1.2s; }
        .hero-orb-3 { animation-delay: 2.3s; }
        @keyframes lacore-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        [data-aos] { opacity: 1 !important; transform: none !important; }
        @media (max-width: 900px) { .grid3 { grid-template-columns: 1fr; } }
        @media (max-width: 768px) {
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
          background: theme.navBg,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="container" style={{ display: "flex", height: 80, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: fontHeading, fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>{content.brand}</div>
          <div className="hide-mobile" style={{ display: "flex", gap: 28, alignItems: "center" }}>
            <a href="#benefits" style={{ color: theme.textSecondary }}>Benefits</a>
            <a href="#process" style={{ color: theme.textSecondary }}>Process</a>
            <a href="#testimonials" style={{ color: theme.textSecondary }}>Results</a>
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

      <section className="py-12 md:py-[120px]" data-aos="fade-up" style={{ minHeight: "100vh", display: "flex", alignItems: "center", position: "relative", overflow: "hidden", order: getSectionOrder("hero"), ...heroBg }}>
        <div className="hero-orb" style={{ background: `radial-gradient(ellipse 800px 500px at 50% -100px, ${theme.accent}${theme.isDark ? "33" : "11"}, transparent)` }} />
        <div className="hero-orb hero-orb-2" style={{ background: `radial-gradient(ellipse 600px 400px at 20% 50%, ${theme.accentLight}${theme.isDark ? "1A" : "0D"}, transparent)` }} />
        <div className="hero-orb hero-orb-3" style={{ background: `radial-gradient(ellipse 400px 300px at 80% 60%, ${theme.accent}${theme.isDark ? "0F" : "08"}, transparent)` }} />
        <>
        <div className="container" style={{ position: "relative", zIndex: 1, paddingTop: 60 }}>
          <div data-aos="fade-up" style={{ display: "inline-flex", gap: 8, border: theme.isDark ? "1px solid rgba(255,255,255,0.12)" : `1px solid ${theme.accent}25`, borderRadius: 999, padding: "8px 14px", marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: theme.accent, marginTop: 6 }} />
            <span style={{ color: theme.textSecondary, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700 }}>{content.badge}</span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl" data-aos="fade-up" style={{ fontFamily: fontHeading, fontWeight: 900, lineHeight: 1.02, margin: "0 0 20px", letterSpacing: "-0.03em" }}>
            {content.headline}
            <br />
            <span style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentLight})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{content.headlineAccent}</span>
          </h1>
          <p data-aos="fade-up" style={{ color: theme.textSecondary, fontSize: 20, maxWidth: 700, lineHeight: 1.7, fontWeight: 400 }}>{content.subheadline}</p>
          <div data-aos="fade-up" style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 30 }}>
            <a
              href="#contact-form"
              style={primaryButtonStyle}
              onMouseOver={buttonHoverOn}
              onMouseOut={buttonHoverOff}
            >
              {content.ctaPrimary}
              <ArrowRight color={primaryButtonTextColor} />
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
                <div key={x} style={{ width: 36, height: 36, marginLeft: i ? -8 : 0, borderRadius: "50%", display: "grid", placeItems: "center", border: `2px solid ${theme.bgPrimary}`, background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentLight})`, fontSize: 12, fontWeight: 700, color: getContrastColor(theme.accent) }}>{x}</div>
              ))}
            </div>
            <div>
              <div style={{ marginBottom: 4 }}>⭐⭐⭐⭐⭐</div>
              <div style={{ color: theme.textSecondary, fontSize: 13 }}>{content.socialProof}</div>
            </div>
          </div>
        </div>
        <div data-aos="fade-left" className="hide-mobile" style={{
          position: "absolute",
          right: "-5%",
          top: "50%",
          transform: "translateY(-50%)",
          width: "420px",
          height: "420px",
          pointerEvents: "none",
          zIndex: 0,
          opacity: theme.isDark ? 0.15 : 0.08,
        }}>
          <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
            <circle cx="200" cy="200" r="160" stroke={theme.accent} strokeWidth="1" strokeDasharray="8 4" opacity="0.6"/>
            <circle cx="200" cy="200" r="120" stroke={theme.accent} strokeWidth="1" opacity="0.4"/>
            <circle cx="200" cy="200" r="80" stroke={theme.accent} strokeWidth="2" opacity="0.5"/>
            <circle cx="200" cy="200" r="40" fill={theme.accent} opacity="0.15"/>
            <circle cx="200" cy="200" r="20" fill={theme.accent} opacity="0.3"/>
            <line x1="40" y1="200" x2="360" y2="200" stroke={theme.accent} strokeWidth="0.5" opacity="0.3"/>
            <line x1="200" y1="40" x2="200" y2="360" stroke={theme.accent} strokeWidth="0.5" opacity="0.3"/>
            <line x1="87" y1="87" x2="313" y2="313" stroke={theme.accent} strokeWidth="0.5" opacity="0.2"/>
            <line x1="313" y1="87" x2="87" y2="313" stroke={theme.accent} strokeWidth="0.5" opacity="0.2"/>
            <circle cx="200" cy="40" r="4" fill={theme.accent} opacity="0.6"/>
            <circle cx="360" cy="200" r="4" fill={theme.accent} opacity="0.6"/>
            <circle cx="200" cy="360" r="4" fill={theme.accent} opacity="0.6"/>
            <circle cx="40" cy="200" r="4" fill={theme.accent} opacity="0.6"/>
            <circle cx="87" cy="87" r="3" fill={theme.accentLight} opacity="0.5"/>
            <circle cx="313" cy="87" r="3" fill={theme.accentLight} opacity="0.5"/>
            <circle cx="313" cy="313" r="3" fill={theme.accentLight} opacity="0.5"/>
            <circle cx="87" cy="313" r="3" fill={theme.accentLight} opacity="0.5"/>
          </svg>
        </div>
        </>
      </section>
      <SectionDivider />

      <section className="py-12 md:py-16" data-aos="fade-up" style={{ background: theme.bgSecondary, borderTop: `1px solid ${theme.cardBorder}`, borderBottom: `1px solid ${theme.cardBorder}`, position: "relative", overflow: "hidden", order: getSectionOrder("stats") }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse 600px 200px at 50% 50%, ${theme.accent}0A, transparent)`,
        }} />
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
              <div style={{ color: theme.accent, fontFamily: fontHeading, fontWeight: 900, letterSpacing: "-0.04em", fontSize: "clamp(56px, 8vw, 96px)", lineHeight: 1 }}>
                {s.number}
              </div>
              <div style={{ color: theme.textSecondary, fontSize: 14 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>
      <SectionDivider flip />

      <section className="py-12 md:py-[120px]" id="benefits" data-aos="fade-up" style={{ order: getSectionOrder("problems") }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={sectionLabelStyle}>THE PROBLEM</div>
            <h2 className="text-[28px] md:text-5xl" style={{ fontFamily: fontHeading, fontWeight: 900, letterSpacing: "-0.03em", marginTop: 14 }}>{content.problemHeadline}</h2>
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
                <h3 className="text-lg md:text-[22px]" style={{ margin: "0 0 10px", fontFamily: fontHeading, fontWeight: 900, letterSpacing: "-0.03em" }}>{p.title}</h3>
                <p style={{ margin: 0, color: theme.textSecondary, lineHeight: 1.65, fontWeight: 400 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <SectionDivider />

      <section className="py-12 md:py-[120px]" data-aos="fade-up" style={{ background: theme.bgSecondary, order: getSectionOrder("features") }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={sectionLabelStyle}>THE SOLUTION</div>
            <h2 className="text-[28px] md:text-5xl" style={{ fontFamily: fontHeading, fontWeight: 900, letterSpacing: "-0.03em", marginTop: 14 }}>{content.solutionHeadline}</h2>
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
                  style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 28, transition: "all 0.25s ease" }}
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
                  <h3 className="text-lg md:text-[22px]" style={{ margin: "0 0 10px", fontFamily: fontHeading, fontWeight: 900, letterSpacing: "-0.03em" }}>{f.title}</h3>
                  <p style={{ margin: 0, color: theme.textSecondary, lineHeight: 1.65, fontWeight: 400 }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <SectionDivider flip />

      <section className="py-12 md:py-[120px]" id="process" data-aos="fade-up" style={{ order: getSectionOrder("steps") }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={sectionLabelStyle}>HOW IT WORKS</div>
            <h2 className="text-[28px] md:text-5xl" style={{ fontFamily: fontHeading, fontWeight: 900, letterSpacing: "-0.03em", marginTop: 14 }}>{content.processHeadline}</h2>
          </div>
          {content.steps.slice(0, 3).map((s, i) => (
            <div data-aos="fade-up" data-aos-delay={i * 100} key={s.title} style={{ display: "flex", gap: 18, paddingBottom: i < 2 ? 28 : 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: theme.accent, color: primaryButtonTextColor, display: "grid", placeItems: "center", fontWeight: 800, boxShadow: `0 0 20px ${theme.accent}66` }}>{i + 1}</div>
                {i < 2 ? <div style={{ width: 2, flex: 1, marginTop: 6, background: `repeating-linear-gradient(to bottom, ${theme.accent}, ${theme.accent} 6px, transparent 6px, transparent 12px)` }} /> : null}
              </div>
              <div style={{ paddingTop: 6 }}>
                <h3 className="text-lg md:text-[22px]" style={{ margin: "0 0 8px", fontFamily: fontHeading, fontWeight: 900, letterSpacing: "-0.03em" }}>{s.title}</h3>
                <p style={{ margin: 0, color: theme.textSecondary, fontWeight: 400 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <SectionDivider />

      <section className="py-12 md:py-[120px]" id="testimonials" data-aos="fade-up" style={{ background: theme.bgSecondary, order: getSectionOrder("testimonials") }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={sectionLabelStyle}>RESULTS</div>
            <h2 className="text-[28px] md:text-5xl" style={{ fontFamily: fontHeading, fontWeight: 900, letterSpacing: "-0.03em", marginTop: 14 }}>{content.testimonialsHeadline}</h2>
          </div>
          {content.testimonials[0] ? (
            <div
              data-aos="fade-up"
              key={content.testimonials[0].name}
              onMouseOver={cardHoverOn}
              onMouseOut={cardHoverOff}
              style={{
                background: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                borderLeft: `4px solid ${theme.accent}`,
                borderRadius: 12,
                padding: "40px 48px",
                marginBottom: 24,
                transition: "all 0.25s ease",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{
                position: "absolute", top: 20, right: 32,
                fontSize: 80, color: theme.accent, opacity: 0.08,
                fontFamily: "Georgia, serif", lineHeight: 1,
                pointerEvents: "none",
              }}>&ldquo;</div>
              <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} style={{ color: "#F59E0B", fontSize: 16 }}>★</span>
                ))}
              </div>
              <p style={{
                color: theme.textPrimary,
                lineHeight: 1.8,
                fontStyle: "italic",
                fontSize: "clamp(16px, 2vw, 20px)",
                margin: "0 0 28px",
                fontWeight: 400,
                maxWidth: 700,
              }}>{content.testimonials[0].text}</p>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentLight})`,
                  display: "grid", placeItems: "center",
                  fontWeight: 800, fontSize: 18,
                  color: getContrastColor(theme.accent),
                }}>{initials(content.testimonials[0].name)}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{content.testimonials[0].name}</div>
                  <div style={{ color: theme.textSecondary, fontSize: 14 }}>{content.testimonials[0].role}</div>
                </div>
              </div>
            </div>
          ) : null}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {content.testimonials.slice(1, 3).map((t, i) => (
              <div
                data-aos="fade-up"
                data-aos-delay={i * 100}
                key={t.name}
                onMouseOver={cardHoverOn}
                onMouseOut={cardHoverOff}
                style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderLeft: `3px solid ${theme.accent}`, borderRadius: 12, padding: 28, transition: "all 0.25s ease" }}
              >
                <div style={{ marginBottom: 12, display: "flex", gap: 2 }}>
                  {Array.from({ length: 5 }).map((_, starIdx) => (
                    <span key={starIdx} style={{ color: "#F59E0B", fontSize: 14 }}>★</span>
                  ))}
                </div>
                <span style={{ display: "block", fontSize: 48, color: theme.accent, opacity: 0.4, lineHeight: 0.8, marginBottom: -16 }}>&quot;</span>
                <p style={{ color: theme.textPrimary, lineHeight: 1.7, fontStyle: "italic", margin: "0 0 20px", fontWeight: 400 }}>{t.text}</p>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentLight})`, display: "grid", placeItems: "center", fontWeight: 800, color: getContrastColor(theme.accent) }}>{initials(t.name)}</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{t.name}</div>
                    <div style={{ color: theme.textSecondary, fontSize: 13 }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <SectionDivider flip />

      <section className="py-12 md:py-[120px]" data-aos="fade-up" style={{ background: `linear-gradient(135deg, ${theme.accent}1f 0%, ${theme.bgPrimary} 60%)`, order: getSectionOrder("cta") }}>
        <div className="container" style={{ textAlign: "center", maxWidth: 860 }}>
          <h2 className="text-[28px] md:text-6xl" style={{ fontFamily: fontHeading, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 18px" }}>{content.ctaHeadline}</h2>
          <p style={{ color: theme.textSecondary, fontSize: 18, margin: "0 0 28px", fontWeight: 400 }}>{content.ctaSubtext}</p>
          <a href="#contact-form" style={{ ...primaryButtonStyle, padding: "16px 32px" }} onMouseOver={buttonHoverOn} onMouseOut={buttonHoverOff}>{content.ctaButton}<ArrowRight color={primaryButtonTextColor} /></a>
        </div>
      </section>
      {extendedContent.faq ? <SectionDivider /> : null}

      {extendedContent.faq ? (
        <section className="py-12 md:py-[120px]" data-aos="fade-up" style={{ background: theme.bgSecondary, order: getSectionOrder("faq") }}>
          <div className="container" style={{ maxWidth: 860 }}>
            <div style={{ textAlign: "center", marginBottom: 42 }}>
              <div style={sectionLabelStyle}>FAQ</div>
              <h2 className="text-[28px] md:text-5xl" style={{ fontFamily: fontHeading, fontWeight: 900, letterSpacing: "-0.03em", marginTop: 14 }}>
                {extendedContent.faqHeadline || "Frequently asked questions"}
              </h2>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              {extendedContent.faq.map((item, idx) => (
                <div
                  key={`${item.question}-${idx}`}
                  style={{
                    background: theme.cardBg,
                    border: `1px solid ${theme.cardBorder}`,
                    borderRadius: 12,
                    transition: "all 0.25s ease",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex((prev) => (prev === idx ? null : idx))}
                    style={{ width: "100%", background: "transparent", border: "none", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left", color: theme.textPrimary }}
                  >
                    <span className="text-lg md:text-[22px]" style={{ fontFamily: fontHeading, fontWeight: 800, letterSpacing: "-0.02em" }}>
                      {item.question}
                    </span>
                    <ChevronDown
                      size={18}
                      style={{
                        transition: "transform 220ms ease",
                        transform: openFaqIndex === idx ? "rotate(180deg)" : "rotate(0deg)",
                        opacity: 0.8
                      }}
                    />
                  </button>
                  <div
                    style={{
                      maxHeight: openFaqIndex === idx ? 240 : 0,
                      overflow: "hidden",
                      transition: "max-height 280ms ease"
                    }}
                  >
                    <p style={{ margin: 0, color: theme.textSecondary, lineHeight: 1.65, padding: "0 22px 18px 34px" }}>
                      {item.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      {extendedContent.pricing ? <SectionDivider flip /> : null}

      {extendedContent.pricing ? (
        <section className="py-12 md:py-[120px]" data-aos="fade-up" style={{ order: getSectionOrder("pricing") }}>
          <div className="container">
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={sectionLabelStyle}>PRICING</div>
              <h2 className="text-[28px] md:text-5xl" style={{ fontFamily: fontHeading, fontWeight: 900, letterSpacing: "-0.03em", marginTop: 14 }}>
                {extendedContent.pricingHeadline || "Choose your plan"}
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
              {extendedContent.pricing.map((tier, idx) => {
                const highlighted = !!tier.highlighted;
                return (
                  <div
                    key={`${tier.name}-${idx}`}
                    onMouseOver={cardHoverOn}
                    onMouseOut={cardHoverOff}
                    style={{
                      background: highlighted ? `${theme.accent}1A` : theme.cardBg,
                      border: highlighted ? `1px solid ${theme.accent}` : `1px solid ${theme.cardBorder}`,
                      borderRadius: 12,
                      padding: 24,
                      transition: "all 0.25s ease",
                      position: "relative",
                    }}
                  >
                    {highlighted ? (
                      <div style={{ position: "absolute", top: 12, right: 12, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: theme.accent, fontWeight: 700 }}>
                        Popular
                      </div>
                    ) : null}
                    <h3 className="text-lg md:text-xl" style={{ margin: "0 0 8px", fontFamily: fontHeading, fontWeight: 800, letterSpacing: "-0.02em" }}>{tier.name}</h3>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
                      <span style={{ fontFamily: fontHeading, fontWeight: 900, fontSize: 34, letterSpacing: "-0.03em", color: theme.textPrimary }}>{tier.price}</span>
                      {tier.period ? <span style={{ color: theme.textSecondary, fontSize: 13 }}>{tier.period}</span> : null}
                    </div>
                    {tier.description ? <p style={{ margin: "0 0 16px", color: theme.textSecondary, lineHeight: 1.6 }}>{tier.description}</p> : null}
                    <ul style={{ margin: "0 0 18px", paddingLeft: 18, color: theme.textSecondary, lineHeight: 1.7 }}>
                      {(tier.features ?? []).map((feature, fIdx) => <li key={`${feature}-${fIdx}`}>{feature}</li>)}
                    </ul>
                    <a
                      href="#contact-form"
                      style={{
                        ...buttonBaseStyle,
                        width: "100%",
                        padding: "12px 14px",
                        background: highlighted ? theme.accent : "transparent",
                        color: highlighted ? primaryButtonTextColor : theme.textPrimary,
                        border: highlighted ? "none" : `1px solid ${theme.cardBorder}`,
                      }}
                    >
                      {tier.ctaLabel || "Get started"}
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}
      {extendedContent.video ? <SectionDivider /> : null}

      {extendedContent.video ? (
        <section className="py-12 md:py-[120px]" data-aos="fade-up" style={{ background: theme.bgSecondary, order: getSectionOrder("video") }}>
          <div className="container" style={{ maxWidth: 900 }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={sectionLabelStyle}>VIDEO</div>
              <h2 className="text-[28px] md:text-5xl" style={{ fontFamily: fontHeading, fontWeight: 900, letterSpacing: "-0.03em", marginTop: 14 }}>
                {extendedContent.video.headline || "Watch the walkthrough"}
              </h2>
              {extendedContent.video.subheadline ? (
                <p style={{ margin: "10px auto 0", color: theme.textSecondary, maxWidth: 680, lineHeight: 1.65 }}>
                  {extendedContent.video.subheadline}
                </p>
              ) : null}
            </div>
            {extractVideoEmbedUrl(extendedContent.video.url) ? (
              <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${theme.cardBorder}`, background: theme.cardBg }}>
                <iframe
                  src={extractVideoEmbedUrl(extendedContent.video.url)}
                  title="Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ width: "100%", height: "min(56vw, 460px)", border: "none", display: "block" }}
                />
              </div>
            ) : (
              <div style={{ borderRadius: 12, border: `1px dashed ${theme.cardBorder}`, background: theme.cardBg, padding: "48px 24px", textAlign: "center", color: theme.textSecondary }}>
                Add your video URL in the editor
              </div>
            )}
          </div>
        </section>
      ) : null}
      {extendedContent.about ? <SectionDivider flip /> : null}

      {extendedContent.about ? (
        <section className="py-12 md:py-[120px]" data-aos="fade-up" style={{ order: getSectionOrder("about") }}>
          <div className="container" style={{ maxWidth: 980 }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={sectionLabelStyle}>ABOUT</div>
              <h2 className="text-[28px] md:text-5xl" style={{ fontFamily: fontHeading, fontWeight: 900, letterSpacing: "-0.03em", marginTop: 14 }}>
                {extendedContent.aboutHeadline || "Meet the expert"}
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 280px) minmax(0, 1fr)", gap: 28, alignItems: "start" }}>
              <div
                style={{
                  borderRadius: 12,
                  border: `1px solid ${theme.cardBorder}`,
                  background: theme.cardBg,
                  minHeight: 280,
                  display: "grid",
                  placeItems: "center",
                  overflow: "hidden"
                }}
              >
                {extendedContent.about.photo ? (
                  <img
                    src={extendedContent.about.photo}
                    alt={extendedContent.about.name || "About photo"}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div style={{
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    fontFamily: fontHeading,
                    fontWeight: 900,
                    fontSize: 34,
                    color: getContrastColor(theme.accent),
                    background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentLight})`
                  }}>
                    {initials(extendedContent.about.name || extendedContent.brand || "Lacore")}
                  </div>
                )}
              </div>
              <div
                style={{
                  borderRadius: 12,
                  border: `1px solid ${theme.cardBorder}`,
                  background: theme.cardBg,
                  padding: 24
                }}
              >
                <h3 className="text-lg md:text-[30px]" style={{ margin: "0 0 6px", fontFamily: fontHeading, fontWeight: 900, letterSpacing: "-0.03em" }}>
                  {extendedContent.about.name || extendedContent.brand}
                </h3>
                <p style={{ margin: "0 0 14px", color: theme.textSecondary, fontWeight: 600 }}>
                  {extendedContent.about.title || "Founder"}
                </p>
                <p style={{ margin: "0 0 18px", color: theme.textSecondary, lineHeight: 1.75 }}>
                  {extendedContent.about.bio}
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {(extendedContent.about.highlights ?? []).map((item, i) => (
                    <span
                      key={`${item}-${i}`}
                      style={{
                        borderRadius: 999,
                        border: `1px solid ${theme.accent}55`,
                        background: `${theme.accent}16`,
                        color: theme.textPrimary,
                        fontSize: 12,
                        padding: "8px 12px"
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
      {extendedContent.calendly ? <SectionDivider /> : null}

      {extendedContent.calendly ? (
        <section className="py-12 md:py-[120px]" data-aos="fade-up" style={{ background: theme.bgSecondary, order: getSectionOrder("calendly") }}>
          <div className="container" style={{ maxWidth: 900 }}>
            <div style={{ textAlign: "center", marginBottom: 26 }}>
              <div style={sectionLabelStyle}>BOOKING</div>
              <h2 className="text-[28px] md:text-5xl" style={{ fontFamily: fontHeading, fontWeight: 900, letterSpacing: "-0.03em", marginTop: 14 }}>
                {extendedContent.calendly.headline || "Book a call"}
              </h2>
              {extendedContent.calendly.subheadline ? (
                <p style={{ margin: "10px auto 0", color: theme.textSecondary, maxWidth: 680, lineHeight: 1.65 }}>
                  {extendedContent.calendly.subheadline}
                </p>
              ) : null}
            </div>
            {extractCalendlyEmbedUrl(extendedContent.calendly.url) ? (
              <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${theme.cardBorder}`, background: theme.cardBg }}>
                <iframe
                  src={extractCalendlyEmbedUrl(extendedContent.calendly.url)}
                  title="Calendly booking"
                  style={{ width: "100%", height: 650, border: "none", display: "block" }}
                />
              </div>
            ) : (
              <div style={{ borderRadius: 12, border: `1px dashed ${theme.cardBorder}`, background: theme.cardBg, padding: "16px 18px", textAlign: "center", color: theme.textSecondary, maxHeight: 80, display: "grid", placeItems: "center", gap: 4 }}>
                <div style={{ opacity: 0.7, fontSize: 14 }}>📅</div>
                <div>Add your Calendly link in the editor</div>
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section className="py-12 md:py-[120px]" id="contact-form" data-aos="fade-up" style={{ order: contactFormOrder }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <h2 style={{ fontFamily: fontHeading, fontWeight: 900, letterSpacing: "-0.03em", fontSize: "clamp(30px,5vw,46px)", margin: 0 }}>{content.formHeadline}</h2>
          </div>
          <form onSubmit={handleSubmit} style={{ background: theme.bgSecondary, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 30 }}>
            <div style={{ display: "grid", gap: 16 }}>
              <input value={name} onChange={(e) => setName(e.target.value)} required name="name" placeholder="Your name" style={{ width: "100%", background: theme.bgPrimary, border: `1px solid ${theme.cardBorder}`, color: theme.textPrimary, borderRadius: 10, padding: "13px 14px" }} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" name="email" placeholder="Email address" style={{ width: "100%", background: theme.bgPrimary, border: `1px solid ${theme.cardBorder}`, color: theme.textPrimary, borderRadius: 10, padding: "13px 14px" }} />
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} name="message" rows={5} placeholder="Tell me about your goals..." style={{ width: "100%", background: theme.bgPrimary, border: `1px solid ${theme.cardBorder}`, color: theme.textPrimary, borderRadius: 10, padding: "13px 14px", resize: "vertical" }} />
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

      <footer data-aos="fade-up" style={{ padding: "36px 0", background: theme.isDark ? "#060608" : theme.bgSecondary, borderTop: `1px solid ${theme.cardBorder}` }}>
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`, opacity: 0.3, marginBottom: 0 }} />
        <div className="container" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          <div style={{ fontFamily: fontHeading, fontWeight: 800, letterSpacing: "-0.02em" }}>{content.brand}</div>
          <div style={{ color: theme.textMuted, fontSize: 13 }}>© 2026 {content.brand}. All rights reserved.</div>
        </div>
        {showBrandWatermark ? (
          <div className="container" style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
            <a
              href="https://lacore.ai"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: theme.textSecondary,
                border: `1px solid ${theme.isDark ? "#1C1C22" : theme.cardBorder}`,
                background: theme.isDark ? "#111116" : theme.bgSecondary,
                borderRadius: 999,
                padding: "8px 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                opacity: 0.85
              }}
            >
              ⚡ Built with LACORE
            </a>
          </div>
        ) : null}
      </footer>
    </div>
  );
}


