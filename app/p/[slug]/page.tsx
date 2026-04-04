"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { jsxSourceToCompiledScript } from "@/lib/compileLandingJsx";

type ChatMessage = { role: "user" | "assistant"; text: string; time?: string };

const FRIENDLY_COMPILE_MESSAGE =
  "I had trouble with that change. The page wasn't updated. Try rephrasing your request or be more specific about what you want to change.";

const REGENERATE_GOAL_OPTIONS = [
  "📞 Book a call",
  "💳 Buy a package",
  "✉️ Send a message",
  "📋 Join a waitlist"
] as const;

const REGENERATE_VIBE_OPTIONS = [
  "💼 Professional & trustworthy",
  "⚡ Bold & energetic",
  "💎 Luxury & premium",
  "🤝 Warm & approachable"
] as const;

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
      sandbox="allow-scripts allow-same-origin"
      style={{ width: "100%", height, border: "none", display: "block" }}
    />
  );
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
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regenPrimaryGoals, setRegenPrimaryGoals] = useState<string[]>([]);
  const [regenSiteVibe, setRegenSiteVibe] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("lacore-theme") ?? "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const pageUrl = useMemo(() => `https://www.lacore.ai/p/${slug}`, [slug]);

  const updateStatusMessages = useMemo(
    () => [
      "Reading your current page...",
      "Planning the changes...",
      "Writing new component...",
      "Compiling..."
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
    }, 3000);
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

  function openRegenerateModal() {
    setRegenError(null);
    setRegenPrimaryGoals([]);
    setRegenSiteVibe("");
    setShowRegenerateModal(true);
  }

  async function handleRegenerateConfirm() {
    if (regenPrimaryGoals.length === 0 || !regenSiteVibe.trim()) return;
    setRegenError(null);
    setRegenerating(true);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.access_token || !session.user.email) {
        throw new Error("Sign in required to regenerate.");
      }

      const { data: offerRow, error: offerErr } = await supabase
        .from("offers")
        .select("offer, audience, pricing, positioning, headline")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (offerErr || !offerRow) {
        throw new Error("No offer found. Add your offer on the dashboard first.");
      }

      const offerPayload = offerRow as {
        offer: string;
        audience: string;
        pricing: string;
        positioning: string;
        headline: string;
      };

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase configuration.");
      }

      const email = session.user.email;
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-landing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseAnonKey
        },
        body: JSON.stringify({
          ...offerPayload,
          userName: email.split("@")[0],
          userEmail: email,
          primaryGoal: regenPrimaryGoals.join(", "),
          siteVibe: regenSiteVibe
        })
      });

      const text = await response.text();
      let result: { success?: boolean; error?: string; slug?: string };
      try {
        result = JSON.parse(text) as { success?: boolean; error?: string; slug?: string };
      } catch {
        throw new Error("Server error: " + text.slice(0, 120));
      }
      if (!response.ok || !result?.success) {
        throw new Error(typeof result?.error === "string" ? result.error : "Regeneration failed.");
      }

      setShowRegenerateModal(false);
      setJsxContent("");
      await fetchHtml();
      setPreviewKey((k) => k + 1);
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : "Regeneration failed.");
    } finally {
      setRegenerating(false);
    }
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

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
      const editUrl = useLiveReact
        ? "/api/edit-landing"
        : `${supabaseUrl}/functions/v1/edit-landing`;

      if (!useLiveReact && (!supabaseUrl || !supabaseAnonKey)) {
        throw new Error("Missing Supabase configuration.");
      }

      const response = await fetch(editUrl, {
        method: "POST",
        headers: useLiveReact
          ? {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            }
          : {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              apikey: supabaseAnonKey,
            },
        body: JSON.stringify(bodyPayload),
      });
      const text = await response.text();
      let result: { success?: boolean; error?: string; jsx?: string; html?: string };
      try {
        result = JSON.parse(text) as { success?: boolean; error?: string; jsx?: string; html?: string };
      } catch {
        throw new Error("Server error: " + text.slice(0, 150));
      }
      if (!response.ok || !result?.success) {
        const apiErr = typeof result?.error === "string" ? result.error : "Failed to update page.";
        throw new Error(apiErr);
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
      const raw = err instanceof Error ? err.message : "Failed to update page.";
      const compileLike = /compile|syntax|invalid jsx|landing component|failed to compile/i.test(raw);
      const message = compileLike ? FRIENDLY_COMPILE_MESSAGE : raw;
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

  const regenerateModal = showRegenerateModal && (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10001,
        background: "color-mix(in srgb, var(--bg-primary) 90%, transparent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          border: "1px solid var(--border-primary)",
          background: "var(--bg-primary)",
          padding: 20,
          position: "relative"
        }}
      >
        {regenerating ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "color-mix(in srgb, var(--bg-primary) 82%, transparent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2,
              borderRadius: 0
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                fontSize: 12,
                color: "var(--accent)",
                textAlign: "center",
                padding: "0 16px"
              }}
            >
              Generating your landing page...
            </p>
          </div>
        ) : null}
        <h3
          style={{
            margin: 0,
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif", fontWeight: 800, letterSpacing: "-0.02em",
            fontSize: 36,
            color: "var(--text-primary)",
            lineHeight: 1
          }}
        >
          REGENERATE LANDING
        </h3>
        <p
          style={{
            margin: "8px 0 0",
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            fontSize: 11,
            color: "var(--text-secondary)"
          }}
        >
          Pick a new vibe and goals. Your offer stays the same.
        </p>

        <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
          <div>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                fontSize: 10,
                letterSpacing: "0.14em",
                color: "var(--accent)"
              }}
            >
              PRIMARY GOAL
            </p>
            <p
              style={{
                margin: "6px 0 0",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                fontSize: 10,
                color: "var(--text-muted)"
              }}
            >
              What should visitors do? Select all that apply.
            </p>
            <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {REGENERATE_GOAL_OPTIONS.map((goal) => {
                const selected = regenPrimaryGoals.includes(goal);
                return (
                  <button
                    key={goal}
                    type="button"
                    disabled={regenerating}
                    onClick={() =>
                      setRegenPrimaryGoals((prev) =>
                        prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
                      )
                    }
                    style={{
                      border: `1px solid ${selected ? "var(--accent)" : "var(--border-primary)"}`,
                      background: selected ? "var(--accent)" : "transparent",
                      color: selected ? "var(--on-accent)" : "var(--text-secondary)",
                      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                      fontSize: 11,
                      lineHeight: 1.4,
                      textAlign: "left",
                      padding: "10px 10px",
                      cursor: regenerating ? "not-allowed" : "pointer",
                      opacity: regenerating ? 0.5 : 1
                    }}
                  >
                    {goal}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                fontSize: 10,
                letterSpacing: "0.14em",
                color: "var(--accent)"
              }}
            >
              SITE VIBE
            </p>
            <p
              style={{
                margin: "6px 0 0",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                fontSize: 10,
                color: "var(--text-muted)"
              }}
            >
              How should your site feel?
            </p>
            <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {REGENERATE_VIBE_OPTIONS.map((vibe) => {
                const selected = regenSiteVibe === vibe;
                return (
                  <button
                    key={vibe}
                    type="button"
                    disabled={regenerating}
                    onClick={() => setRegenSiteVibe(vibe)}
                    style={{
                      border: `1px solid ${selected ? "var(--accent)" : "var(--border-primary)"}`,
                      background: selected ? "var(--accent)" : "transparent",
                      color: selected ? "var(--on-accent)" : "var(--text-secondary)",
                      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                      fontSize: 11,
                      lineHeight: 1.4,
                      textAlign: "left",
                      padding: "10px 10px",
                      cursor: regenerating ? "not-allowed" : "pointer",
                      opacity: regenerating ? 0.5 : 1
                    }}
                  >
                    {vibe}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {regenError ? (
          <p
            style={{
              margin: "12px 0 0",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontSize: 11,
              color: "var(--error)"
            }}
          >
            {regenError}
          </p>
        ) : null}

        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button
            type="button"
            disabled={regenerating}
            onClick={() => setShowRegenerateModal(false)}
            style={{
              flex: 1,
              border: "1px solid var(--accent)",
              background: "transparent",
              color: "var(--accent)",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontSize: 11,
              letterSpacing: "0.12em",
              padding: "10px 12px",
              cursor: regenerating ? "not-allowed" : "pointer",
              opacity: regenerating ? 0.5 : 1
            }}
          >
            CANCEL
          </button>
          <button
            type="button"
            disabled={
              regenerating || regenPrimaryGoals.length === 0 || !regenSiteVibe
            }
            onClick={() => void handleRegenerateConfirm()}
            style={{
              flex: 1,
              border: "none",
              background:
                regenerating || regenPrimaryGoals.length === 0 || !regenSiteVibe
                  ? "var(--border-primary)"
                  : "var(--accent)",
              color:
                regenerating || regenPrimaryGoals.length === 0 || !regenSiteVibe
                  ? "var(--text-muted)"
                  : "var(--on-accent)",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontSize: 11,
              letterSpacing: "0.12em",
              padding: "10px 12px",
              cursor:
                regenerating || regenPrimaryGoals.length === 0 || !regenSiteVibe
                  ? "not-allowed"
                  : "pointer"
            }}
          >
            REGENERATE →
          </button>
        </div>
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
          ) : useLiveReact ? (
            <>
              <div style={{ width: "100%", height: "100vh" }}>
                <LiveLandingView
                  jsxSource={jsxContent}
                  height="100vh"
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
        @keyframes lacoreEditStatusFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "var(--bg-primary)"
        }}
      >
        <header
          style={{
            height: 52,
            flexShrink: 0,
            position: "relative",
            zIndex: 100,
            background: "var(--bg-primary)",
            borderBottom: "1px solid var(--border-primary)",
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
                color: "var(--accent)",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                fontSize: 11,
                letterSpacing: "2px",
                cursor: "pointer",
                padding: "6px 0",
                opacity: dashBackHover ? 0.7 : 1
              }}
            >
              ← DASHBOARD
            </button>
            <div style={{ width: 1, height: 20, background: "var(--border-primary)" }} />
            <span
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-primary)",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
                border: "1px solid var(--border-primary)",
                background: "transparent",
                color: copied ? "var(--accent)" : "var(--text-secondary)",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
                border: "1px solid var(--border-primary)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
              onClick={() => openRegenerateModal()}
              style={{
                border: "1px solid var(--border-primary)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
            flex: 1,
            display: "flex",
            flexDirection: "row",
            overflow: "hidden",
            minHeight: 0
          }}
        >
          <aside
            style={{
              width: 360,
              flexShrink: 0,
              height: "100%",
              overflow: "hidden",
              background: "var(--bg-primary)",
              borderRight: "1px solid var(--border-primary)",
              display: "flex",
              flexDirection: "column",
              minHeight: 0
            }}
          >
            <div
              style={{
                flexShrink: 0,
                padding: "20px 20px 16px",
                borderBottom: "1px solid var(--border-primary)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--success)",
                    animation: "pulse 2s ease-in-out infinite",
                    flexShrink: 0
                  }}
                />
                <span
                  style={{
                    marginLeft: 10,
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontWeight: 800,
                    fontSize: 22,
                    color: "var(--text-primary)",
                    letterSpacing: "1px"
                  }}
                >
                  LACORE AGENT
                </span>
              </div>
              <p
                style={{
                  margin: "6px 0 0",
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                  fontSize: 10,
                  color: "var(--text-muted)",
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
                      background: "var(--bg-card)",
                      borderLeft: "3px solid var(--accent)",
                      padding: "12px 14px",
                      borderRadius: "0 4px 4px 0",
                      alignSelf: "stretch"
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                        fontSize: 12,
                        color: "var(--text-primary)",
                        lineHeight: 1.7
                      }}
                    >
                      {message.text}
                    </p>
                    {message.time ? (
                      <p
                        style={{
                          margin: "6px 0 0",
                          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                          fontSize: 9,
                          color: "var(--text-muted)"
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
                      background: "var(--bg-input)",
                      border: "1px solid var(--border-primary)",
                      padding: "12px 14px",
                      borderRadius: 4,
                      alignSelf: "flex-end",
                      maxWidth: "85%"
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        lineHeight: 1.7
                      }}
                    >
                      {message.text}
                    </p>
                    {message.time ? (
                      <p
                        style={{
                          margin: "6px 0 0",
                          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                          fontSize: 9,
                          color: "var(--text-muted)",
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
                    background: "var(--bg-card)",
                    borderLeft: "3px solid var(--accent)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--accent)",
                        animation: "bounce 1.2s ease-in-out infinite",
                        animationDelay: "0s"
                      }}
                    />
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--accent)",
                        animation: "bounce 1.2s ease-in-out infinite",
                        animationDelay: "0.2s"
                      }}
                    />
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--accent)",
                        animation: "bounce 1.2s ease-in-out infinite",
                        animationDelay: "0.4s"
                      }}
                    />
                  </div>
                  <span
                    key={updateMessageIndex}
                    style={{
                      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                      fontSize: 11,
                      color: "var(--accent)",
                      marginLeft: 4,
                      animation: "lacoreEditStatusFade 0.45s ease-out"
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
                borderTop: "1px solid var(--border-primary)",
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
                  background: "var(--bg-input)",
                  border: `1px solid ${chatInputFocused ? "var(--accent)" : "var(--border-primary)"}`,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontSize: 9,
                    color: "var(--text-muted)"
                  }}
                >
                  ⏎ send &nbsp; ⇧⏎ newline
                </span>
                <button
                  type="submit"
                  disabled={updating || !chatInput.trim()}
                  style={{
                    background: updating || !chatInput.trim() ? "var(--border-primary)" : "var(--accent)",
                    color: updating || !chatInput.trim() ? "var(--text-muted)" : "var(--on-accent)",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontWeight: 800,
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
                  border: "1px solid var(--accent)",
                  background: "color-mix(in srgb, var(--bg-primary) 92%, transparent)",
                  color: "var(--accent)",
                  borderRadius: 4,
                  padding: "8px 14px",
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                  fontSize: 9,
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                  boxShadow:
                    "0 8px 32px color-mix(in srgb, var(--text-primary) 14%, transparent)"
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
              background: "var(--bg-primary)",
              minWidth: 0,
              minHeight: 0,
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
              {loading ? (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
                  }}
                >
                  Loading page...
                </div>
              ) : useLiveReact ? (
                <LiveLandingView
                  jsxSource={jsxContent}
                  height="100%"
                  key={jsxContent.slice(0, 120) + jsxContent.length}
                />
              ) : (
                <iframe
                  key={previewKey}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
                  srcDoc={html}
                  title="Landing page preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    display: "block"
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      {regenerateModal}
      {promoModal}
    </>
  );
}
