"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
  const [buildLogVisible, setBuildLogVisible] = useState(0);
  const [buildProgressWidth, setBuildProgressWidth] = useState(0);
  const buildLogEndRef = useRef<HTMLDivElement>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [primaryGoals, setPrimaryGoals] = useState<string[]>([]); // FIX: мультиселект
  const [siteVibe, setSiteVibe] = useState("");
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.replace("/auth"); return; }

      setEmail(session.user.email ?? "");
      setUserId(session.user.id);
      setSessionToken(session.access_token);

      const { data, error } = await supabase
        .from("offers").select("*").eq("user_id", session.user.id)
        .order("created_at", { ascending: false }).limit(1).single();
      if (!error && data) setOffer(data);

      const landingResult = (await supabase
        .from("landing_pages").select("slug").eq("user_id", session.user.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle()) as { data: { slug: string } | null };
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
      const response = await fetch("/api/generate-landing", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({
          ...offer,
          userName: email.split("@")[0],
          userEmail: email,
          businessName: extra?.businessName ?? businessName,
          primaryGoal: extra?.primaryGoal ?? primaryGoals.join(", "), // FIX: массив → строка
          siteVibe: extra?.siteVibe ?? siteVibe
        })
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text.slice(0, 200));
      }
      const text = await response.text();
      let result: { success?: boolean; error?: string; slug?: string };
      try {
        result = JSON.parse(text) as { success?: boolean; error?: string; slug?: string };
      } catch {
        throw new Error("Server error: " + text.slice(0, 200));
      }
      if (!result?.success) throw new Error(result?.error || "Failed to build landing page.");
      setLandingSlug(result.slug ?? null);
      router.push(`/p/${result.slug}?edit=true`); // FIX: редирект сразу на лендинг
    } catch (err) {
      setBuildError(err instanceof Error ? err.message : "Failed to build landing page.");
    } finally {
      setBuildingLanding(false);
    }
  }

  useEffect(() => {
    if (!buildingLanding) { setBuildLogVisible(0); setBuildProgressWidth(0); return; }
    let count = 1;
    const intervalId = window.setInterval(() => {
      count += 1;
      if (count <= buildingLogMessages.length) setBuildLogVisible(count);
      else window.clearInterval(intervalId);
    }, 1500);
    const progressTimeout = window.setTimeout(() => setBuildProgressWidth(95), 50);
    return () => { window.clearInterval(intervalId); window.clearTimeout(progressTimeout); };
  }, [buildingLanding, buildingLogMessages.length]);

  useEffect(() => {
    if (!buildingLanding) return;
    buildLogEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [buildingLanding, buildLogVisible]);

  async function handleCopyUrl() {
    if (!landingSlug) return;
    await navigator.clipboard.writeText(`https://www.lacore.ai/p/${landingSlug}`);
  }

  async function handleSaveOffer() {
    if (!userId || !offerDraft) return;
    setOfferSaveError(null);
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("offers").update({
      offer: offerDraft.offer, audience: offerDraft.audience, pricing: offerDraft.pricing,
      positioning: offerDraft.positioning, headline: offerDraft.headline
    } as never).eq("user_id", userId);
    if (error) { setOfferSaveError(error.message); return; }
    setOffer(offerDraft);
    setOfferDraft(null);
    setEditingOffer(false);
  }

  async function handleRegenerateSiteConfirmed() {
    if (!userId) return;
    setRegenerateError(null);
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("landing_pages").delete().eq("user_id", userId);
    if (error) { setRegenerateError(error.message); setRegenerateConfirm(false); return; }
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
    <main style={{ minHeight: "100vh", background: "#09090B", color: "#F4F4F5", padding: 24 }}>

      {/* LOADING OVERLAY */}
      {buildingLanding && (
        <>
          <style>{`@keyframes dash-build-pulse { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.8)} }`}</style>
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: isMobile ? "column" : "row", background: "#09090B", overflow: "hidden" }}>
            <aside style={{ width: isMobile ? "100%" : 360, flexShrink: 0, background: "#09090B", borderRight: isMobile ? "none" : "1px solid #1C1C1F", borderBottom: isMobile ? "1px solid #1C1C1F" : "none", display: "flex", flexDirection: "column", maxHeight: isMobile ? "42vh" : "100%", minHeight: 0 }}>
              <div style={{ flexShrink: 0, padding: "20px 20px 16px", borderBottom: "1px solid #1C1C1F" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E", animation: "dash-build-pulse 2s ease-in-out infinite", flexShrink: 0 }} />
                  <span style={{ marginLeft: 10, fontFamily: "var(--font-bebas-neue), sans-serif", fontSize: 22, color: "#F4F4F5", letterSpacing: "1px" }}>LACORE AGENT</span>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
                {buildingLogMessages.slice(0, buildLogVisible).map((text, idx) => (
                  <div key={`${idx}-${text}`} style={{ background: "#111115", borderLeft: "3px solid #06B6D4", padding: "12px 14px", borderRadius: "0 4px 4px 0" }}>
                    <p style={{ margin: 0, fontFamily: "var(--font-space-mono), monospace", fontSize: 12, color: "#E4E4E7", lineHeight: 1.7 }}>{text}</p>
                  </div>
                ))}
                <div ref={buildLogEndRef} />
              </div>
            </aside>
            <div style={{ flex: 1, background: "#06080d", display: "flex", alignItems: "center", justifyContent: "center", padding: 32, minHeight: isMobile ? "58vh" : "100%", minWidth: 0 }}>
              <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
                <p style={{ margin: 0, fontFamily: "var(--font-bebas-neue), sans-serif", fontSize: 48, lineHeight: 1, color: "#06B6D4", letterSpacing: "0.02em" }}>LACORE</p>
                <div style={{ marginTop: 28, width: "100%", height: 3, background: "#1C1C1F", borderRadius: 1, overflow: "hidden" }}>
                  <div style={{ height: 3, width: `${buildProgressWidth}%`, background: "#06B6D4", transition: "width 90s linear", borderRadius: 1 }} />
                </div>
                <p style={{ margin: "14px 0 0", fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "#71717A", lineHeight: 1.5 }}>
                  {buildLogVisible > 0 ? buildingLogMessages[buildLogVisible - 1] : "Starting..."}
                </p>
                {/* FIX: убрали "30 секунд" */}
                <p style={{ margin: "10px 0 0", fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color: "#3F3F46", lineHeight: 1.5 }}>
                  Generating your landing page...
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ONBOARDING MODAL */}
      {showOnboarding && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(9,9,11,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 480, border: "1px solid #1C1C1F", background: "#09090B", padding: 20 }}>
            <h3 style={{ margin: 0, fontFamily: "var(--font-bebas-neue), sans-serif", fontSize: 36, color: "#F4F4F5", lineHeight: 1 }}>TELL US ABOUT YOUR BUSINESS</h3>
            <p style={{ margin: "8px 0 0", fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "#A1A1AA" }}>3 quick questions to make your landing page 10x better</p>

            <div style={{ marginTop: 16, display: "grid", gap: 14 }}>

              {/* Business Name */}
              <div>
                <p style={{ margin: 0, fontFamily: "var(--font-space-mono), monospace", fontSize: 10, letterSpacing: "0.14em", color: "#06B6D4" }}>BUSINESS NAME</p>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Nike, Alex Design Studio, LexLaw..."
                  style={{ width: "100%", marginTop: 6, border: "1px solid #1C1C1F", background: "#0F0F12", color: "#F4F4F5", padding: "10px 12px", fontFamily: "var(--font-space-mono), monospace", fontSize: 12, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {/* FIX: Primary Goal — мультиселект */}
              <div>
                <p style={{ margin: 0, fontFamily: "var(--font-space-mono), monospace", fontSize: 10, letterSpacing: "0.14em", color: "#06B6D4" }}>PRIMARY GOAL</p>
                <p style={{ margin: "6px 0 0", fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color: "#71717A" }}>What should visitors do? Select all that apply.</p>
                <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {["📞 Book a call", "💳 Buy a package", "✉️ Send a message", "📋 Join a waitlist"].map((goal) => {
                    const selected = primaryGoals.includes(goal);
                    return (
                      <button key={goal} type="button"
                        onClick={() => setPrimaryGoals((prev) => prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal])}
                        style={{ border: `1px solid ${selected ? "#06B6D4" : "#1C1C1F"}`, background: selected ? "#06B6D4" : "transparent", color: selected ? "#000000" : "#A1A1AA", fontFamily: "var(--font-space-mono), monospace", fontSize: 11, lineHeight: 1.4, textAlign: "left", padding: "10px 10px", cursor: "pointer" }}>
                        {goal}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Site Vibe */}
              <div>
                <p style={{ margin: 0, fontFamily: "var(--font-space-mono), monospace", fontSize: 10, letterSpacing: "0.14em", color: "#06B6D4" }}>SITE VIBE</p>
                <p style={{ margin: "6px 0 0", fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color: "#71717A" }}>How should your site feel?</p>
                <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {["💼 Professional & trustworthy", "⚡ Bold & energetic", "💎 Luxury & premium", "🤝 Warm & approachable"].map((vibe) => {
                    const selected = siteVibe === vibe;
                    return (
                      <button key={vibe} type="button" onClick={() => setSiteVibe(vibe)}
                        style={{ border: `1px solid ${selected ? "#06B6D4" : "#1C1C1F"}`, background: selected ? "#06B6D4" : "transparent", color: selected ? "#000000" : "#A1A1AA", fontFamily: "var(--font-space-mono), monospace", fontSize: 11, lineHeight: 1.4, textAlign: "left", padding: "10px 10px", cursor: "pointer" }}>
                        {vibe}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button type="button"
                onClick={() => { setShowOnboarding(false); void handleBuildLandingPage(); }}
                style={{ flex: 1, border: "1px solid #06B6D4", background: "transparent", color: "#06B6D4", fontFamily: "var(--font-space-mono), monospace", fontSize: 11, letterSpacing: "0.12em", padding: "10px 12px", cursor: "pointer" }}>
                SKIP →
              </button>
              {/* FIX: активна если выбран хоть 1 goal */}
              <button type="button"
                onClick={() => { setShowOnboarding(false); void handleBuildLandingPage({ businessName, primaryGoal: primaryGoals.join(", "), siteVibe }); }}
                disabled={!businessName.trim() || primaryGoals.length === 0 || !siteVibe}
                style={{ flex: 1, border: "none", background: (!businessName.trim() || primaryGoals.length === 0 || !siteVibe) ? "#1C1C1F" : "#06B6D4", color: (!businessName.trim() || primaryGoals.length === 0 || !siteVibe) ? "#52525B" : "#000000", fontFamily: "var(--font-space-mono), monospace", fontSize: 11, letterSpacing: "0.12em", padding: "10px 12px", cursor: (!businessName.trim() || primaryGoals.length === 0 || !siteVibe) ? "not-allowed" : "pointer" }}>
                BUILD MY PAGE →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1C1C1F", paddingBottom: 16 }}>
        <p style={{ margin: 0, fontFamily: "var(--font-bebas-neue), sans-serif", fontSize: 28, color: "#06B6D4" }}>LACORE</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <p style={{ margin: 0, fontFamily: "var(--font-space-mono), monospace", fontSize: 12, color: "#A1A1AA" }}>{email}</p>
          <button type="button" onClick={handleSignOut}
            style={{ border: "1px solid #06B6D4", background: "transparent", color: "#06B6D4", fontFamily: "var(--font-space-mono), monospace", fontSize: 11, letterSpacing: "0.12em", padding: "8px 12px", cursor: "pointer" }}>
            SIGN OUT
          </button>
        </div>
      </nav>

      {/* MAIN GRID */}
      <section style={{ marginTop: 28, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 60%) minmax(0, 40%)", gap: 18, alignItems: "start" }}>

        {/* LEFT: OFFER */}
        <div>
          {!offer ? (
            <div style={{ border: "1px solid #1C1C1F", background: "#0C0C0E", padding: 24 }}>
              <h1 style={{ margin: 0, fontFamily: "var(--font-bebas-neue), sans-serif", fontSize: 54, lineHeight: 1, color: "#F4F4F5" }}>YOUR OFFER IS WAITING</h1>
              <button type="button" onClick={() => router.push("/")}
                style={{ marginTop: 16, border: "1px solid #06B6D4", background: "transparent", color: "#06B6D4", fontFamily: "var(--font-space-mono), monospace", fontSize: 12, letterSpacing: "0.16em", padding: "10px 16px", cursor: "pointer" }}>
                GENERATE YOUR OFFER →
              </button>
            </div>
          ) : (
            <section style={{ border: "1px solid #06B6D4", background: "#0C0C0E", padding: 20 }}>
              <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h2 style={{ margin: 0, fontFamily: "var(--font-bebas-neue), sans-serif", fontSize: 38, lineHeight: 1, letterSpacing: "0.04em", color: "#06B6D4" }}>YOUR OFFER</h2>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: "#06B6D4" }} />
                </div>
                {!editingOffer && (
                  <button type="button" onClick={() => { setOfferSaveError(null); setOfferDraft({ ...offer }); setEditingOffer(true); }}
                    style={{ background: "transparent", border: "1px solid #1C1C1F", color: "#A1A1AA", fontFamily: "var(--font-space-mono), monospace", fontSize: 10, letterSpacing: "2px", padding: "6px 12px", cursor: "pointer" }}>
                    EDIT →
                  </button>
                )}
              </div>

              {([
                { label: "OFFER", key: "offer" as const, multiline: true },
                { label: "AUDIENCE", key: "audience" as const, multiline: true },
                { label: "PRICING", key: "pricing" as const, multiline: true },
                { label: "POSITIONING", key: "positioning" as const, multiline: true },
                { label: "HEADLINE", key: "headline" as const, multiline: false }
              ] as const).map((item, idx) => {
                const source = editingOffer && offerDraft ? offerDraft : offer;
                const value = source[item.key];
                return (
                  <div key={item.label} style={{ borderBottom: idx === 4 ? "none" : "1px solid #27272A", padding: "14px 0" }}>
                    <p style={{ margin: 0, fontFamily: "var(--font-space-mono), monospace", fontSize: 10, letterSpacing: "0.2em", color: "#06B6D4" }}>{item.label}</p>
                    {editingOffer && offerDraft ? (
                      item.multiline ? (
                        <textarea value={offerDraft[item.key]} onChange={(e) => setOfferDraft((d) => (d ? { ...d, [item.key]: e.target.value } : d))} rows={4} style={offerTextareaStyle} />
                      ) : (
                        <input type="text" value={offerDraft[item.key]} onChange={(e) => setOfferDraft((d) => (d ? { ...d, [item.key]: e.target.value } : d))} style={offerInputStyle} />
                      )
                    ) : (
                      <p style={{ margin: "8px 0 0", fontFamily: "var(--font-space-mono), monospace", fontSize: 14, lineHeight: 1.6, color: "#F4F4F5" }}>{value}</p>
                    )}
                  </div>
                );
              })}

              {editingOffer && (
                <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                  {offerSaveError && <p style={{ margin: 0, fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "#f87171" }}>{offerSaveError}</p>}
                  <button type="button" onClick={() => void handleSaveOffer()}
                    style={{ width: "100%", border: "none", background: "#06B6D4", color: "#000000", fontFamily: "var(--font-bebas-neue), sans-serif", fontSize: 18, letterSpacing: "0.05em", padding: "14px 24px", cursor: "pointer" }}>
                    SAVE CHANGES →
                  </button>
                  <button type="button" onClick={() => { setEditingOffer(false); setOfferDraft(null); setOfferSaveError(null); }}
                    style={{ width: "100%", border: "1px solid #06B6D4", background: "transparent", color: "#06B6D4", fontFamily: "var(--font-space-mono), monospace", fontSize: 11, letterSpacing: "0.12em", padding: "12px 16px", cursor: "pointer" }}>
                    CANCEL
                  </button>
                </div>
              )}
            </section>
          )}
        </div>

        {/* RIGHT: LAYERS */}
        <aside style={{ border: "1px solid #1C1C1F", background: "#0F0F12", padding: 16 }}>
          <h3 style={{ margin: 0, fontFamily: "var(--font-bebas-neue), sans-serif", fontSize: 34, color: "#F4F4F5" }}>WHAT&apos;S NEXT</h3>
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {layers.map((layer) => (
              <div key={layer.number} style={{
                border: layer.status === "completed" ? "1px solid #06B6D4" : layer.status === "next" ? "1px solid rgba(6,182,212,0.55)" : "1px solid #1C1C1F",
                background: layer.status === "next" ? "linear-gradient(180deg, rgba(6,182,212,0.08), rgba(6,182,212,0.01))" : "#111115",
                padding: 12
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <p style={{ margin: 0, fontFamily: "var(--font-space-mono), monospace", fontSize: 10, letterSpacing: "0.14em", color: "#52525B" }}>LAYER {layer.number}</p>
                  <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: 9, letterSpacing: "0.12em", color: layer.status === "locked" ? "#52525B" : "#06B6D4" }}>
                    {layer.number === "02" && layer.status === "completed" ? "LAYER 2 COMPLETE ✓" : layer.status === "completed" ? "COMPLETED ✓" : layer.status === "next" ? "UP NEXT" : "COMING SOON"}
                  </span>
                </div>
                <p style={{ margin: "8px 0 0", fontFamily: "var(--font-bebas-neue), sans-serif", fontSize: 24, color: layer.status === "completed" ? "#06B6D4" : layer.status === "next" ? "#F4F4F5" : "#A1A1AA" }}>{layer.title}</p>
                <p style={{ margin: "4px 0 0", fontFamily: "var(--font-space-mono), monospace", fontSize: 11, lineHeight: 1.6, color: layer.status === "next" ? "#A1A1AA" : "#52525B" }}>{layer.description}</p>

                {layer.number === "02" && layer.status === "next" && (
                  <div style={{ marginTop: 10 }}>
                    <button type="button" onClick={() => setShowOnboarding(true)} disabled={!offer || buildingLanding}
                      style={{ width: "100%", border: "none", background: "#06B6D4", color: "#000000", fontFamily: "var(--font-bebas-neue), sans-serif", fontSize: 18, letterSpacing: "0.05em", padding: "16px 32px", cursor: !offer || buildingLanding ? "not-allowed" : "pointer" }}>
                      BUILD MY LANDING PAGE →
                    </button>
                    {/* FIX: убрали "Takes 30 seconds" */}
                    <p style={{ margin: "8px 0 0", fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "#52525B" }}>No design skills needed.</p>
                    {buildError && <p style={{ margin: "8px 0 0", fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "#f87171" }}>{buildError}</p>}
                  </div>
                )}

                {layer.number === "02" && layer.status === "completed" && landingSlug && (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ margin: 0, fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "#06B6D4", letterSpacing: "0.08em" }}>YOUR LANDING PAGE IS LIVE</p>
                    <div style={{ marginTop: 8, border: "1px solid #06B6D4", padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <a href={`/p/${landingSlug}`} target="_blank" rel="noreferrer"
                        style={{ color: "#06B6D4", textDecoration: "none", fontFamily: "var(--font-space-mono), monospace", fontSize: 11 }}>
                        lacore.ai/p/{landingSlug}
                      </a>
                      <button type="button" onClick={handleCopyUrl}
                        style={{ border: "1px solid #1C1C1F", background: "transparent", color: "#A1A1AA", fontFamily: "var(--font-space-mono), monospace", fontSize: 10, padding: "4px 8px", cursor: "pointer" }}>
                        COPY
                      </button>
                    </div>
                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <a href={`/p/${landingSlug}`} target="_blank" rel="noreferrer"
                        style={{ flex: 1, minWidth: 100, textAlign: "center", textDecoration: "none", border: "1px solid #06B6D4", color: "#06B6D4", fontFamily: "var(--font-space-mono), monospace", fontSize: 11, padding: "8px 12px" }}>
                        PREVIEW →
                      </a>
                      <a href={`/p/${landingSlug}?edit=true`}
                        style={{ flex: 1, minWidth: 100, textAlign: "center", textDecoration: "none", border: "1px solid #06B6D4", color: "#06B6D4", fontFamily: "var(--font-space-mono), monospace", fontSize: 11, padding: "8px 12px" }}>
                        EDIT PAGE →
                      </a>
                      <button type="button" disabled title="Coming soon"
                        style={{ flex: 1, minWidth: 100, border: "1px solid #1C1C1F", background: "transparent", color: "#52525B", fontFamily: "var(--font-space-mono), monospace", fontSize: 11, padding: "8px 12px", cursor: "not-allowed" }}>
                        CONNECT DOMAIN
                      </button>
                    </div>
                    {regenerateConfirm ? (
                      <div style={{ marginTop: 12 }}>
                        <p style={{ margin: 0, fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "#A1A1AA", lineHeight: 1.5 }}>Are you sure? This will replace your current site.</p>
                        {regenerateError && <p style={{ margin: "8px 0 0", fontFamily: "var(--font-space-mono), monospace", fontSize: 11, color: "#f87171" }}>{regenerateError}</p>}
                        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                          <button type="button" onClick={() => { setRegenerateError(null); void handleRegenerateSiteConfirmed(); }} disabled={buildingLanding}
                            style={{ flex: 1, border: "none", background: "#06B6D4", color: "#000000", fontFamily: "var(--font-space-mono), monospace", fontSize: 11, letterSpacing: "0.1em", padding: "10px 12px", cursor: buildingLanding ? "not-allowed" : "pointer" }}>
                            YES
                          </button>
                          <button type="button" onClick={() => { setRegenerateConfirm(false); setRegenerateError(null); }} disabled={buildingLanding}
                            style={{ flex: 1, border: "1px solid #06B6D4", background: "transparent", color: "#06B6D4", fontFamily: "var(--font-space-mono), monospace", fontSize: 11, letterSpacing: "0.1em", padding: "10px 12px", cursor: buildingLanding ? "not-allowed" : "pointer" }}>
                            NO
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => { setRegenerateError(null); setRegenerateConfirm(true); }} disabled={buildingLanding || !offer}
                        style={{ marginTop: 12, width: "100%", border: "none", background: "#06B6D4", color: "#000000", fontFamily: "var(--font-bebas-neue), sans-serif", fontSize: 14, letterSpacing: "0.05em", padding: "12px 20px", cursor: buildingLanding || !offer ? "not-allowed" : "pointer" }}>
                        REGENERATE SITE →
                      </button>
                    )}
                    <p style={{ margin: "8px 0 0", fontFamily: "var(--font-space-mono), monospace", fontSize: 10, color: "#52525B" }}>Share this link with potential clients</p>
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
