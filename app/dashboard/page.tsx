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
import DomainConnect from "@/components/DomainConnect";
import { getSupabaseClient } from "@/lib/supabase";

type Offer = {
  offer: string;
  audience: string;
  pricing: string;
  positioning: string;
  headline: string;
};

type DashChatMessage = { role: "user" | "assistant"; text: string };

type ProfileRow = {
  display_name: string | null;
  telegram: string | null;
  whatsapp: string | null;
};

type UiLocale = "en" | "ru";
type UiTheme = "dark" | "light";
type DashboardLayerId = "01" | "02" | "03" | "04" | "05" | "06" | "settings";

const UI_LOCALE_STORAGE_KEY = "lacore-ui-locale";
const UI_THEME_STORAGE_KEY = "lacore-theme";

const DASH_COPY: Record<
  UiLocale,
  {
    settingsTitle: string;
    profileHeading: string;
    appearanceHeading: string;
    accountHeading: string;
    displayName: string;
    email: string;
    telegram: string;
    whatsapp: string;
    saveChanges: string;
    saving: string;
    interfaceLanguage: string;
    themeLabel: string;
    signOut: string;
    deleteAccount: string;
    comingSoon: string;
    closeSettings: string;
    salesBuilderTagline: string;
    signOutShort: string;
    domainHeading: string;
    domainNeedLanding: string;
  }
> = {
  en: {
    settingsTitle: "SETTINGS",
    profileHeading: "PROFILE",
    appearanceHeading: "APPEARANCE",
    accountHeading: "ACCOUNT",
    displayName: "DISPLAY NAME",
    email: "EMAIL",
    telegram: "TELEGRAM USERNAME",
    whatsapp: "WHATSAPP",
    saveChanges: "SAVE CHANGES",
    saving: "SAVING…",
    interfaceLanguage: "INTERFACE LANGUAGE",
    themeLabel: "THEME",
    signOut: "SIGN OUT",
    deleteAccount: "DELETE ACCOUNT",
    comingSoon: "Coming soon",
    closeSettings: "Close settings",
    salesBuilderTagline: "Your AI system for getting clients",
    signOutShort: "SIGN OUT",
    domainHeading: "DOMAIN",
    domainNeedLanding: "Publish your landing page first to connect a custom domain."
  },
  ru: {
    settingsTitle: "НАСТРОЙКИ",
    profileHeading: "ПРОФИЛЬ",
    appearanceHeading: "ОФОРМЛЕНИЕ",
    accountHeading: "АККАУНТ",
    displayName: "ОТОБРАЖАЕМОЕ ИМЯ",
    email: "EMAIL",
    telegram: "TELEGRAM",
    whatsapp: "WHATSAPP",
    saveChanges: "СОХРАНИТЬ",
    saving: "СОХРАНЕНИЕ…",
    interfaceLanguage: "ЯЗЫК ИНТЕРФЕЙСА",
    themeLabel: "ТЕМА",
    signOut: "ВЫЙТИ",
    deleteAccount: "УДАЛИТЬ АККАУНТ",
    comingSoon: "Скоро",
    closeSettings: "Закрыть настройки",
    salesBuilderTagline: "Ваш ИИ для привлечения клиентов",
    signOutShort: "ВЫЙТИ",
    domainHeading: "ДОМЕН",
    domainNeedLanding: "Сначала опубликуйте лендинг, чтобы подключить свой домен."
  }
};

function buildSalesBuilderIntro(savedDisplayNameFromDb: string | null): string {
  const bullets = `Here's what we can do together:
→ Sharpen your offer & positioning
→ Optimize your landing page copy
→ Plan your content strategy
→ Set up your lead capture system
→ Close more deals with scripts

What's your biggest challenge right now?`;

  const core = `I'm building your sales machine.

${bullets}`;

  const trimmed = savedDisplayNameFromDb?.trim();
  if (!trimmed) {
    return core;
  }
  const first = trimmed.split(/\s+/)[0] ?? trimmed;
  return `Hi ${first}! I'm your LACORE Sales Builder.

${core}`;
}

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

function profileInitialsFromName(displayName: string, emailAddr: string): string {
  const name = displayName.trim();
  if (name.length > 0) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0]![0] + parts[1]![0]).toUpperCase();
    }
    if (name.length >= 2) return name.slice(0, 2).toUpperCase();
    return (name[0] ?? "?").toUpperCase();
  }
  return emailToInitials(emailAddr);
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
  const [chatMessages, setChatMessages] = useState<DashChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [savedProfileDisplayName, setSavedProfileDisplayName] = useState<string | null>(null);
  const [profileTelegram, setProfileTelegram] = useState("");
  const [profileWhatsapp, setProfileWhatsapp] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeDesktopView, setActiveDesktopView] = useState<DashboardLayerId>("01");
  const desktopViewInitRef = useRef(false);
  const [uiLocale, setUiLocale] = useState<UiLocale>("en");
  const [uiTheme, setUiTheme] = useState<UiTheme>("dark");
  const router = useRouter();

  const offerContext = useMemo(() => {
    if (!offer) {
      return "No offer saved yet. The user can generate an offer from the home page.";
    }
    return `OFFER: ${offer.offer}\nAUDIENCE: ${offer.audience}\nPRICING: ${offer.pricing}\nPOSITIONING: ${offer.positioning}\nHEADLINE: ${offer.headline}`;
  }, [offer]);

  const t = DASH_COPY[uiLocale];

  const navUserLabel = useMemo(() => {
    const n = savedProfileDisplayName?.trim();
    return n && n.length > 0 ? n : email;
  }, [savedProfileDisplayName, email]);

  const sidebarInitials = useMemo(
    () => profileInitialsFromName(savedProfileDisplayName ?? profileDisplayName, email),
    [savedProfileDisplayName, profileDisplayName, email]
  );

  const profileAvatarInitials = useMemo(
    () => profileInitialsFromName(profileDisplayName, email),
    [profileDisplayName, email]
  );

  const offerTextareaStyle: CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid var(--accent)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    fontSize: 13,
    lineHeight: 1.6,
    padding: "10px 12px",
    width: "100%",
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box"
  };
  const offerInputStyle: CSSProperties = { ...offerTextareaStyle, resize: "none" };

  const profileFieldStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid var(--border-primary)",
    background: "var(--bg-card)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    fontSize: 13,
    lineHeight: 1.5,
    padding: "10px 12px",
    outline: "none",
    borderRadius: 4
  };

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
    try {
      const raw = localStorage.getItem(UI_LOCALE_STORAGE_KEY);
      if (raw === "ru" || raw === "en") setUiLocale(raw);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(UI_THEME_STORAGE_KEY);
      if (raw === "light" || raw === "dark") {
        setUiTheme(raw);
        document.documentElement.setAttribute("data-theme", raw);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!settingsOpen || !isMobile) return;
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setSettingsOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settingsOpen, isMobile]);

  useEffect(() => {
    if (loading) return;
    if (!desktopViewInitRef.current) {
      desktopViewInitRef.current = true;
      setActiveDesktopView(landingSlug ? "02" : "01");
    }
  }, [loading, landingSlug]);

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

      const metaName =
        typeof session.user.user_metadata?.full_name === "string"
          ? session.user.user_metadata.full_name
          : "";
      const defaultDisplayName = metaName || (session.user.email?.split("@")[0] ?? "");

      const profileRow = await supabase
        .from("profiles")
        .select("display_name, telegram, whatsapp")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const profileData = profileRow.data as ProfileRow | null;
      const dbDisplayName = profileData?.display_name?.trim() || null;
      setSavedProfileDisplayName(dbDisplayName);

      if (!profileRow.error && profileData) {
        setProfileDisplayName(dbDisplayName ?? defaultDisplayName);
        setProfileTelegram(profileData.telegram ?? "");
        setProfileWhatsapp(profileData.whatsapp ?? "");
      } else {
        setProfileDisplayName(defaultDisplayName);
        setProfileTelegram("");
        setProfileWhatsapp("");
      }

      setChatMessages([{ role: "assistant", text: buildSalesBuilderIntro(dbDisplayName) }]);

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

  async function handleSaveProfile() {
    if (!userId) return;
    setProfileSaveError(null);
    setProfileSaving(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("profiles").upsert(
        {
          user_id: userId,
          display_name: profileDisplayName.trim(),
          telegram: profileTelegram.trim(),
          whatsapp: profileWhatsapp.trim(),
          updated_at: new Date().toISOString()
        } as never,
        {
          onConflict: "user_id",
          ignoreDuplicates: false
        }
      );

      if (error) {
        console.error("Profile save error:", JSON.stringify(error));
        setProfileSaveError("Could not save: " + error.message);
        return;
      }

      setSavedProfileDisplayName(profileDisplayName.trim() || null);
    } finally {
      setProfileSaving(false);
    }
  }

  function setDashboardLocale(next: UiLocale) {
    setUiLocale(next);
    try {
      localStorage.setItem(UI_LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function setDashboardTheme(next: UiTheme) {
    setUiTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(UI_THEME_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
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
      <main style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", padding: 24 }}>
        <p style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif", color: "var(--text-muted)" }}>Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main
      className="dash-root"
      style={{
        display: "flex",
        height: "100vh",
        minHeight: "100vh",
        maxHeight: "100vh",
        overflow: "hidden",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        position: "relative",
        fontFamily: "inherit"
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
            border-bottom: 1px solid var(--border-primary);
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
            background: "var(--bg-primary)",
            overflow: "hidden"
          }}
        >
          <aside
            style={{
              width: isMobile ? "100%" : 360,
              flexShrink: 0,
              background: "var(--bg-primary)",
              borderRight: isMobile ? "none" : "1px solid var(--border-primary)",
              borderBottom: isMobile ? "1px solid var(--border-primary)" : "none",
              display: "flex",
              flexDirection: "column",
              maxHeight: isMobile ? "42vh" : "100%",
              minHeight: 0
            }}
          >
            <div style={{ flexShrink: 0, padding: "20px 20px 16px", borderBottom: "1px solid var(--border-primary)" }}>
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
                    background: "var(--bg-card)",
                    borderLeft: "3px solid var(--accent)",
                    padding: "12px 14px",
                    borderRadius: "0 4px 4px 0"
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
              background: "var(--bg-primary)",
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
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                  fontWeight: 800,
                  fontSize: 48,
                  lineHeight: 1,
                  color: "var(--accent)",
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
                  background: "var(--border-primary)",
                  borderRadius: 1,
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    height: 3,
                    width: `${buildProgressWidth}%`,
                    background: "var(--accent)",
                    transition: "width 90s linear",
                    borderRadius: 1
                  }}
                />
              </div>
              <p
                style={{
                  margin: "14px 0 0",
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  lineHeight: 1.5
                }}
              >
                {buildLogVisible > 0 ? buildingLogMessages[buildLogVisible - 1] : "Starting..."}
              </p>
              <p
                style={{
                  margin: "10px 0 0",
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                  fontSize: 10,
                  color: "var(--text-muted)",
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
            background: "color-mix(in srgb, var(--bg-primary) 90%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
        >
          <div style={{ width: "100%", maxWidth: 480, border: "1px solid var(--border-primary)", background: "var(--bg-primary)", padding: 20 }}>
            <h3
              style={{
                margin: 0,
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif", fontWeight: 800, letterSpacing: "-0.02em",
                fontSize: 36,
                color: "var(--text-primary)",
                lineHeight: 1
              }}
            >
              TELL US ABOUT YOUR BUSINESS
            </h3>
            <p
              style={{
                margin: "8px 0 0",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                fontSize: 11,
                color: "var(--text-secondary)"
              }}
            >
              3 quick questions to make your landing page 10x better
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
                  BUSINESS NAME
                </p>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Nike, Alex Design Studio, LexLaw..."
                  style={{
                    width: "100%",
                    marginTop: 6,
                    border: "1px solid var(--border-primary)",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    padding: "10px 12px",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
                          border: `1px solid ${selected ? "var(--accent)" : "var(--border-primary)"}`,
                          background: selected ? "var(--accent)" : "transparent",
                          color: selected ? "#000000" : "var(--text-secondary)",
                          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
                  {["💼 Professional & trustworthy", "⚡ Bold & energetic", "💎 Luxury & premium", "🤝 Warm & approachable"].map(
                    (vibe) => {
                      const selected = siteVibe === vibe;
                      return (
                        <button
                          key={vibe}
                          type="button"
                          onClick={() => setSiteVibe(vibe)}
                          style={{
                            border: `1px solid ${selected ? "var(--accent)" : "var(--border-primary)"}`,
                            background: selected ? "var(--accent)" : "transparent",
                            color: selected ? "#000000" : "var(--text-secondary)",
                            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
                  border: "1px solid var(--accent)",
                  background: "transparent",
                  color: "var(--accent)",
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
                    !businessName.trim() || primaryGoals.length === 0 || !siteVibe ? "var(--border-primary)" : "var(--accent)",
                  color:
                    !businessName.trim() || primaryGoals.length === 0 || !siteVibe ? "var(--text-muted)" : "#000000",
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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

      {isMobile ? (
      <aside
        className="dash-sales-panel"
        style={{
          width: 420,
          flexShrink: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border-primary)",
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
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontWeight: 800,
              fontSize: 22,
              color: "var(--accent)",
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
                background: "var(--bg-card)",
                border: "1px solid var(--border-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--accent)",
                flexShrink: 0
              }}
            >
              {sidebarInitials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                  fontSize: 11,
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
                title={email}
              >
                {navUserLabel}
              </p>
              <button
                type="button"
                onClick={handleSignOut}
                style={{
                  marginTop: 6,
                  border: "none",
                  background: "transparent",
                  color: "var(--accent)",
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  padding: 0,
                  cursor: "pointer"
                }}
              >
                {t.signOutShort}
              </button>
            </div>
          </div>
          <div style={{ marginTop: 14, height: 1, background: "var(--border-primary)" }} />
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
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  color: "var(--accent)"
                }}
              >
                ● SALES BUILDER
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                fontSize: 11,
                color: "var(--text-muted)",
                lineHeight: 1.5
              }}
            >
              {t.salesBuilderTagline}
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
                background: m.role === "user" ? "var(--bg-input)" : "var(--bg-card)",
                border: m.role === "user" ? "1px solid var(--border-primary)" : "none",
                borderLeft: m.role === "assistant" ? "3px solid var(--accent)" : undefined
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                  fontSize: 12,
                  color: "var(--text-primary)",
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
                background: "var(--bg-card)",
                borderLeft: "3px solid var(--accent)",
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
                    background: "var(--accent)",
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
            borderTop: "1px solid var(--border-primary)",
            padding: "12px 14px 16px",
            background: "var(--bg-surface)",
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
              border: "1px solid var(--border-primary)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
              background: chatLoading || !chatInput.trim() ? "var(--border-primary)" : "var(--accent)",
              color: chatLoading || !chatInput.trim() ? "var(--text-muted)" : "#000000",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
      ) : (
        <>
          <aside
            className="dash-desktop-sidebar"
            style={{
              width: 280,
              flexShrink: 0,
              height: "100vh",
              display: "flex",
              flexDirection: "column",
              background: "var(--bg-secondary)",
              borderRight: "1px solid var(--border-primary)",
              minHeight: 0,
              fontFamily: "inherit"
            }}
          >
            <div style={{ flexShrink: 0, padding: "16px 16px 12px" }}>
              <button
                type="button"
                onClick={() => router.push("/")}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 800,
                  fontSize: 18,
                  color: "var(--accent)",
                  padding: 0,
                  letterSpacing: "0.02em",
                  display: "block",
                  marginBottom: 14
                }}
              >
                ← LACORE
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "inherit",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#000000",
                    flexShrink: 0
                  }}
                >
                  {sidebarInitials}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "inherit",
                      fontSize: 11,
                      color: "var(--text-primary)",
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
                      color: "var(--accent)",
                      fontFamily: "inherit",
                      fontSize: 9,
                      letterSpacing: "0.12em",
                      padding: 0,
                      cursor: "pointer"
                    }}
                  >
                    {t.signOutShort}
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 14, height: 1, background: "var(--border-primary)" }} />
            </div>
            <nav
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "6px 0",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                gap: 2
              }}
            >
              {(
                [
                  { id: "01" as const, num: "01", title: "OFFER", soon: false, badge: offer ? "✓ DONE" : "—" },
                  { id: "02" as const, num: "02", title: "LANDING PAGE", soon: false, badge: landingSlug ? "✓ LIVE" : "NEXT" },
                  { id: "03" as const, num: "03", title: "CONTENT", soon: true, badge: "SOON" },
                  { id: "04" as const, num: "04", title: "LEADS", soon: true, badge: "SOON" },
                  { id: "05" as const, num: "05", title: "CLOSING", soon: true, badge: "SOON" },
                  { id: "06" as const, num: "06", title: "ANALYTICS", soon: true, badge: "SOON" }
                ] as const
              ).map((layerNav) => {
                const active = activeDesktopView === layerNav.id;
                return (
                  <button
                    key={layerNav.id}
                    type="button"
                    onClick={() => setActiveDesktopView(layerNav.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                      background: active
                        ? "color-mix(in srgb, var(--accent) 10%, var(--bg-secondary))"
                        : "transparent",
                      color: active
                        ? "var(--accent)"
                        : layerNav.soon
                          ? "var(--text-muted)"
                          : "var(--text-primary)"
                    }}
                  >
                    <span style={{ fontSize: 12 }}>
                      <span style={{ opacity: 0.55, marginRight: 8 }}>{layerNav.num}</span>
                      <span style={{ letterSpacing: "0.06em", fontSize: 11 }}>{layerNav.title}</span>
                    </span>
                    <span
                      style={{
                        fontSize: 8,
                        letterSpacing: "0.08em",
                        color: active ? "var(--accent)" : "var(--text-muted)",
                        flexShrink: 0
                      }}
                    >
                      [{layerNav.badge}]
                    </span>
                  </button>
                );
              })}
            </nav>
            <div style={{ flexShrink: 0, padding: "12px 10px 16px", borderTop: "1px solid var(--border-primary)" }}>
              <button
                type="button"
                onClick={() => setActiveDesktopView("settings")}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  background:
                    activeDesktopView === "settings"
                      ? "color-mix(in srgb, var(--accent) 10%, var(--bg-secondary))"
                      : "transparent",
                  borderLeft: activeDesktopView === "settings" ? "2px solid var(--accent)" : "2px solid transparent",
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  color: activeDesktopView === "settings" ? "var(--accent)" : "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10
                }}
              >
                <span aria-hidden>⚙️</span>
                {t.settingsTitle}
              </button>
            </div>
          </aside>

          <aside
            className="dash-desktop-chat"
            style={{
              width: 400,
              flexShrink: 0,
              height: "100vh",
              display: "flex",
              flexDirection: "column",
              background: "var(--bg-primary)",
              borderRight: "1px solid var(--border-primary)",
              minHeight: 0,
              fontFamily: "inherit"
            }}
          >
            <div
              style={{
                flexShrink: 0,
                padding: "14px 16px",
                borderBottom: "1px solid var(--border-primary)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                    fontFamily: "inherit",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    color: "var(--accent)"
                  }}
                >
                  ● SALES BUILDER
                </span>
              </div>
            </div>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "12px 16px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minHeight: 0
              }}
            >
              {chatMessages.map((m, idx) => (
                <div
                  key={`d-${idx}-${m.role}-${m.text.slice(0, 24)}`}
                  style={{
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "94%",
                    borderRadius: 6,
                    padding: "10px 14px",
                    background: m.role === "user" ? "var(--bg-input)" : "var(--bg-card)",
                    border: m.role === "user" ? "1px solid var(--border-primary)" : "none",
                    borderLeft: m.role === "assistant" ? "3px solid var(--accent)" : undefined
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "inherit",
                      fontSize: 12,
                      color: "var(--text-primary)",
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
                    background: "var(--bg-card)",
                    borderLeft: "3px solid var(--accent)",
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
                        background: "var(--accent)",
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
                borderTop: "1px solid var(--border-primary)",
                padding: "12px 14px 16px",
                background: "var(--bg-primary)",
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
                  border: "1px solid var(--border-primary)",
                  background: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
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
                  background: chatLoading || !chatInput.trim() ? "var(--border-primary)" : "var(--accent)",
                  color: chatLoading || !chatInput.trim() ? "var(--text-muted)" : "#000000",
                  fontFamily: "inherit",
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
        </>
      )}

      {/* RIGHT: main content */}
      {isMobile ? (
      <div
        className="dash-content-panel"
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "var(--bg-primary)"
        }}
      >
        <nav
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 12,
            borderBottom: "1px solid var(--border-primary)",
            padding: "14px 24px"
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontSize: 12,
              color: "var(--text-secondary)",
              maxWidth: "min(50vw, 280px)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
            title={email}
          >
            {navUserLabel}
          </p>
          <button
            type="button"
            onClick={() => {
              setProfileSaveError(null);
              setSettingsOpen(true);
            }}
            aria-label={t.settingsTitle}
            style={{
              border: "1px solid var(--border-primary)",
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
              fontSize: 18,
              lineHeight: 1,
              width: 40,
              height: 40,
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0
            }}
          >
            ⚙️
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
              <div style={{ border: "1px solid var(--border-primary)", background: "var(--bg-input)", padding: 24 }}>
                <h1
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif", fontWeight: 800, letterSpacing: "-0.02em",
                    fontSize: 54,
                    lineHeight: 1,
                    color: "var(--text-primary)"
                  }}
                >
                  YOUR OFFER IS WAITING
                </h1>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  style={{
                    marginTop: 16,
                    border: "1px solid var(--accent)",
                    background: "transparent",
                    color: "var(--accent)",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
                  border: "1px solid var(--accent)",
                  background: "var(--bg-input)",
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
                        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                        fontWeight: 800,
                        fontSize: 38,
                        lineHeight: 1,
                        letterSpacing: "0.04em",
                        color: "var(--accent)"
                      }}
                    >
                      YOUR OFFER
                    </h2>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
                        border: "1px solid var(--border-primary)",
                        color: "var(--text-secondary)",
                        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
                        borderBottom: idx === 4 ? "none" : "1px solid var(--border-secondary)",
                        padding: "14px 0"
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                          fontSize: 10,
                          letterSpacing: "0.2em",
                          color: "var(--accent)"
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
                            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                            fontSize: 14,
                            lineHeight: 1.6,
                            color: "var(--text-primary)"
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
                          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
                        background: "var(--accent)",
                        color: "#000000",
                        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                        fontWeight: 800,
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
                        border: "1px solid var(--accent)",
                        background: "transparent",
                        color: "var(--accent)",
                        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
              border: "1px solid var(--border-primary)",
              background: "var(--bg-secondary)",
              padding: 18,
              borderRadius: 4
            }}
          >
            <h3
              style={{
                margin: 0,
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                fontWeight: 800,
                fontSize: 32,
                color: "var(--text-primary)",
                letterSpacing: "0.02em"
              }}
            >
              WHAT&apos;S NEXT
            </h3>
            <p
              style={{
                margin: "6px 0 14px",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                fontSize: 11,
                color: "var(--text-muted)",
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
                        ? "1px solid var(--accent)"
                        : layer.status === "next"
                          ? "1px solid color-mix(in srgb, var(--accent) 55%, var(--border-primary))"
                          : "1px solid var(--border-primary)",
                    background:
                      layer.status === "next"
                        ? "linear-gradient(180deg, color-mix(in srgb, var(--accent) 8%, transparent), color-mix(in srgb, var(--accent) 1%, transparent))"
                        : "var(--bg-card)",
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
                        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                        fontSize: 10,
                        letterSpacing: "0.14em",
                        color: "var(--text-muted)"
                      }}
                    >
                      LAYER {layer.number}
                    </p>
                    <span
                      style={{
                        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                        fontSize: 9,
                        letterSpacing: "0.12em",
                        color: layer.status === "locked" ? "var(--text-muted)" : "var(--accent)"
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
                      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                      fontWeight: 800,
                      fontSize: 22,
                      letterSpacing: "-0.02em",
                      color:
                        layer.status === "completed"
                          ? "var(--accent)"
                          : layer.status === "next"
                            ? "var(--text-primary)"
                            : "var(--text-secondary)"
                    }}
                  >
                    {layer.title}
                  </p>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                      fontSize: 11,
                      lineHeight: 1.55,
                      color: layer.status === "next" ? "var(--text-secondary)" : "var(--text-muted)"
                    }}
                  >
                    {layer.description}
                  </p>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                      fontSize: 10,
                      lineHeight: 1.6,
                      color: "var(--text-muted)"
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
                        border: "1px solid var(--border-primary)",
                        background: "var(--bg-surface)"
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
                          background: "var(--accent)",
                          color: "#000000",
                          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                          fontWeight: 800,
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
                          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                          fontSize: 11,
                          color: "var(--text-muted)"
                        }}
                      >
                        No design skills needed.
                      </p>
                      {buildError && (
                        <p
                          style={{
                            margin: "8px 0 0",
                            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
                          border: "1px solid var(--accent)",
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
                            color: "var(--accent)",
                            textDecoration: "none",
                            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                            fontSize: 11
                          }}
                        >
                          lacore.ai/p/{landingSlug}
                        </a>
                        <button
                          type="button"
                          onClick={handleCopyUrl}
                          style={{
                            border: "1px solid var(--border-primary)",
                            background: "transparent",
                            color: "var(--text-secondary)",
                            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
                            border: "1px solid var(--accent)",
                            color: "var(--accent)",
                            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
                            border: "1px solid var(--accent)",
                            color: "var(--accent)",
                            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                            fontSize: 11,
                            padding: "8px 12px"
                          }}
                        >
                          EDIT PAGE →
                        </a>
                      </div>
                      {userId ? (
                        <div style={{ marginTop: 12 }}>
                          <DomainConnect slug={landingSlug} userId={userId} />
                        </div>
                      ) : null}
                      {regenerateConfirm ? (
                        <div style={{ marginTop: 12 }}>
                          <p
                            style={{
                              margin: 0,
                              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                              fontSize: 11,
                              color: "var(--text-secondary)",
                              lineHeight: 1.5
                            }}
                          >
                            Are you sure? This will replace your current site.
                          </p>
                          {regenerateError && (
                            <p
                              style={{
                                margin: "8px 0 0",
                                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
                                background: "var(--accent)",
                                color: "#000000",
                                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
                                border: "1px solid var(--accent)",
                                background: "transparent",
                                color: "var(--accent)",
                                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
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
                            background: "var(--accent)",
                            color: "#000000",
                            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                            fontWeight: 800,
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
                          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                          fontSize: 10,
                          color: "var(--text-muted)"
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
      ) : (
        <div
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "var(--bg-primary)",
            fontFamily: "inherit"
          }}
        >
          <div style={{ flex: 1, overflowY: "auto", padding: 24, minHeight: 0 }}>
            {activeDesktopView === "settings" ? (
              <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 28 }}>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: "inherit",
                    fontWeight: 800,
                    fontSize: 22,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--accent)"
                  }}
                >
                  {t.settingsTitle}
                </h2>
                <section>
                  <p
                    style={{
                      margin: "0 0 14px",
                      fontFamily: "inherit",
                      fontSize: 10,
                      letterSpacing: "0.2em",
                      color: "var(--accent)"
                    }}
                  >
                    {t.profileHeading}
                  </p>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        background: "var(--accent)",
                        color: "#000000",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "inherit",
                        fontWeight: 800,
                        fontSize: 18,
                        flexShrink: 0
                      }}
                      aria-hidden
                    >
                      {profileAvatarInitials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 12 }}>
                      <div>
                        <p
                          style={{
                            margin: "0 0 6px",
                            fontFamily: "inherit",
                            fontSize: 10,
                            letterSpacing: "0.18em",
                            color: "var(--text-muted)"
                          }}
                        >
                          {t.displayName}
                        </p>
                        <input
                          type="text"
                          value={profileDisplayName}
                          onChange={(e) => setProfileDisplayName(e.target.value)}
                          style={profileFieldStyle}
                          autoComplete="name"
                        />
                      </div>
                      <div>
                        <p
                          style={{
                            margin: "0 0 6px",
                            fontFamily: "inherit",
                            fontSize: 10,
                            letterSpacing: "0.18em",
                            color: "var(--text-muted)"
                          }}
                        >
                          {t.email}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontFamily: "inherit",
                            fontSize: 13,
                            color: "var(--text-secondary)",
                            wordBreak: "break-all"
                          }}
                        >
                          {email || "—"}
                        </p>
                      </div>
                      <div>
                        <p
                          style={{
                            margin: "0 0 6px",
                            fontFamily: "inherit",
                            fontSize: 10,
                            letterSpacing: "0.18em",
                            color: "var(--text-muted)"
                          }}
                        >
                          {t.telegram}
                        </p>
                        <input
                          type="text"
                          value={profileTelegram}
                          onChange={(e) => setProfileTelegram(e.target.value)}
                          placeholder="@username"
                          style={profileFieldStyle}
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <p
                          style={{
                            margin: "0 0 6px",
                            fontFamily: "inherit",
                            fontSize: 10,
                            letterSpacing: "0.18em",
                            color: "var(--text-muted)"
                          }}
                        >
                          {t.whatsapp}
                        </p>
                        <input
                          type="text"
                          value={profileWhatsapp}
                          onChange={(e) => setProfileWhatsapp(e.target.value)}
                          placeholder="+995..."
                          style={profileFieldStyle}
                          autoComplete="tel"
                        />
                      </div>
                      {profileSaveError ? (
                        <p style={{ margin: 0, fontFamily: "inherit", fontSize: 11, color: "#f87171" }}>{profileSaveError}</p>
                      ) : null}
                      <button
                        type="button"
                        disabled={profileSaving}
                        onClick={() => void handleSaveProfile()}
                        style={{
                          border: "none",
                          background: profileSaving ? "var(--border-primary)" : "var(--accent)",
                          color: profileSaving ? "var(--text-muted)" : "#000000",
                          fontFamily: "inherit",
                          fontSize: 11,
                          letterSpacing: "0.14em",
                          padding: "12px 20px",
                          cursor: profileSaving ? "not-allowed" : "pointer",
                          justifySelf: "start"
                        }}
                      >
                        {profileSaving ? t.saving : t.saveChanges}
                      </button>
                    </div>
                  </div>
                </section>
                <div style={{ height: 1, background: "var(--border-primary)" }} />
                <section>
                  <p
                    style={{
                      margin: "0 0 12px",
                      fontFamily: "inherit",
                      fontSize: 10,
                      letterSpacing: "0.2em",
                      color: "var(--accent)"
                    }}
                  >
                    {t.appearanceHeading}
                  </p>
                  <p style={{ margin: "0 0 10px", fontFamily: "inherit", fontSize: 11, color: "var(--text-muted)" }}>
                    {t.themeLabel}
                  </p>
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    {(["dark", "light"] as const).map((theme) => (
                      <button
                        key={theme}
                        type="button"
                        onClick={() => setDashboardTheme(theme)}
                        style={{
                          flex: 1,
                          border:
                            uiTheme === theme ? "1px solid var(--accent)" : "1px solid var(--border-primary)",
                          background:
                            uiTheme === theme
                              ? "color-mix(in srgb, var(--accent) 14%, transparent)"
                              : "var(--bg-card)",
                          color: uiTheme === theme ? "var(--accent)" : "var(--text-secondary)",
                          fontFamily: "inherit",
                          fontSize: 12,
                          letterSpacing: "0.1em",
                          padding: "10px 12px",
                          cursor: "pointer"
                        }}
                      >
                        {theme === "dark" ? "● DARK" : "◐ LIGHT"}
                      </button>
                    ))}
                  </div>
                  <p style={{ margin: "0 0 10px", fontFamily: "inherit", fontSize: 11, color: "var(--text-muted)" }}>
                    {t.interfaceLanguage}
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["en", "ru"] as const).map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setDashboardLocale(code)}
                        style={{
                          flex: 1,
                          border:
                            uiLocale === code ? "1px solid var(--accent)" : "1px solid var(--border-primary)",
                          background:
                            uiLocale === code
                              ? "color-mix(in srgb, var(--accent) 14%, transparent)"
                              : "var(--bg-card)",
                          color: uiLocale === code ? "var(--accent)" : "var(--text-secondary)",
                          fontFamily: "inherit",
                          fontSize: 12,
                          letterSpacing: "0.14em",
                          padding: "10px 12px",
                          cursor: "pointer"
                        }}
                      >
                        {code.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </section>
                <div style={{ height: 1, background: "var(--border-primary)" }} />
                <section>
                  <p
                    style={{
                      margin: "0 0 14px",
                      fontFamily: "inherit",
                      fontSize: 10,
                      letterSpacing: "0.2em",
                      color: "var(--accent)"
                    }}
                  >
                    {t.accountHeading}
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    style={{
                      border: "1px solid #DC2626",
                      background: "rgba(220,38,38,0.15)",
                      color: "#FCA5A5",
                      fontFamily: "inherit",
                      fontSize: 11,
                      letterSpacing: "0.12em",
                      padding: "12px 16px",
                      cursor: "pointer"
                    }}
                  >
                    {t.signOut}
                  </button>
                </section>
              </div>
            ) : null}

            {activeDesktopView === "01" ? (
              <div>
                {!offer ? (
                  <div style={{ border: "1px solid var(--border-primary)", background: "var(--bg-card)", padding: 24 }}>
                    <h1
                      style={{
                        margin: 0,
                        fontFamily: "inherit",
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        fontSize: 28,
                        color: "var(--text-primary)"
                      }}
                    >
                      YOUR OFFER IS WAITING
                    </h1>
                    <button
                      type="button"
                      onClick={() => router.push("/")}
                      style={{
                        marginTop: 16,
                        border: "1px solid var(--accent)",
                        background: "transparent",
                        color: "var(--accent)",
                        fontFamily: "inherit",
                        fontSize: 11,
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
                      border: "1px solid var(--accent)",
                      background: "var(--bg-card)",
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
                            fontFamily: "inherit",
                            fontWeight: 800,
                            fontSize: 22,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "var(--accent)"
                          }}
                        >
                          YOUR OFFER
                        </h2>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontFamily: "inherit",
                            fontSize: 9,
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
                            border: "1px solid var(--border-primary)",
                            color: "var(--text-secondary)",
                            fontFamily: "inherit",
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
                            borderBottom: idx === 4 ? "none" : "1px solid var(--border-secondary)",
                            padding: "14px 0"
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontFamily: "inherit",
                              fontSize: 10,
                              letterSpacing: "0.2em",
                              color: "var(--accent)"
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
                                fontFamily: "inherit",
                                fontSize: 14,
                                lineHeight: 1.6,
                                color: "var(--text-primary)"
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
                          <p style={{ margin: 0, fontFamily: "inherit", fontSize: 11, color: "#f87171" }}>
                            {offerSaveError}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleSaveOffer()}
                          style={{
                            width: "100%",
                            border: "none",
                            background: "var(--accent)",
                            color: "#000000",
                            fontFamily: "inherit",
                            fontWeight: 800,
                            fontSize: 16,
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
                            border: "1px solid var(--accent)",
                            background: "transparent",
                            color: "var(--accent)",
                            fontFamily: "inherit",
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
            ) : null}

            {activeDesktopView === "02" ? (
              <div style={{ maxWidth: 640 }}>
                <h2
                  style={{
                    margin: "0 0 20px",
                    fontFamily: "inherit",
                    fontWeight: 800,
                    fontSize: 22,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text-primary)"
                  }}
                >
                  LANDING PAGE
                </h2>
                {!landingSlug ? (
                  <div>
                    <p style={{ margin: "0 0 12px", fontFamily: "inherit", fontSize: 13, color: "var(--text-secondary)" }}>
                      Build a full page from your offer — no design skills required.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowOnboarding(true)}
                      disabled={!offer || buildingLanding}
                      style={{
                        width: "100%",
                        maxWidth: 400,
                        border: "none",
                        background: "var(--accent)",
                        color: "#000000",
                        fontFamily: "inherit",
                        fontWeight: 800,
                        fontSize: 16,
                        letterSpacing: "0.05em",
                        padding: "16px 24px",
                        cursor: !offer || buildingLanding ? "not-allowed" : "pointer"
                      }}
                    >
                      BUILD MY LANDING PAGE →
                    </button>
                    {buildError && (
                      <p style={{ margin: "10px 0 0", fontFamily: "inherit", fontSize: 11, color: "#f87171" }}>{buildError}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        borderRadius: 6,
                        overflow: "hidden",
                        border: "1px solid var(--border-primary)",
                        background: "var(--bg-card)"
                      }}
                    >
                      <iframe
                        title="Landing preview"
                        src={`/p/${landingSlug}`}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
                        style={{
                          width: "100%",
                          height: 280,
                          border: "none",
                          display: "block",
                          pointerEvents: "none"
                        }}
                      />
                    </div>
                    <div
                      style={{
                        marginTop: 14,
                        border: "1px solid var(--accent)",
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
                          color: "var(--accent)",
                          textDecoration: "none",
                          fontFamily: "inherit",
                          fontSize: 11
                        }}
                      >
                        lacore.ai/p/{landingSlug}
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        style={{
                          border: "1px solid var(--border-primary)",
                          background: "transparent",
                          color: "var(--text-secondary)",
                          fontFamily: "inherit",
                          fontSize: 10,
                          padding: "4px 8px",
                          cursor: "pointer"
                        }}
                      >
                        COPY
                      </button>
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <a
                        href={`/p/${landingSlug}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          flex: 1,
                          minWidth: 120,
                          textAlign: "center",
                          textDecoration: "none",
                          border: "1px solid var(--accent)",
                          color: "var(--accent)",
                          fontFamily: "inherit",
                          fontSize: 11,
                          padding: "10px 12px"
                        }}
                      >
                        PREVIEW →
                      </a>
                      <a
                        href={`/p/${landingSlug}?edit=true`}
                        style={{
                          flex: 1,
                          minWidth: 120,
                          textAlign: "center",
                          textDecoration: "none",
                          border: "1px solid var(--accent)",
                          color: "var(--accent)",
                          fontFamily: "inherit",
                          fontSize: 11,
                          padding: "10px 12px"
                        }}
                      >
                        EDIT PAGE →
                      </a>
                    </div>
                    {userId ? (
                      <div style={{ marginTop: 16 }}>
                        <DomainConnect slug={landingSlug} userId={userId} />
                      </div>
                    ) : null}
                    {regenerateConfirm ? (
                      <div style={{ marginTop: 14 }}>
                        <p style={{ margin: 0, fontFamily: "inherit", fontSize: 12, color: "var(--text-secondary)" }}>
                          Are you sure? This will replace your current site.
                        </p>
                        {regenerateError && (
                          <p style={{ margin: "8px 0 0", fontFamily: "inherit", fontSize: 11, color: "#f87171" }}>
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
                              background: "var(--accent)",
                              color: "#000000",
                              fontFamily: "inherit",
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
                              border: "1px solid var(--accent)",
                              background: "transparent",
                              color: "var(--accent)",
                              fontFamily: "inherit",
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
                          marginTop: 14,
                          width: "100%",
                          maxWidth: 400,
                          border: "none",
                          background: "var(--accent)",
                          color: "#000000",
                          fontFamily: "inherit",
                          fontWeight: 800,
                          fontSize: 14,
                          letterSpacing: "0.05em",
                          padding: "12px 20px",
                          cursor: buildingLanding || !offer ? "not-allowed" : "pointer"
                        }}
                      >
                        REGENERATE SITE →
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {activeDesktopView === "03" ? (
              <div style={{ maxWidth: 560 }}>
                <h2
                  style={{
                    margin: "0 0 12px",
                    fontFamily: "inherit",
                    fontWeight: 800,
                    fontSize: 28,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text-primary)"
                  }}
                >
                  CONTENT MACHINE
                </h2>
                <span
                  style={{
                    display: "inline-flex",
                    fontFamily: "inherit",
                    fontSize: 9,
                    letterSpacing: "0.14em",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border-primary)",
                    padding: "4px 10px",
                    marginBottom: 16
                  }}
                >
                  COMING SOON
                </span>
                <p style={{ margin: "16px 0 0", fontFamily: "inherit", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  Automated posts for Instagram, X, LinkedIn and Threads — coming soon.
                </p>
                <ul style={{ margin: "20px 0 0", paddingLeft: 20, fontFamily: "inherit", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  <li>Daily posts on autopilot</li>
                  <li>Platform-specific adaptation</li>
                  <li>AI-generated visuals</li>
                </ul>
              </div>
            ) : null}

            {activeDesktopView === "04" ? (
              <div style={{ maxWidth: 560 }}>
                <h2
                  style={{
                    margin: "0 0 12px",
                    fontFamily: "inherit",
                    fontWeight: 800,
                    fontSize: 24,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text-primary)"
                  }}
                >
                  LEAD CAPTURE
                </h2>
                <span
                  style={{
                    display: "inline-flex",
                    fontFamily: "inherit",
                    fontSize: 9,
                    letterSpacing: "0.14em",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border-primary)",
                    padding: "4px 10px"
                  }}
                >
                  COMING SOON
                </span>
                <p style={{ margin: "20px 0 0", fontFamily: "inherit", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Every form submission captured. Qualify leads automatically. See who&apos;s interested in real time.
                </p>
              </div>
            ) : null}

            {activeDesktopView === "05" ? (
              <div style={{ maxWidth: 560 }}>
                <h2
                  style={{
                    margin: "0 0 12px",
                    fontFamily: "inherit",
                    fontWeight: 800,
                    fontSize: 24,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text-primary)"
                  }}
                >
                  CLOSING SYSTEM
                </h2>
                <span
                  style={{
                    display: "inline-flex",
                    fontFamily: "inherit",
                    fontSize: 9,
                    letterSpacing: "0.14em",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border-primary)",
                    padding: "4px 10px"
                  }}
                >
                  COMING SOON
                </span>
                <p style={{ margin: "20px 0 0", fontFamily: "inherit", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Scripts, follow-ups, objection handling — all automated.
                </p>
              </div>
            ) : null}

            {activeDesktopView === "06" ? (
              <div style={{ maxWidth: 560 }}>
                <h2
                  style={{
                    margin: "0 0 12px",
                    fontFamily: "inherit",
                    fontWeight: 800,
                    fontSize: 24,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text-primary)"
                  }}
                >
                  ANALYTICS DASHBOARD
                </h2>
                <span
                  style={{
                    display: "inline-flex",
                    fontFamily: "inherit",
                    fontSize: 9,
                    letterSpacing: "0.14em",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border-primary)",
                    padding: "4px 10px"
                  }}
                >
                  COMING SOON
                </span>
                <p style={{ margin: "20px 0 0", fontFamily: "inherit", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Full funnel visibility. Revenue tracking. Growth signals.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {isMobile && settingsOpen ? (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2500,
            display: "flex",
            justifyContent: "flex-end",
            background: "rgba(0,0,0,0.55)"
          }}
          onClick={() => setSettingsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.settingsTitle}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            style={{
              width: "min(100vw, 420px)",
              height: "100%",
              background: "var(--bg-input)",
              borderLeft: "1px solid var(--border-primary)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "-8px 0 32px rgba(0,0,0,0.45)"
            }}
          >
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "16px 18px",
                borderBottom: "1px solid var(--border-primary)"
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                  fontWeight: 800,
                  fontSize: 28,
                  letterSpacing: "0.06em",
                  color: "var(--accent)"
                }}
              >
                {t.settingsTitle}
              </h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label={t.closeSettings}
                style={{
                  border: "1px solid var(--border-primary)",
                  background: "var(--bg-card)",
                  color: "var(--text-secondary)",
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                  padding: 0
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px 18px 28px",
                display: "flex",
                flexDirection: "column",
                gap: 28
              }}
            >
              <section>
                <p
                  style={{
                    margin: "0 0 14px",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "var(--accent)"
                  }}
                >
                  {t.profileHeading}
                </p>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      color: "#000000",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                      fontWeight: 800,
                      fontSize: 26,
                      letterSpacing: "0.02em",
                      flexShrink: 0
                    }}
                    aria-hidden
                  >
                    {profileAvatarInitials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 12 }}>
                    <div>
                      <p
                        style={{
                          margin: "0 0 6px",
                          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                          fontSize: 10,
                          letterSpacing: "0.18em",
                          color: "var(--text-muted)"
                        }}
                      >
                        {t.displayName}
                      </p>
                      <input
                        type="text"
                        value={profileDisplayName}
                        onChange={(e) => setProfileDisplayName(e.target.value)}
                        style={profileFieldStyle}
                        autoComplete="name"
                      />
                    </div>
                    <div>
                      <p
                        style={{
                          margin: "0 0 6px",
                          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                          fontSize: 10,
                          letterSpacing: "0.18em",
                          color: "var(--text-muted)"
                        }}
                      >
                        {t.email}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                          fontSize: 13,
                          color: "var(--text-secondary)",
                          wordBreak: "break-all"
                        }}
                      >
                        {email || "—"}
                      </p>
                    </div>
                    <div>
                      <p
                        style={{
                          margin: "0 0 6px",
                          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                          fontSize: 10,
                          letterSpacing: "0.18em",
                          color: "var(--text-muted)"
                        }}
                      >
                        {t.telegram}
                      </p>
                      <input
                        type="text"
                        value={profileTelegram}
                        onChange={(e) => setProfileTelegram(e.target.value)}
                        placeholder="@username"
                        style={profileFieldStyle}
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <p
                        style={{
                          margin: "0 0 6px",
                          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                          fontSize: 10,
                          letterSpacing: "0.18em",
                          color: "var(--text-muted)"
                        }}
                      >
                        {t.whatsapp}
                      </p>
                      <input
                        type="text"
                        value={profileWhatsapp}
                        onChange={(e) => setProfileWhatsapp(e.target.value)}
                        placeholder="+995..."
                        style={profileFieldStyle}
                        autoComplete="tel"
                      />
                    </div>
                    {profileSaveError ? (
                      <p
                        style={{
                          margin: 0,
                          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                          fontSize: 11,
                          color: "#f87171"
                        }}
                      >
                        {profileSaveError}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      disabled={profileSaving}
                      onClick={() => void handleSaveProfile()}
                      style={{
                        border: "none",
                        background: profileSaving ? "var(--border-primary)" : "var(--accent)",
                        color: profileSaving ? "var(--text-muted)" : "#000000",
                        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                        fontSize: 11,
                        letterSpacing: "0.14em",
                        padding: "12px 20px",
                        cursor: profileSaving ? "not-allowed" : "pointer",
                        justifySelf: "start"
                      }}
                    >
                      {profileSaving ? t.saving : t.saveChanges}
                    </button>
                  </div>
                </div>
              </section>

              <div style={{ height: 1, background: "var(--border-primary)" }} />

              <section>
                <p
                  style={{
                    margin: "0 0 14px",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "var(--accent)"
                  }}
                >
                  {t.domainHeading}
                </p>
                {landingSlug && userId ? (
                  <DomainConnect slug={landingSlug} userId={userId} />
                ) : (
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                      fontSize: 12,
                      color: "var(--text-muted)",
                      lineHeight: 1.5
                    }}
                  >
                    {t.domainNeedLanding}
                  </p>
                )}
              </section>

              <div style={{ height: 1, background: "var(--border-primary)" }} />

              <section>
                <p
                  style={{
                    margin: "0 0 12px",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "var(--accent)"
                  }}
                >
                  {t.appearanceHeading}
                </p>
                <p
                  style={{
                    margin: "0 0 10px",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontSize: 11,
                    color: "var(--text-muted)"
                  }}
                >
                  {t.themeLabel}
                </p>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {(["dark", "light"] as const).map((theme) => (
                    <button
                      key={theme}
                      type="button"
                      onClick={() => setDashboardTheme(theme)}
                      style={{
                        flex: 1,
                        border:
                          uiTheme === theme
                            ? "1px solid var(--accent)"
                            : "1px solid var(--border-primary)",
                        background:
                          uiTheme === theme
                            ? "color-mix(in srgb, var(--accent) 14%, transparent)"
                            : "var(--bg-card)",
                        color: uiTheme === theme ? "var(--accent)" : "var(--text-secondary)",
                        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                        fontSize: 12,
                        letterSpacing: "0.1em",
                        padding: "10px 12px",
                        cursor: "pointer"
                      }}
                    >
                      {theme === "dark" ? "● DARK" : "◐ LIGHT"}
                    </button>
                  ))}
                </div>
                <p
                  style={{
                    margin: "0 0 10px",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontSize: 11,
                    color: "var(--text-muted)"
                  }}
                >
                  {t.interfaceLanguage}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["en", "ru"] as const).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setDashboardLocale(code)}
                      style={{
                        flex: 1,
                        border:
                          uiLocale === code ? "1px solid var(--accent)" : "1px solid var(--border-primary)",
                        background:
                          uiLocale === code
                            ? "color-mix(in srgb, var(--accent) 14%, transparent)"
                            : "var(--bg-card)",
                        color: uiLocale === code ? "var(--accent)" : "var(--text-secondary)",
                        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                        fontSize: 12,
                        letterSpacing: "0.14em",
                        padding: "10px 12px",
                        cursor: "pointer"
                      }}
                    >
                      {code.toUpperCase()}
                    </button>
                  ))}
                </div>
              </section>

              <div style={{ height: 1, background: "var(--border-primary)" }} />

              <section>
                <p
                  style={{
                    margin: "0 0 14px",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "var(--accent)"
                  }}
                >
                  {t.accountHeading}
                </p>
                <div style={{ display: "grid", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    style={{
                      border: "1px solid #DC2626",
                      background: "rgba(220,38,38,0.15)",
                      color: "#FCA5A5",
                      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                      fontSize: 11,
                      letterSpacing: "0.12em",
                      padding: "12px 16px",
                      cursor: "pointer"
                    }}
                  >
                    {t.signOut}
                  </button>
                  <button
                    type="button"
                    disabled
                    title={t.comingSoon}
                    style={{
                      border: "1px solid var(--border-secondary)",
                      background: "var(--bg-card)",
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                      fontSize: 11,
                      letterSpacing: "0.12em",
                      padding: "12px 16px",
                      cursor: "not-allowed",
                      opacity: 0.65
                    }}
                  >
                    {t.deleteAccount}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
