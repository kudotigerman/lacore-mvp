"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent
} from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

type Offer = {
  offer: string;
  audience: string;
  pricing: string;
  positioning: string;
  headline: string;
};

type DashChatMessage = { role: "user" | "assistant"; text: string };

const SALES_BUILDER_INTRO = `I'm building your sales machine.

Here's what we can do together:
→ Sharpen your offer & positioning
→ Optimize your landing page copy
→ Plan your content strategy
→ Set up your lead capture system
→ Close more deals with scripts

What's your biggest challenge right now?`;

function emailToInitials(addr: string): string {
  const local = addr.split("@")[0] ?? "";
  const cleaned = local.replace(/[^a-zA-Z0-9]/g, " ").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0] + parts[1]![0]).toUpperCase();
  }
  if (local.length >= 2) {
    return local.slice(0, 2).toUpperCase();
  }
  return (local[0] ?? "?").toUpperCase();
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [offer, setOffer] = useState<Offer | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [landingSlug, setLandingSlug] = useState<string | null>(null);
  const [buildingLanding, setBuildingLanding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [buildLogVisible, setBuildLogVisible] = useState(0);
  const [buildProgressWidth, setBuildProgressWidth] = useState(0);
  const buildLogEndRef = useRef<HTMLDivElement>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [primaryGoals, setPrimaryGoals] = useState<string[]>([]);
  const [siteVibe, setSiteVibe] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [editingOffer, setEditingOffer] = useState(false);
  const [offerDraft, setOfferDraft] = useState<Offer | null>(null);
  const [offerSaveError, setOfferSaveError] = useState<string | null>(null);
  const [regenerateConfirm, setRegenerateConfirm] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<DashChatMessage[]>([
    { role: "assistant", text: SALES_BUILDER_INTRO }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const offerContext = useMemo(() => {
    if (!offer) {
      return "No offer saved yet. The user can generate an offer from the home page.";
    }
    return `OFFER: ${offer.offer}\nAUDIENCE: ${offer.audience}\nPRICING: ${offer.pricing}\nPOSITIONING: ${offer.positioning}\nHEADLINE: ${offer.headline}`;
  }, [offer]);

  const userInitials = useMemo(() => emailToInitials(email), [email]);

  const offerTextareaStyle: CSSProperties = {
    background: "#111115",
    border: "1px solid #06B6D4",
    color: "#F4F4F5",
    fontFamily: "var(--font-space-mono), monospace",
    fontSize: 13,
    lineHeight: 1.6,
    padding: "10px 12px",
    width: "100%",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box"
  };
  const offerInputStyle: CSSProperties = { ...offerTextareaStyle, resize: "none" };

  const buildingLogMessages = useMemo(
    () => [
      "Analyzing your business...",
      "Detecting niche...",
      "Choosing design system...",
      "Writing hero section...",
      "Building services grid...",
      "Generating pricing tiers...",
      "Adding animations...",
      "Finalizing your page..."
    ],
    []
  );

  const layers = useMemo(() => {
    const layer2Complete = Boolean(landingSlug);
    return [
      {
        number: "01",
        title: "OFFER",
        status: "completed" as const,
        description: "Your core offer and positioning is generated.",
        detail:
          "Headline, audience, pricing, and positioning are saved — they power your landing page and Sales Builder context."
      },
      {
        number: "02",
        title: "LANDING PAGE + STRIPE",
        status: layer2Complete ? ("completed" as const) : ("next" as const),
        description: layer2Complete
          ? "YOUR LANDING PAGE IS LIVE"
          : "Your landing page goes live. Stripe connected. Ready to take money.",
        detail: layer2Complete
          ? "Public URL is active. Edit copy in the visual editor, share the link, regenerate when you change vibe or goals."
          : "One click builds a full page from your offer. No design skills — AI handles layout, copy, and structure."
      },
      {
        number: "03",
        title: "CONTENT MACHINE",
        status: "locked" as const,
        description: "COMING SOON",
        detail: "Automated posts, emails, and repurposing from your offer — on the roadmap."
      },
      {
        number: "04",
        title: "LEAD CAPTURE",
        status: "locked" as const,
        description: "COMING SOON",
        detail: "Forms, CRM hooks, and follow-up sequences — shipping after core funnel is stable."
      },
      {
        number: "05",
        title: "CLOSING SYSTEM",
        status: "locked" as const,
        description: "COMING SOON",
        detail: "Scripts, proposals, and objection handling tied to your offer."
      },
      {
        number: "06",
        title: "ANALYTICS DASHBOARD",
        status: "locked" as const,
        description: "COMING SOON",
        detail: "Traffic, conversions, and revenue in one view."
      }
    ];
  }, [landingSlug]);

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 900);
    updateViewport();
    window.addEventListener("resize", updateViewport);

    async function init() {
      const supabase = getSupabaseClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace("/auth");
        return;
      }

      setEmail(session.user.email ?? "");
      setUserId(session.user.id);
      setSessionToken(session.access_token);

      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (!error && data) setOffer(data);

      const landingResult = (await supabase
        .from("landing_pages")
        .select("slug")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()) as { data: { slug: string } | null };
      if (landingResult.data?.slug) setLandingSlug(landingResult.data.slug);

      setLoading(false);
    }

    void init();
    return () => window.removeEventListener("resize", updateViewport);
  }, [router]);

  async function handleSignOut() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  async function handleBuildLandingPage(extra?: {
    businessName?: string;
    primaryGoal?: string;
    siteVibe?: string;
  }) {
    if (!offer || !sessionToken) return;
    setBuildError(null);
    setBuildingLanding(true);
    setBuildLogVisible(1);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl || !(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "")) {
        throw new Error("Missing Supabase configuration.");
      }
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-landing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
        },
        body: JSON.stringify({
          ...offer,
          userName: email.split("@")[0],
          userEmail: email,
          businessName: extra?.businessName ?? businessName,
          primaryGoal: extra?.primaryGoal ?? primaryGoals.join(", "),
          siteVibe: extra?.siteVibe ?? siteVibe
        })
      });
      const text = await response.text();
      let result: { success?: boolean; error?: string; slug?: string };
      try {
        result = JSON.parse(text) as { success?: boolean; error?: string; slug?: string };
      } catch {
        throw new Error("Server error: " + text.slice(0, 100));
      }
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Failed to build.");
      }
      setLandingSlug(result.slug ?? null);
      router.push(`/p/${result.slug}?edit=true`);
    } catch (err) {
      setBuildError(err instanceof Error ? err.message : "Failed to build landing page.");
    } finally {
      setBuildingLanding(false);
    }
  }

  useEffect(() => {
    if (!buildingLanding) {
      setBuildLogVisible(0);
      setBuildProgressWidth(0);
      return;
    }
    let count = 1;
    const intervalId = window.setInterval(() => {
      count += 1;
      if (count <= buildingLogMessages.length) setBuildLogVisible(count);
      else window.clearInterval(intervalId);
    }, 1500);
    const progressTimeout = window.setTimeout(() => setBuildProgressWidth(95), 50);
    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(progressTimeout);
    };
  }, [buildingLanding, buildingLogMessages.length]);

  useEffect(() => {
    if (!buildingLanding) return;
    buildLogEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [buildingLanding, buildLogVisible]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  async function handleDashboardChatSend(e?: FormEvent) {
    e?.preventDefault();
    const text = chatInput.trim();
    if (!text || chatLoading || !sessionToken) return;
    setChatInput("");
    const thread: DashChatMessage[] = [...chatMessages, { role: "user", text }];
    setChatMessages(thread);
    setChatLoading(true);
    try {
      const res = await fetch("/api/dashboard-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          messages: thread.map((m) => ({ role: m.role, content: m.text })),
          offerContext
        })
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Chat failed.");
      }
      if (!data.reply?.trim()) {
        throw new Error("Empty response.");
      }
      setChatMessages((prev) => [...prev, { role: "assistant", text: data.reply!.trim() }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Sorry — ${msg} Try again in a moment.` }
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  function handleChatKeyDown(ev: KeyboardEvent<HTMLTextAreaElement>) {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      void handleDashboardChatSend();
    }
  }

  async function handleCopyUrl() {
    if (!landingSlug) return;
    await navigator.clipboard.writeText(`https://www.lacore.ai/p/${landingSlug}`);
  }

  async function handleSaveOffer() {
    if (!userId || !offerDraft) return;
    setOfferSaveError(null);
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("offers")
      .update({
        offer: offerDraft.offer,
        audience: offerDraft.audience,
        pricing: offerDraft.pricing,
        positioning: offerDraft.positioning,
        headline: offerDraft.headline
      } as never)
      .eq("user_id", userId);
    if (error) {
      setOfferSaveError(error.message);
      return;
    }
    setOffer(offerDraft);
    setOfferDraft(null);
    setEditingOffer(false);
  }

  async function handleRegenerateSiteConfirmed() {
    if (!userId) return;
    setRegenerateError(null);
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("landing_pages").delete().eq("user_id", userId);
    if (error) {
      setRegenerateError(error.message);
      setRegenerateConfirm(false);
      return;
    }
    setLandingSlug(null);
    setRegenerateConfirm(false);
    void handleBuildLandingPage();
  }

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#09090B", color: "#F4F4F5", padding: 24 }}>
        <p style={{ fontFamily: "var(--font-space-mono), monospace", color: "#52525B" }}>Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main
      className="dash-root"
      style={{
        display: "flex",
        minHeight: "100vh",
        maxHeight: "100vh",
        overflow: "hidden",
        background: "#09090B",
        color: "#F4F4F5",
        position: "relative"
      }}
    >
      <style>{`
        @keyframes dash-chat-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.92); }
        }
        @keyframes dash-chat-dot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes dash-build-pulse { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.8)} }
        @media (max-width: 900px) {
          .dash-root { flex-direction: column; max-height: none; min-height: 100vh; overflow: auto; }
          .dash-sales-panel {
            width: 100% !important;
            height: min(52vh, 520px) !important;
            max-height: 520px;
            flex-shrink: 0;
            border-right: none !important;
            border-bottom: 1px solid #1C1C1F;
          }
          .dash-content-panel { flex: 1; min-height: 0; overflow: visible !important; }
        }
      `}</style>

      {buildingLanding && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            background: "#09090B",
            overflow: "hidden"
          }}
        >
          <aside
            style={{
              width: isMobile ? "100%" : 360,
              flexShrink: 0,
              background: "#09090B",
              borderRight: isMobile ? "none" : "1px solid #1C1C1F",
              borderBottom: isMobile ? "1px solid #1C1C1F" : "none",
              display: "flex",
              flexDirection: "column",
              maxHeight: isMobile ? "42vh" : "100%",
              minHeight: 0
            }}
          >
            <div style={{ flexShrink: 0, padding: "20px 20px 16px", borderBottom: "1px solid #1C1C1F" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#22C55E",
                    animation: "dash-build-pulse 2s ease-in-out infinite",
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
              {buildingLogMessages.slice(0, buildLogVisible).map((text, idx) => (
                <div
                  key={`${idx}-${text}`}
                  style={{
                    background: "#111115",
                    borderLeft: "3px solid #06B6D4",
                    padding: "12px 14px",
                    borderRadius: "0 4px 4px 0"
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
                    {text}
                  </p>
                </div>
              ))}
              <div ref={buildLogEndRef} />
            </div>
          </aside>
          <div
            style={{
              flex: 1,
              background: "#06080d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 32,
              minHeight: isMobile ? "58vh" : "100%",
              minWidth: 0
            }}
          >
            <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-bebas-neue), sans-serif",
                  fontSize: 48,
                  lineHeight: 1,
                  color: "#06B6D4",
                  letterSpacing: "0.02em"
                }}
              >
                LACORE
              </p>
              <div
                style={{
                  marginTop: 28,
                  width: "100%",
                  height: 3,
                  background: "#1C1C1F",
                  borderRadius: 1,
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    height: 3,
                    width: `${buildProgressWidth}%`,
                    background: "#06B6D4",
                    transition: "width 90s linear",
                    borderRadius: 1
                  }}
                />
              </div>
              <p
                style={{
                  margin: "14px 0 0",
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 11,
                  color: "#71717A",
                  lineHeight: 1.5
                }}
              >
                {buildLogVisible > 0 ? buildingLogMessages[buildLogVisible - 1] : "Starting..."}
              </p>
              <p
                style={{
                  margin: "10px 0 0",
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 10,
                  color: "#3F3F46",
                  lineHeight: 1.5
                }}
              >
                Generating your landing page...
              </p>
            </div>
          </div>
        </div>
      )}

      {showOnboarding && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            background: "rgba(9,9,11,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
        >
          <div style={{ width: "100%", maxWidth: 480, border: "1px solid #1C1C1F", background: "#09090B", padding: 20 }}>
            <h3
              style={{
                margin: 0,
                fontFamily: "var(--font-bebas-neue), sans-serif",
                fontSize: 36,
                color: "#F4F4F5",
                lineHeight: 1
              }}
            >
              TELL US ABOUT YOUR BUSINESS
            </h3>
            <p
              style={{
                margin: "8px 0 0",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 11,
                color: "#A1A1AA"
              }}
            >
              3 quick questions to make your landing page 10x better
            </p>

            <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    color: "#06B6D4"
                  }}
                >
                  BUSINESS NAME
                </p>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Nike, Alex Design Studio, LexLaw..."
                  style={{
                    width: "100%",
                    marginTop: 6,
                    border: "1px solid #1C1C1F",
                    background: "#0F0F12",
                    color: "#F4F4F5",
                    padding: "10px 12px",
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 12,
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    color: "#06B6D4"
                  }}
                >
                  PRIMARY GOAL
                </p>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 10,
                    color: "#71717A"
                  }}
                >
                  What should visitors do? Select all that apply.
                </p>
                <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {["📞 Book a call", "💳 Buy a package", "✉️ Send a message", "📋 Join a waitlist"].map((goal) => {
                    const selected = primaryGoals.includes(goal);
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() =>
                          setPrimaryGoals((prev) =>
                            prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
                          )
                        }
                        style={{
                          border: `1px solid ${selected ? "#06B6D4" : "#1C1C1F"}`,
                          background: selected ? "#06B6D4" : "transparent",
                          color: selected ? "#000000" : "#A1A1AA",
                          fontFamily: "var(--font-space-mono), monospace",
                          fontSize: 11,
                          lineHeight: 1.4,
                          textAlign: "left",
                          padding: "10px 10px",
                          cursor: "pointer"
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
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    color: "#06B6D4"
                  }}
                >
                  SITE VIBE
                </p>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 10,
                    color: "#71717A"
                  }}
                >
                  How should your site feel?
                </p>
                <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {["💼 Professional & trustworthy", "⚡ Bold & energetic", "💎 Luxury & premium", "🤝 Warm & approachable"].map(
                    (vibe) => {
                      const selected = siteVibe === vibe;
                      return (
                        <button
                          key={vibe}
                          type="button"
                          onClick={() => setSiteVibe(vibe)}
                          style={{
                            border: `1px solid ${selected ? "#06B6D4" : "#1C1C1F"}`,
                            background: selected ? "#06B6D4" : "transparent",
                            color: selected ? "#000000" : "#A1A1AA",
                            fontFamily: "var(--font-space-mono), monospace",
                            fontSize: 11,
                            lineHeight: 1.4,
                            textAlign: "left",
                            padding: "10px 10px",
                            cursor: "pointer"
                          }}
                        >
                          {vibe}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setShowOnboarding(false);
                  void handleBuildLandingPage();
                }}
                style={{
                  flex: 1,
                  border: "1px solid #06B6D4",
                  background: "transparent",
                  color: "#06B6D4",
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  padding: "10px 12px",
                  cursor: "pointer"
                }}
              >
                SKIP →
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowOnboarding(false);
                  void handleBuildLandingPage({
                    businessName,
                    primaryGoal: primaryGoals.join(", "),
                    siteVibe
                  });
                }}
                disabled={!businessName.trim() || primaryGoals.length === 0 || !siteVibe}
                style={{
                  flex: 1,
                  border: "none",
                  background:
                    !businessName.trim() || primaryGoals.length === 0 || !siteVibe ? "#1C1C1F" : "#06B6D4",
                  color:
                    !businessName.trim() || primaryGoals.length === 0 || !siteVibe ? "#52525B" : "#000000",
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  padding: "10px 12px",
                  cursor:
                    !businessName.trim() || primaryGoals.length === 0 || !siteVibe ? "not-allowed" : "pointer"
                }}
              >
                BUILD MY PAGE →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEFT: Sales Builder */}
      <aside
        className="dash-sales-panel"
        style={{
          width: 420,
          flexShrink: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "#060608",
          borderRight: "1px solid #1C1C1F",
          minHeight: 0
        }}
      >
        <div style={{ flexShrink: 0, padding: "16px 18px 14px" }}>
          <button
            type="button"
            onClick={() => router.push("/")}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontFamily: "var(--font-bebas-neue), sans-serif",
              fontSize: 22,
              color: "#06B6D4",
              padding: 0,
              letterSpacing: "0.02em",
              display: "block",
              marginBottom: 14
            }}
          >
            ← LACORE
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "#111115",
                border: "1px solid #1C1C1F",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 13,
                fontWeight: 700,
                color: "#06B6D4",
                flexShrink: 0
              }}
            >
              {userInitials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 11,
                  color: "#E4E4E7",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
                title={email}
              >
                {email}
              </p>
              <button
                type="button"
                onClick={handleSignOut}
                style={{
                  marginTop: 6,
                  border: "none",
                  background: "transparent",
                  color: "#06B6D4",
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  padding: 0,
                  cursor: "pointer"
                }}
              >
                SIGN OUT
              </button>
            </div>
          </div>
          <div style={{ marginTop: 14, height: 1, background: "#1C1C1F" }} />
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 18px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minHeight: 0
          }}
        >
          <div style={{ flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#22C55E",
                  flexShrink: 0,
                  animation: "dash-chat-pulse 2s ease-in-out infinite"
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  color: "#06B6D4"
                }}
              >
                ● SALES BUILDER
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 11,
                color: "#71717A",
                lineHeight: 1.5
              }}
            >
              Your AI system for getting clients
            </p>
          </div>

          {chatMessages.map((m, idx) => (
            <div
              key={`${idx}-${m.role}-${m.text.slice(0, 24)}`}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "94%",
                borderRadius: 6,
                padding: "10px 14px",
                background: m.role === "user" ? "#0C0C0E" : "#111115",
                border: m.role === "user" ? "1px solid #1C1C1F" : "none",
                borderLeft: m.role === "assistant" ? "3px solid #06B6D4" : undefined
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 12,
                  color: "#E4E4E7",
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap"
                }}
              >
                {m.text}
              </p>
            </div>
          ))}
          {chatLoading ? (
            <div
              style={{
                alignSelf: "flex-start",
                display: "flex",
                gap: 5,
                padding: "12px 16px",
                background: "#111115",
                borderLeft: "3px solid #06B6D4",
                borderRadius: "0 6px 6px 0"
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#06B6D4",
                    animation: "dash-chat-dot 1s ease-in-out infinite",
                    animationDelay: `${i * 0.15}s`
                  }}
                />
              ))}
            </div>
          ) : null}
          <div ref={chatEndRef} />
        </div>

        <form
          onSubmit={handleDashboardChatSend}
          style={{
            flexShrink: 0,
            borderTop: "1px solid #1C1C1F",
            padding: "12px 14px 16px",
            background: "#060608",
            display: "flex",
            flexDirection: "column",
            gap: 10
          }}
        >
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleChatKeyDown}
            placeholder="Ask your Sales Builder..."
            rows={3}
            disabled={chatLoading}
            style={{
              width: "100%",
              resize: "none",
              border: "1px solid #1C1C1F",
              background: "#0F0F12",
              color: "#F4F4F5",
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 12,
              padding: "10px 12px",
              outline: "none",
              borderRadius: 6,
              boxSizing: "border-box"
            }}
          />
          <button
            type="submit"
            disabled={chatLoading || !chatInput.trim()}
            style={{
              alignSelf: "flex-end",
              border: "none",
              background: chatLoading || !chatInput.trim() ? "#1C1C1F" : "#06B6D4",
              color: chatLoading || !chatInput.trim() ? "#52525B" : "#000000",
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.14em",
              padding: "10px 20px",
              cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer"
            }}
          >
            SEND
          </button>
        </form>
      </aside>

      {/* RIGHT: main content */}
      <div
        className="dash-content-panel"
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "#09090B"
        }}
      >
        <nav
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 12,
            borderBottom: "1px solid #1C1C1F",
            padding: "14px 24px"
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 12,
              color: "#A1A1AA"
            }}
          >
            {email}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            style={{
              border: "1px solid #06B6D4",
              background: "transparent",
              color: "#06B6D4",
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.12em",
              padding: "8px 12px",
              cursor: "pointer"
            }}
          >
            SIGN OUT
          </button>
        </nav>

        <section
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 24,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 58%) minmax(0, 42%)",
            gap: 20,
            alignItems: "start"
          }}
        >
          <div>
            {!offer ? (
              <div style={{ border: "1px solid #1C1C1F", background: "#0C0C0E", padding: 24 }}>
                <h1
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-bebas-neue), sans-serif",
                    fontSize: 54,
                    lineHeight: 1,
                    color: "#F4F4F5"
                  }}
                >
                  YOUR OFFER IS WAITING
                </h1>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  style={{
                    marginTop: 16,
                    border: "1px solid #06B6D4",
                    background: "transparent",
                    color: "#06B6D4",
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 12,
                    letterSpacing: "0.16em",
                    padding: "10px 16px",
                    cursor: "pointer"
                  }}
                >
                  GENERATE YOUR OFFER →
                </button>
              </div>
            ) : (
              <section
                style={{
                  border: "1px solid #06B6D4",
                  background: "#0C0C0E",
                  padding: 20,
                  borderRadius: 4
                }}
              >
                <div
                  style={{
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontFamily: "var(--font-space-mono), monospace",
                        fontSize: 10,
                        letterSpacing: "0.12em",
                        color: "#22C55E",
                        border: "1px solid rgba(34,197,94,0.45)",
                        padding: "4px 10px",
                        borderRadius: 999
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }} />
                      ACTIVE
                    </span>
                  </div>
                  {!editingOffer && (
                    <button
                      type="button"
                      onClick={() => {
                        setOfferSaveError(null);
                        setOfferDraft({ ...offer });
                        setEditingOffer(true);
                      }}
                      style={{
                        background: "transparent",
                        border: "1px solid #1C1C1F",
                        color: "#A1A1AA",
                        fontFamily: "var(--font-space-mono), monospace",
                        fontSize: 10,
                        letterSpacing: "2px",
                        padding: "6px 12px",
                        cursor: "pointer"
                      }}
                    >
                      EDIT →
                    </button>
                  )}
                </div>

                {(
                  [
                    { label: "OFFER", key: "offer" as const, multiline: true },
                    { label: "AUDIENCE", key: "audience" as const, multiline: true },
                    { label: "PRICING", key: "pricing" as const, multiline: true },
                    { label: "POSITIONING", key: "positioning" as const, multiline: true },
                    { label: "HEADLINE", key: "headline" as const, multiline: false }
                  ] as const
                ).map((item, idx) => {
                  const source = editingOffer && offerDraft ? offerDraft : offer;
                  const value = source[item.key];
                  return (
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
                      {editingOffer && offerDraft ? (
                        item.multiline ? (
                          <textarea
                            value={offerDraft[item.key]}
                            onChange={(e) =>
                              setOfferDraft((d) => (d ? { ...d, [item.key]: e.target.value } : d))
                            }
                            rows={4}
                            style={offerTextareaStyle}
                          />
                        ) : (
                          <input
                            type="text"
                            value={offerDraft[item.key]}
                            onChange={(e) =>
                              setOfferDraft((d) => (d ? { ...d, [item.key]: e.target.value } : d))
                            }
                            style={offerInputStyle}
                          />
                        )
                      ) : (
                        <p
                          style={{
                            margin: "8px 0 0",
                            fontFamily: "var(--font-space-mono), monospace",
                            fontSize: 14,
                            lineHeight: 1.6,
                            color: "#F4F4F5"
                          }}
                        >
                          {value}
                        </p>
                      )}
                    </div>
                  );
                })}

                {editingOffer && (
                  <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                    {offerSaveError && (
                      <p
                        style={{
                          margin: 0,
                          fontFamily: "var(--font-space-mono), monospace",
                          fontSize: 11,
                          color: "#f87171"
                        }}
                      >
                        {offerSaveError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleSaveOffer()}
                      style={{
                        width: "100%",
                        border: "none",
                        background: "#06B6D4",
                        color: "#000000",
                        fontFamily: "var(--font-bebas-neue), sans-serif",
                        fontSize: 18,
                        letterSpacing: "0.05em",
                        padding: "14px 24px",
                        cursor: "pointer"
                      }}
                    >
                      SAVE CHANGES →
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingOffer(false);
                        setOfferDraft(null);
                        setOfferSaveError(null);
                      }}
                      style={{
                        width: "100%",
                        border: "1px solid #06B6D4",
                        background: "transparent",
                        color: "#06B6D4",
                        fontFamily: "var(--font-space-mono), monospace",
                        fontSize: 11,
                        letterSpacing: "0.12em",
                        padding: "12px 16px",
                        cursor: "pointer"
                      }}
                    >
                      CANCEL
                    </button>
                  </div>
                )}
              </section>
            )}
          </div>

          <aside
            style={{
              border: "1px solid #1C1C1F",
              background: "#0F0F12",
              padding: 18,
              borderRadius: 4
            }}
          >
            <h3
              style={{
                margin: 0,
                fontFamily: "var(--font-bebas-neue), sans-serif",
                fontSize: 32,
                color: "#F4F4F5",
                letterSpacing: "0.02em"
              }}
            >
              WHAT&apos;S NEXT
            </h3>
            <p
              style={{
                margin: "6px 0 14px",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 11,
                color: "#52525B",
                lineHeight: 1.5
              }}
            >
              Your roadmap from offer to revenue — each layer unlocks the next.
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              {layers.map((layer) => (
                <div
                  key={layer.number}
                  style={{
                    border:
                      layer.status === "completed"
                        ? "1px solid #06B6D4"
                        : layer.status === "next"
                          ? "1px solid rgba(6,182,212,0.55)"
                          : "1px solid #1C1C1F",
                    background:
                      layer.status === "next"
                        ? "linear-gradient(180deg, rgba(6,182,212,0.08), rgba(6,182,212,0.01))"
                        : "#111115",
                    padding: 14,
                    borderRadius: 4
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-space-mono), monospace",
                        fontSize: 10,
                        letterSpacing: "0.14em",
                        color: "#52525B"
                      }}
                    >
                      LAYER {layer.number}
                    </p>
                    <span
                      style={{
                        fontFamily: "var(--font-space-mono), monospace",
                        fontSize: 9,
                        letterSpacing: "0.12em",
                        color: layer.status === "locked" ? "#52525B" : "#06B6D4"
                      }}
                    >
                      {layer.number === "02" && layer.status === "completed"
                        ? "LIVE ✓"
                        : layer.status === "completed"
                          ? "DONE ✓"
                          : layer.status === "next"
                            ? "UP NEXT"
                            : "LOCKED"}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: "10px 0 0",
                      fontFamily: "var(--font-bebas-neue), sans-serif",
                      fontSize: 22,
                      color:
                        layer.status === "completed"
                          ? "#06B6D4"
                          : layer.status === "next"
                            ? "#F4F4F5"
                            : "#A1A1AA"
                    }}
                  >
                    {layer.title}
                  </p>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontFamily: "var(--font-space-mono), monospace",
                      fontSize: 11,
                      lineHeight: 1.55,
                      color: layer.status === "next" ? "#A1A1AA" : "#71717A"
                    }}
                  >
                    {layer.description}
                  </p>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontFamily: "var(--font-space-mono), monospace",
                      fontSize: 10,
                      lineHeight: 1.6,
                      color: "#52525B"
                    }}
                  >
                    {layer.detail}
                  </p>

                  {layer.number === "02" && layer.status === "completed" && landingSlug ? (
                    <div
                      style={{
                        marginTop: 12,
                        borderRadius: 6,
                        overflow: "hidden",
                        border: "1px solid #1C1C1F",
                        background: "#060608"
                      }}
                    >
                      <iframe
                        title="Landing preview"
                        src={`/p/${landingSlug}`}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
                        style={{
                          width: "100%",
                          height: 200,
                          border: "none",
                          display: "block",
                          pointerEvents: "none"
                        }}
                      />
                    </div>
                  ) : null}

                  {layer.number === "02" && layer.status === "next" && (
                    <div style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        onClick={() => setShowOnboarding(true)}
                        disabled={!offer || buildingLanding}
                        style={{
                          width: "100%",
                          border: "none",
                          background: "#06B6D4",
                          color: "#000000",
                          fontFamily: "var(--font-bebas-neue), sans-serif",
                          fontSize: 18,
                          letterSpacing: "0.05em",
                          padding: "16px 32px",
                          cursor: !offer || buildingLanding ? "not-allowed" : "pointer"
                        }}
                      >
                        BUILD MY LANDING PAGE →
                      </button>
                      <p
                        style={{
                          margin: "8px 0 0",
                          fontFamily: "var(--font-space-mono), monospace",
                          fontSize: 11,
                          color: "#52525B"
                        }}
                      >
                        No design skills needed.
                      </p>
                      {buildError && (
                        <p
                          style={{
                            margin: "8px 0 0",
                            fontFamily: "var(--font-space-mono), monospace",
                            fontSize: 11,
                            color: "#f87171"
                          }}
                        >
                          {buildError}
                        </p>
                      )}
                    </div>
                  )}

                  {layer.number === "02" && layer.status === "completed" && landingSlug && (
                    <div style={{ marginTop: 12 }}>
                      <div
                        style={{
                          marginTop: 8,
                          border: "1px solid #06B6D4",
                          padding: "8px 10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8
                        }}
                      >
                        <a
                          href={`/p/${landingSlug}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: "#06B6D4",
                            textDecoration: "none",
                            fontFamily: "var(--font-space-mono), monospace",
                            fontSize: 11
                          }}
                        >
                          lacore.ai/p/{landingSlug}
                        </a>
                        <button
                          type="button"
                          onClick={handleCopyUrl}
                          style={{
                            border: "1px solid #1C1C1F",
                            background: "transparent",
                            color: "#A1A1AA",
                            fontFamily: "var(--font-space-mono), monospace",
                            fontSize: 10,
                            padding: "4px 8px",
                            cursor: "pointer"
                          }}
                        >
                          COPY
                        </button>
                      </div>
                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <a
                          href={`/p/${landingSlug}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            flex: 1,
                            minWidth: 100,
                            textAlign: "center",
                            textDecoration: "none",
                            border: "1px solid #06B6D4",
                            color: "#06B6D4",
                            fontFamily: "var(--font-space-mono), monospace",
                            fontSize: 11,
                            padding: "8px 12px"
                          }}
                        >
                          PREVIEW →
                        </a>
                        <a
                          href={`/p/${landingSlug}?edit=true`}
                          style={{
                            flex: 1,
                            minWidth: 100,
                            textAlign: "center",
                            textDecoration: "none",
                            border: "1px solid #06B6D4",
                            color: "#06B6D4",
                            fontFamily: "var(--font-space-mono), monospace",
                            fontSize: 11,
                            padding: "8px 12px"
                          }}
                        >
                          EDIT PAGE →
                        </a>
                        <button
                          type="button"
                          disabled
                          title="Coming soon"
                          style={{
                            flex: 1,
                            minWidth: 100,
                            border: "1px solid #1C1C1F",
                            background: "transparent",
                            color: "#52525B",
                            fontFamily: "var(--font-space-mono), monospace",
                            fontSize: 11,
                            padding: "8px 12px",
                            cursor: "not-allowed"
                          }}
                        >
                          CONNECT DOMAIN
                        </button>
                      </div>
                      {regenerateConfirm ? (
                        <div style={{ marginTop: 12 }}>
                          <p
                            style={{
                              margin: 0,
                              fontFamily: "var(--font-space-mono), monospace",
                              fontSize: 11,
                              color: "#A1A1AA",
                              lineHeight: 1.5
                            }}
                          >
                            Are you sure? This will replace your current site.
                          </p>
                          {regenerateError && (
                            <p
                              style={{
                                margin: "8px 0 0",
                                fontFamily: "var(--font-space-mono), monospace",
                                fontSize: 11,
                                color: "#f87171"
                              }}
                            >
                              {regenerateError}
                            </p>
                          )}
                          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => {
                                setRegenerateError(null);
                                void handleRegenerateSiteConfirmed();
                              }}
                              disabled={buildingLanding}
                              style={{
                                flex: 1,
                                border: "none",
                                background: "#06B6D4",
                                color: "#000000",
                                fontFamily: "var(--font-space-mono), monospace",
                                fontSize: 11,
                                letterSpacing: "0.1em",
                                padding: "10px 12px",
                                cursor: buildingLanding ? "not-allowed" : "pointer"
                              }}
                            >
                              YES
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRegenerateConfirm(false);
                                setRegenerateError(null);
                              }}
                              disabled={buildingLanding}
                              style={{
                                flex: 1,
                                border: "1px solid #06B6D4",
                                background: "transparent",
                                color: "#06B6D4",
                                fontFamily: "var(--font-space-mono), monospace",
                                fontSize: 11,
                                letterSpacing: "0.1em",
                                padding: "10px 12px",
                                cursor: buildingLanding ? "not-allowed" : "pointer"
                              }}
                            >
                              NO
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setRegenerateError(null);
                            setRegenerateConfirm(true);
                          }}
                          disabled={buildingLanding || !offer}
                          style={{
                            marginTop: 12,
                            width: "100%",
                            border: "none",
                            background: "#06B6D4",
                            color: "#000000",
                            fontFamily: "var(--font-bebas-neue), sans-serif",
                            fontSize: 14,
                            letterSpacing: "0.05em",
                            padding: "12px 20px",
                            cursor: buildingLanding || !offer ? "not-allowed" : "pointer"
                          }}
                        >
                          REGENERATE SITE →
                        </button>
                      )}
                      <p
                        style={{
                          margin: "8px 0 0",
                          fontFamily: "var(--font-space-mono), monospace",
                          fontSize: 10,
                          color: "#52525B"
                        }}
                      >
                        Share this link with potential clients
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
