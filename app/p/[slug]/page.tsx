"use client";

import { Component, type CSSProperties, type ErrorInfo, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { jsxSourceToCompiledScript } from "@/lib/compileLandingJsx";
import LandingPage from "@/app/components/landing/LandingPage";
import { PublicTestimonialsSection } from "@/components/landing/PublicTestimonialsSection";
import type { LandingContent, LandingStyle } from "@/types/landing";

const FRIENDLY_COMPILE_MESSAGE =
  "I had trouble with that change. The page wasn't updated. Try rephrasing your request or be more specific about what you want to change.";

type PublicStripeSettings = {
  publishable_key: string;
  price_id: string | null;
  payment_type: string;
  button_text: string;
  checkout_ready: boolean;
};

/** Opens external links in a new tab inside srcDoc iframes so parent Next.js route is not navigated. */
const IFRAME_LINK_ISOLATION_SCRIPT = `<script>
(function() {
  document.addEventListener('click', function(e) {
    var target = e.target.closest('a');
    if (!target) return;
    var href = target.getAttribute('href');
    if (!href) return;
    if (href.startsWith('#')) return;
    e.preventDefault();
    e.stopPropagation();
    window.open(href, '_blank', 'noopener,noreferrer');
  }, true);
})();
</script>`;

function injectIframeLinkIsolationScript(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return html;
  if (/<\/head>/i.test(trimmed)) {
    return trimmed.replace(/<\/head>/i, `${IFRAME_LINK_ISOLATION_SCRIPT}</head>`);
  }
  if (/<\/body>/i.test(trimmed)) {
    return trimmed.replace(/<\/body>/i, `${IFRAME_LINK_ISOLATION_SCRIPT}</body>`);
  }
  return `${trimmed}${IFRAME_LINK_ISOLATION_SCRIPT}`;
}

function buildLandingIframeSrcDoc(compiledJs: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<script>if(typeof lockdown!=="undefined"){try{lockdown({errorTaming:"unsafe",consoleTaming:"unsafe",overrideTaming:"severe"});}catch(e){}}</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@700;800;900&display=swap" rel="stylesheet">
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
${IFRAME_LINK_ISOLATION_SCRIPT}
</head>
<body style="margin:0;padding:0;overflow-x:hidden;">
<div id="root"></div>
<script>
const useState = React.useState;
const useEffect = React.useEffect;
const useRef = React.useRef;
const useCallback = React.useCallback;
const useMemo = React.useMemo;
const useReducer = React.useReducer;
const useContext = React.useContext;
const createContext = React.createContext;
const Fragment = React.Fragment;
${compiledJs}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(LandingPage));
</script>
</body>
</html>`;
}

/** Preview runs only inside srcDoc iframe (UMD React), not in the Next.js tree — avoids dual React #425. */
function LiveLandingView({ jsxSource, height }: { jsxSource: string; height: string }) {
  const [srcDoc, setSrcDoc] = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);

  useEffect(() => {
    setCompileError(null);
    setSrcDoc(null);
    try {
      const compiledJs = jsxSourceToCompiledScript(jsxSource);
      setSrcDoc(buildLandingIframeSrcDoc(compiledJs));
    } catch {
      setCompileError(FRIENDLY_COMPILE_MESSAGE);
    }
  }, [jsxSource]);

  if (compileError) {
    return <div>{FRIENDLY_COMPILE_MESSAGE}</div>;
  }

  if (!srcDoc) {
    return <div style={{ width: "100%", height, boxSizing: "border-box" }} aria-busy="true" />;
  }

  return (
    <iframe
      srcDoc={srcDoc}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      style={{ width: "100%", height, border: "none", display: "block" }}
    />
  );
}

type LandingErrorBoundaryState = { error: Error | null };

class PublicLandingPageErrorBoundary extends Component<
  { children: ReactNode },
  LandingErrorBoundaryState
> {
  state: LandingErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): LandingErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[p/[slug]] render error:", error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const { message, stack } = this.state.error;
      return (
        <div
          style={{
            padding: 24,
            fontFamily: "system-ui, sans-serif",
            maxWidth: 720,
            margin: "0 auto",
            color: "#e5e5e5",
            background: "#0a0a0a",
            minHeight: "100vh",
            boxSizing: "border-box"
          }}
        >
          <h1 style={{ color: "#f87171", fontSize: 20, margin: "0 0 16px" }}>Landing page render error</h1>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "#a3a3a3" }}>{message}</p>
          {stack ? (
            <pre
              style={{
                margin: 0,
                padding: 16,
                background: "#171717",
                borderRadius: 8,
                fontSize: 12,
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                border: "1px solid #262626"
              }}
            >
              {stack}
            </pre>
          ) : null}
        </div>
      );
    }
    return this.props.children;
  }
}

function PublicLandingPageContent() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const editMode = searchParams.get("edit") === "true";
  const embedPreview = searchParams.get("embed") === "1";
  const slug = params.slug;

  const [html, setHtml] = useState("");
  const [jsxContent, setJsxContent] = useState("");
  const [jsonContent, setJsonContent] = useState<LandingContent | null>(null);
  const [landingStyle, setLandingStyle] = useState<string>("dark-indigo");
  const [loading, setLoading] = useState(true);
  const [showPromo, setShowPromo] = useState(false);
  const [publicStripe, setPublicStripe] = useState<PublicStripeSettings | null>(null);
  const [stripePayLoading, setStripePayLoading] = useState(false);
  const [ownerPlan, setOwnerPlan] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const showFreeWatermark = (ownerPlan ?? "free") === "free";
  const showPublicBrandUi = showFreeWatermark && !embedPreview;
  const brandFabStyle: CSSProperties = {
    position: "fixed",
    bottom: isMobile ? 78 : 20,
    right: isMobile ? 12 : 20,
    zIndex: 9998,
    border: "1px solid var(--accent)",
    background: "color-mix(in srgb, var(--bg-primary) 92%, transparent)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    color: "var(--accent)",
    borderRadius: 4,
    padding: "8px 14px",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    fontSize: 9,
    letterSpacing: "0.08em",
    cursor: "pointer",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
  };
  const checkoutFabStyle: CSSProperties = {
    position: "fixed",
    bottom: 20,
    left: isMobile ? 12 : 20,
    right: isMobile ? 12 : undefined,
    zIndex: 9999,
    border: "none",
    background: "var(--accent)",
    color: "var(--on-accent, #000)",
    borderRadius: 6,
    padding: "14px 22px",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: "0.06em",
    boxShadow: "0 12px 40px rgba(0,0,0,0.35)"
  };

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    void fetch(`/api/public/landing-owner-plan?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((j: { plan?: string }) => {
        if (!cancelled) setOwnerPlan(typeof j.plan === "string" && j.plan.length > 0 ? j.plan : "free");
      })
      .catch(() => {
        if (!cancelled) setOwnerPlan("free");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("lacore-theme") ?? "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const useLiveReact = Boolean(jsxContent.trim());

  const htmlSrcDoc = useMemo(() => injectIframeLinkIsolationScript(html), [html]);

  const fetchHtml = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("landing_pages")
      .select("html_content, jsx_content, json_content, style")
      .eq("slug", slug)
      .single();
    const row = data as {
      html_content: string | null;
      jsx_content: string | null;
      json_content: LandingContent | null;
      style?: string | null;
    } | null;
    setHtml(row?.html_content ?? "");
    setJsxContent(row?.jsx_content ?? "");
    setJsonContent(row?.json_content ?? null);
    setLandingStyle(row?.style ?? "dark-indigo");
    setLoading(false);
    if (!editMode && !embedPreview && !error && row) {
      void Promise.resolve(
        supabase.rpc("increment_landing_views", { page_slug: slug } as never)
      ).catch(() => {
        /* ignore RPC errors (e.g. migration not applied yet) */
      });
    }
  }, [slug, editMode, embedPreview]);

  useEffect(() => {
    void fetchHtml();
  }, [fetchHtml]);

  useEffect(() => {
    if (!editMode || !slug) return;
    let cancelled = false;
    void (async () => {
      const supabase = getSupabaseClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.user) router.replace("/dashboard/landing");
      else router.replace(`/p/${slug}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [editMode, slug, router]);

  useEffect(() => {
    if (editMode || !slug) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/stripe/settings?slug=${encodeURIComponent(slug)}`);
        const json = (await res.json()) as { stripe: PublicStripeSettings | null };
        if (!cancelled) setPublicStripe(json.stripe);
      } catch {
        if (!cancelled) setPublicStripe(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, editMode]);



  async function handleStripeCheckout() {
    if (!slug || stripePayLoading || !publicStripe?.checkout_ready) return;
    setStripePayLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug })
      });
      const data = (await res.json()) as { checkout_url?: string; error?: string };
      if (!res.ok || !data.checkout_url) {
        window.alert(data.error ?? "Could not start checkout.");
        return;
      }
      window.location.href = data.checkout_url;
    } finally {
      setStripePayLoading(false);
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
        background: "color-mix(in srgb, var(--bg-primary) 96%, transparent)",
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
          background: "var(--bg-primary)",
          border: "1px solid var(--border-primary)",
          padding: "48px 40px 40px",
          boxShadow: "0 0 0 1px rgba(99,102,241,0.08), 0 24px 80px rgba(0,0,0,0.55)"
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
            color: "var(--accent)",
            fontSize: 28,
            lineHeight: 1,
            cursor: "pointer",
            padding: 4,
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
          }}
        >
          ×
        </button>

        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            fontSize: 10,
            letterSpacing: "4px",
            color: "var(--accent)",
            textTransform: "uppercase"
          }}
        >
          BUILT WITH
        </p>
        <h2
          id="lacore-promo-title"
          style={{
            margin: "12px 0 0",
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            fontWeight: 800,
            fontSize: "clamp(72px, 22vw, 120px)",
            lineHeight: 0.9,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em"
          }}
        >
          LACORE
        </h2>
        <p
          style={{
            margin: "8px 0 0",
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif", fontWeight: 800, letterSpacing: "-0.02em",
            fontSize: "clamp(32px, 8vw, 48px)",
            lineHeight: 0.95,
            color: "var(--accent)"
          }}
        >
          From idea to first client.
        </p>
        <p
          style={{
            margin: "20px 0 0",
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            fontSize: 14,
            lineHeight: 1.65,
            color: "var(--text-secondary)"
          }}
        >
          One sentence. 60 minutes. A working sales machine.
        </p>
        <div
          style={{
            marginTop: 28,
            height: 1,
            background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
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
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif", fontWeight: 800, letterSpacing: "-0.02em",
                fontSize: 42,
                lineHeight: 1,
                color: "var(--text-primary)"
              }}
            >
              60 min
            </p>
            <p
              style={{
                margin: "10px 0 0",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                fontSize: 11,
                letterSpacing: "0.06em",
                color: "var(--text-muted)",
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
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif", fontWeight: 800, letterSpacing: "-0.02em",
                fontSize: 42,
                lineHeight: 1,
                color: "var(--accent)"
              }}
            >
              0
            </p>
            <p
              style={{
                margin: "10px 0 0",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                fontSize: 11,
                letterSpacing: "0.06em",
                color: "var(--text-muted)",
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
            background: "var(--accent)",
            color: "var(--on-accent)",
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            fontWeight: 800,
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
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            fontSize: 11,
            color: "var(--text-muted)",
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
                background: "var(--bg-primary)",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
              }}
            >
              Loading page...
            </div>
          ) : jsonContent ? (
            <>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <LandingPage
                  content={jsonContent}
                  slug={slug}
                  showBrandWatermark={showPublicBrandUi}
                  style={landingStyle as LandingStyle}
                />
                <PublicTestimonialsSection slug={slug} />
              </div>
              {showPublicBrandUi ? (
                <button
                  type="button"
                  onClick={() => setShowPromo(true)}
                  style={brandFabStyle}
                >
                  ⚡ Built with LACORE
                </button>
              ) : null}
              {publicStripe?.checkout_ready ? (
                <button
                  type="button"
                  onClick={() => void handleStripeCheckout()}
                  disabled={stripePayLoading}
                  style={{
                    ...checkoutFabStyle,
                    cursor: stripePayLoading ? "wait" : "pointer",
                    opacity: stripePayLoading ? 0.85 : 1
                  }}
                >
                  {stripePayLoading ? "…" : publicStripe.button_text}
                </button>
              ) : null}
            </>
          ) : useLiveReact ? (
            <>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ width: "100%", height: "100vh", flexShrink: 0 }}>
                  <LiveLandingView
                    jsxSource={jsxContent}
                    height="100vh"
                    key={jsxContent.slice(0, 120) + jsxContent.length}
                  />
                </div>
                <PublicTestimonialsSection slug={slug} />
              </div>
              {showPublicBrandUi ? (
                <button
                  type="button"
                  onClick={() => setShowPromo(true)}
                  style={brandFabStyle}
                >
                  ⚡ Built with LACORE
                </button>
              ) : null}
              {publicStripe?.checkout_ready ? (
                <button
                  type="button"
                  onClick={() => void handleStripeCheckout()}
                  disabled={stripePayLoading}
                  style={{
                    ...checkoutFabStyle,
                    cursor: stripePayLoading ? "wait" : "pointer",
                    opacity: stripePayLoading ? 0.85 : 1
                  }}
                >
                  {stripePayLoading ? "…" : publicStripe.button_text}
                </button>
              ) : null}
            </>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <iframe
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  srcDoc={htmlSrcDoc}
                  title="Landing page preview"
                  style={{
                    width: "100%",
                    height: "100vh",
                    minHeight: "100vh",
                    border: "none",
                    display: "block",
                    flexShrink: 0
                  }}
                />
                <PublicTestimonialsSection slug={slug} />
              </div>
              {showPublicBrandUi ? (
                <button
                  type="button"
                  onClick={() => setShowPromo(true)}
                  style={brandFabStyle}
                >
                  ⚡ Built with LACORE
                </button>
              ) : null}
              {publicStripe?.checkout_ready ? (
                <button
                  type="button"
                  onClick={() => void handleStripeCheckout()}
                  disabled={stripePayLoading}
                  style={{
                    ...checkoutFabStyle,
                    cursor: stripePayLoading ? "wait" : "pointer",
                    opacity: stripePayLoading ? 0.85 : 1
                  }}
                >
                  {stripePayLoading ? "…" : publicStripe.button_text}
                </button>
              ) : null}
            </>
          )}
        </main>
        {promoModal}
      </>
    );
  }
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#07080F",
        color: "#71717A",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        fontSize: 14
      }}
    >
      Redirecting…
    </div>
  );
}

export default function PublicLandingPage() {
  return (
    <PublicLandingPageErrorBoundary>
      <PublicLandingPageContent />
    </PublicLandingPageErrorBoundary>
  );
}
