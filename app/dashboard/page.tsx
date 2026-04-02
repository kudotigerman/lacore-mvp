"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

type Offer = {
  offer: string;
  audience: string;
  pricing: string;
  positioning: string;
  headline: string;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [offer, setOffer] = useState<Offer | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [landingSlug, setLandingSlug] = useState<string | null>(null);
  const [buildingLanding, setBuildingLanding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [realResults, setRealResults] = useState("");
  const [idealClient, setIdealClient] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [editingOffer, setEditingOffer] = useState(false);
  const [offerDraft, setOfferDraft] = useState<Offer | null>(null);
  const [offerSaveError, setOfferSaveError] = useState<string | null>(null);
  const [regenerateConfirm, setRegenerateConfirm] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const router = useRouter();

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

  const progressMessages = useMemo(
    () => [
      "ANALYZING YOUR BUSINESS...",
      "CRAFTING YOUR HEADLINE...",
      "DESIGNING YOUR LAYOUT...",
      "WRITING YOUR COPY...",
      "ALMOST READY..."
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
        description: "Your core offer and positioning is generated."
      },
      {
        number: "02",
        title: "LANDING PAGE + STRIPE",
        status: layer2Complete ? ("completed" as const) : ("next" as const),
        description: layer2Complete
          ? "YOUR LANDING PAGE IS LIVE"
          : "Your landing page goes live. Stripe connected. Ready to take money."
      },
      { number: "03", title: "CONTENT MACHINE", status: "locked" as const, description: "COMING SOON" },
      { number: "04", title: "LEAD CAPTURE", status: "locked" as const, description: "COMING SOON" },
      { number: "05", title: "CLOSING SYSTEM", status: "locked" as const, description: "COMING SOON" },
      { number: "06", title: "ANALYTICS DASHBOARD", status: "locked" as const, description: "COMING SOON" }
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

      if (landingResult.data?.slug) {
        setLandingSlug(landingResult.data.slug);
      }
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
    realResults?: string;
    idealClient?: string;
  }) {
    if (!offer || !sessionToken) return;
    setBuildError(null);
    setBuildingLanding(true);
    setMessageIndex(0);

    try {
      const response = await fetch("/api/generate-landing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          ...offer,
          userName: email.split("@")[0],
          userEmail: email,
          businessName: extra?.businessName ?? businessName,
          realResults: extra?.realResults ?? realResults,
          idealClient: extra?.idealClient ?? idealClient
        })
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Failed to build landing page.");
      }
      setLandingSlug(result.slug);
    } catch (err) {
      setBuildError(err instanceof Error ? err.message : "Failed to build landing page.");
    } finally {
      setBuildingLanding(false);
      setMessageIndex(0);
    }
  }

  useEffect(() => {
    if (!buildingLanding) return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % progressMessages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [buildingLanding, progressMessages.length]);

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
        <p style={{ fontFamily: "var(--font-space-mono), monospace", color: "#52525B" }}>
          Loading dashboard...
        </p>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#09090B", color: "#F4F4F5", padding: 24 }}>
      {buildingLanding && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(9,9,11,0.96)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            padding: 24
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: 4,
              width: "100%",
              background: "linear-gradient(90deg,#06B6D4,#0891B2,#06B6D4)",
              animation: "loading-progress 25s linear forwards"
            }}
          />
          <style>{`@keyframes loading-progress{0%{transform:translateX(-100%)}100%{transform:translateX(0)}}`}</style>
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-bebas-neue), sans-serif",
              fontSize: isMobile ? 56 : 86,
              lineHeight: 0.95,
              color: "#06B6D4",
              textAlign: "center"
            }}
          >
            {progressMessages[messageIndex]}
          </h2>
          <p
            style={{
              margin: "14px 0 0",
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 12,
              color: "#A1A1AA",
              letterSpacing: "0.08em"
            }}
          >
            LACORE is building your personalized landing page
          </p>
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
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              border: "1px solid #1C1C1F",
              background: "#09090B",
              padding: 20
            }}
          >
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

            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
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
                  onChange={(event) => setBusinessName(event.target.value)}
                  placeholder="Dubai Elite Properties"
                  style={{
                    width: "100%",
                    marginTop: 6,
                    border: "1px solid #1C1C1F",
                    background: "#0F0F12",
                    color: "#F4F4F5",
                    padding: "10px 12px",
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 12,
                    outline: "none"
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
                  YOUR BEST RESULT
                </p>
                <input
                  value={realResults}
                  onChange={(event) => setRealResults(event.target.value)}
                  placeholder="Closed a $12M deal in 3 weeks"
                  style={{
                    width: "100%",
                    marginTop: 6,
                    border: "1px solid #1C1C1F",
                    background: "#0F0F12",
                    color: "#F4F4F5",
                    padding: "10px 12px",
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 12,
                    outline: "none"
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
                  YOUR IDEAL CLIENT
                </p>
                <input
                  value={idealClient}
                  onChange={(event) => setIdealClient(event.target.value)}
                  placeholder="HNW investors looking for Dubai real estate"
                  style={{
                    width: "100%",
                    marginTop: 6,
                    border: "1px solid #1C1C1F",
                    background: "#0F0F12",
                    color: "#F4F4F5",
                    padding: "10px 12px",
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 12,
                    outline: "none"
                  }}
                />
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
                  void handleBuildLandingPage({ businessName, realResults, idealClient });
                }}
                style={{
                  flex: 1,
                  border: "none",
                  background: "#06B6D4",
                  color: "#000000",
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  padding: "10px 12px",
                  cursor: "pointer"
                }}
              >
                BUILD MY PAGE →
              </button>
            </div>
          </div>
        </div>
      )}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #1C1C1F",
          paddingBottom: 16
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-bebas-neue), sans-serif",
            fontSize: 28,
            color: "#06B6D4"
          }}
        >
          LACORE
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <p style={{ margin: 0, fontFamily: "var(--font-space-mono), monospace", fontSize: 12, color: "#A1A1AA" }}>
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
        </div>
      </nav>

      <section
        style={{
          marginTop: 28,
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 60%) minmax(0, 40%)",
          gap: 18,
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
            <section style={{ border: "1px solid #06B6D4", background: "#0C0C0E", padding: 20 }}>
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
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                      background: "#06B6D4"
                    }}
                  />
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

        <aside style={{ border: "1px solid #1C1C1F", background: "#0F0F12", padding: 16 }}>
          <h3
            style={{
              margin: 0,
              fontFamily: "var(--font-bebas-neue), sans-serif",
              fontSize: 34,
              color: "#F4F4F5"
            }}
          >
            WHAT&apos;S NEXT
          </h3>
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
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
                  padding: 12
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
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
                      color:
                        layer.status === "completed"
                          ? "#06B6D4"
                          : layer.status === "next"
                            ? "#06B6D4"
                            : "#52525B"
                    }}
                  >
                    {layer.number === "02" && layer.status === "completed"
                      ? "LAYER 2 COMPLETE ✓"
                      : layer.status === "completed"
                        ? "COMPLETED ✓"
                        : layer.status === "next"
                          ? "UP NEXT"
                          : "COMING SOON"}
                  </span>
                </div>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontFamily: "var(--font-bebas-neue), sans-serif",
                    fontSize: 24,
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
                    margin: "4px 0 0",
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 11,
                    lineHeight: 1.6,
                    color: layer.status === "next" ? "#A1A1AA" : "#52525B"
                  }}
                >
                  {layer.description}
                </p>

                {layer.number === "02" && layer.status === "next" && (
                  <div style={{ marginTop: 10 }}>
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
                      Takes 30 seconds. No design skills needed.
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
                  <div style={{ marginTop: 10 }}>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-space-mono), monospace",
                        fontSize: 11,
                        color: "#06B6D4",
                        letterSpacing: "0.08em"
                      }}
                    >
                      YOUR LANDING PAGE IS LIVE
                    </p>
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
    </main>
  );
}
