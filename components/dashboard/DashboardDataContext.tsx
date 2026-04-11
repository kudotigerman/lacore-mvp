"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { dashToast } from "@/lib/dash-toast";
import { useProjectContext } from "@/app/contexts/ProjectContext";

export type DashboardOffer = {
  offer: string;
  audience: string;
  pricing: string;
  positioning: string;
  headline: string;
};

/** Payload for /api/dashboard-chat — structured business context */
export type SalesBuilderContextPayload = {
  offer: string;
  audience: string;
  pricing: string;
  positioning: string;
  headline: string;
  landingSlug: string | null;
};

type ProfileRow = {
  display_name: string | null;
  telegram: string | null;
  whatsapp: string | null;
  email_notifications: boolean | null;
  telegram_chat_id: string | null;
};

export type UiTheme = "dark" | "light";

export type DashboardFunnelStatus = {
  offer: boolean;
  landing: boolean;
  content: boolean;
  leads: boolean;
  completedSteps: number;
};

const UI_THEME_STORAGE_KEY = "lacore-theme";

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

export function profileInitialsFromName(displayName: string, emailAddr: string): string {
  const name = displayName.trim();
  if (name.length > 0) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0]![0] + parts[1]![0]).toUpperCase();
    }
    if (name.length >= 2) return name.slice(0, 2).toUpperCase();
    return (name[0] ?? "?").toUpperCase();
  }
  const local = emailAddr.split("@")[0] ?? "";
  const cleaned = local.replace(/[^a-zA-Z0-9]/g, " ").trim();
  const p = cleaned.split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0]![0] + p[1]![0]).toUpperCase();
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  return (local[0] ?? "?").toUpperCase();
}

type DashboardDataContextValue = {
  loading: boolean;
  userId: string | null;
  email: string;
  sessionToken: string | null;
  offer: DashboardOffer | null;
  setOffer: (o: DashboardOffer | null) => void;
  refreshOffer: () => Promise<void>;
  landingSlug: string | null;
  setLandingSlug: (s: string | null) => void;
  savedProfileDisplayName: string | null;
  offerContext: string;
  salesBuilderContext: SalesBuilderContextPayload;
  uiTheme: UiTheme;
  setDashboardTheme: (t: UiTheme) => void;
  buildingLanding: boolean;
  buildError: string | null;
  buildLogVisible: number;
  buildProgressWidth: number;
  buildingLogMessages: string[];
  buildLogEndRef: React.MutableRefObject<HTMLDivElement | null>;
  handleBuildLandingPage: () => Promise<void>;
  regenerateConfirm: boolean;
  setRegenerateConfirm: (v: boolean) => void;
  regenerateError: string | null;
  setRegenerateError: (v: string | null) => void;
  handleRegenerateSiteConfirmed: () => Promise<void>;
  handleSignOut: () => Promise<void>;
  profileDisplayName: string;
  setProfileDisplayName: (v: string) => void;
  profileTelegram: string;
  setProfileTelegram: (v: string) => void;
  profileWhatsapp: string;
  setProfileWhatsapp: (v: string) => void;
  profileEmailNotifications: boolean;
  setProfileEmailNotifications: (v: boolean) => void;
  profileTelegramChatId: string;
  setProfileTelegramChatId: (v: string) => void;
  profileSaving: boolean;
  profileSaveError: string | null;
  handleSaveProfile: () => Promise<void>;
  dashboardStatus: DashboardFunnelStatus | null;
  refreshDashboardStatus: () => Promise<void>;
};

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

export function useDashboardData() {
  const v = useContext(DashboardDataContext);
  if (!v) throw new Error("useDashboardData must be used within DashboardDataProvider");
  return v;
}

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { activeProject } = useProjectContext();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [offer, setOffer] = useState<DashboardOffer | null>(null);
  const [landingSlug, setLandingSlug] = useState<string | null>(null);
  const [buildingLanding, setBuildingLanding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [buildLogVisible, setBuildLogVisible] = useState(0);
  const [buildProgressWidth, setBuildProgressWidth] = useState(0);
  const buildLogEndRef = useRef<HTMLDivElement | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [regenerateConfirm, setRegenerateConfirm] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [savedProfileDisplayName, setSavedProfileDisplayName] = useState<string | null>(null);
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileTelegram, setProfileTelegram] = useState("");
  const [profileWhatsapp, setProfileWhatsapp] = useState("");
  const [profileEmailNotifications, setProfileEmailNotifications] = useState(true);
  const [profileTelegramChatId, setProfileTelegramChatId] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [uiTheme, setUiTheme] = useState<UiTheme>("dark");
  const [dashboardStatus, setDashboardStatus] = useState<DashboardFunnelStatus | null>(null);

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

  const offerContext = useMemo(() => {
    if (!offer) {
      return "No offer saved yet. The user can generate an offer from the home page.";
    }
    const slugLine = landingSlug ? `\nLANDING SLUG: ${landingSlug}` : "\nLANDING SLUG: (none)";
    return `OFFER: ${offer.offer}\nAUDIENCE: ${offer.audience}\nPRICING: ${offer.pricing}\nPOSITIONING: ${offer.positioning}\nHEADLINE: ${offer.headline}${slugLine}`;
  }, [offer, landingSlug]);

  const salesBuilderContext = useMemo((): SalesBuilderContextPayload => {
    if (!offer) {
      return {
        offer: "(Not saved yet — user can generate an offer from the home page.)",
        audience: "(Not saved yet.)",
        pricing: "(Not saved yet.)",
        positioning: "(Not saved yet.)",
        headline: "(Not saved yet.)",
        landingSlug
      };
    }
    return {
      offer: offer.offer,
      audience: offer.audience,
      pricing: offer.pricing,
      positioning: offer.positioning,
      headline: offer.headline,
      landingSlug
    };
  }, [offer, landingSlug]);

  const refreshDashboardStatus = useCallback(async () => {
    if (!userId) {
      setDashboardStatus(null);
      return;
    }
    try {
      const q = activeProject?.id
        ? `?projectId=${encodeURIComponent(activeProject.id)}`
        : "";
      const res = await fetch(`/api/dashboard/status${q}`, { credentials: "include", cache: "no-store" });
      if (!res.ok) return;
      const j = (await res.json()) as Partial<DashboardFunnelStatus>;
      setDashboardStatus({
        offer: !!j.offer,
        landing: !!j.landing,
        content: !!j.content,
        leads: !!j.leads,
        completedSteps: typeof j.completedSteps === "number" ? j.completedSteps : 0
      });
    } catch {
      /* ignore */
    }
  }, [userId, activeProject?.id]);

  const refreshOffer = useCallback(async () => {
    if (!userId || !activeProject?.id) return;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .eq("user_id", userId)
      .eq("project_id", activeProject.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (!error && data) setOffer(data as DashboardOffer);
    if (error) setOffer(null);
    await refreshDashboardStatus();
  }, [userId, activeProject?.id, refreshDashboardStatus]);

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
    async function init() {
      if (!activeProject?.id) {
        setLoading(false);
        setOffer(null);
        setLandingSlug(null);
        setDashboardStatus(null);
        return;
      }
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
        .select("display_name, telegram, whatsapp, email_notifications, telegram_chat_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const profileData = profileRow.data as ProfileRow | null;
      const dbDisplayName = profileData?.display_name?.trim() || null;
      setSavedProfileDisplayName(dbDisplayName);

      if (!profileRow.error && profileData) {
        setProfileDisplayName(dbDisplayName ?? defaultDisplayName);
        setProfileTelegram(profileData.telegram ?? "");
        setProfileWhatsapp(profileData.whatsapp ?? "");
        setProfileEmailNotifications(profileData.email_notifications !== false);
        setProfileTelegramChatId(profileData.telegram_chat_id?.trim() ?? "");
      } else {
        setProfileDisplayName(defaultDisplayName);
        setProfileTelegram("");
        setProfileWhatsapp("");
        setProfileEmailNotifications(true);
        setProfileTelegramChatId("");
      }

      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("project_id", activeProject.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (!error && data) setOffer(data as DashboardOffer);
      if (error) setOffer(null);

      const landingResult = (await supabase
        .from("landing_pages")
        .select("slug")
        .eq("user_id", session.user.id)
        .eq("project_id", activeProject.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()) as { data: { slug: string } | null };
      if (landingResult.data?.slug) setLandingSlug(landingResult.data.slug);
      else setLandingSlug(null);

      setLoading(false);

      try {
        const statusUrl = activeProject?.id
          ? `/api/dashboard/status?projectId=${encodeURIComponent(activeProject.id)}`
          : "/api/dashboard/status";
        const st = await fetch(statusUrl, { credentials: "include", cache: "no-store" });
        if (st.ok) {
          const j = (await st.json()) as Partial<DashboardFunnelStatus>;
          setDashboardStatus({
            offer: !!j.offer,
            landing: !!j.landing,
            content: !!j.content,
            leads: !!j.leads,
            completedSteps: typeof j.completedSteps === "number" ? j.completedSteps : 0
          });
        }
      } catch {
        /* ignore */
      }
    }

    void init();
  }, [router, activeProject?.id]);

  function setDashboardTheme(next: UiTheme) {
    setUiTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(UI_THEME_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const handleSignOut = useCallback(async () => {
    try {
      localStorage.removeItem("lacore-chat-history");
    } catch {
      /* ignore */
    }
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.replace("/auth");
  }, [router]);

  const handleSaveProfile = useCallback(async () => {
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
          email_notifications: profileEmailNotifications,
          telegram_chat_id: profileTelegramChatId.trim() || null,
          updated_at: new Date().toISOString()
        } as never,
        {
          onConflict: "user_id",
          ignoreDuplicates: false
        }
      );

      if (error) {
        setProfileSaveError("Could not save: " + error.message);
        return;
      }

      setSavedProfileDisplayName(profileDisplayName.trim() || null);
      dashToast("Settings saved successfully");
    } finally {
      setProfileSaving(false);
    }
  }, [
    userId,
    profileDisplayName,
    profileTelegram,
    profileWhatsapp,
    profileEmailNotifications,
    profileTelegramChatId
  ]);

  const handleBuildLandingPage = useCallback(async () => {
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
            project_id: activeProject?.id ?? null,
            businessName: "",
            primaryGoal: "",
            siteVibe: ""
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
        await refreshDashboardStatus();
        router.push(`/p/${result.slug}?edit=true`);
      } catch (err) {
        setBuildError(err instanceof Error ? err.message : "Failed to build landing page.");
      } finally {
        setBuildingLanding(false);
      }
    }, [offer, sessionToken, email, router, activeProject?.id, refreshDashboardStatus]);

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

  const handleRegenerateSiteConfirmed = useCallback(async () => {
    if (!userId || !activeProject?.id) return;
    setRegenerateError(null);
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("landing_pages")
      .delete()
      .eq("user_id", userId)
      .eq("project_id", activeProject.id);
    if (error) {
      setRegenerateError(error.message);
      setRegenerateConfirm(false);
      return;
    }
    setLandingSlug(null);
    setRegenerateConfirm(false);
    void refreshDashboardStatus();
    void handleBuildLandingPage();
  }, [userId, handleBuildLandingPage, activeProject?.id, refreshDashboardStatus]);

  const value = useMemo(
    () => ({
      loading,
      userId,
      email,
      sessionToken,
      offer,
      setOffer,
      refreshOffer,
      landingSlug,
      setLandingSlug,
      savedProfileDisplayName,
      offerContext,
      salesBuilderContext,
      uiTheme,
      setDashboardTheme,
      buildingLanding,
      buildError,
      buildLogVisible,
      buildProgressWidth,
      buildingLogMessages,
      buildLogEndRef,
      handleBuildLandingPage,
      regenerateConfirm,
      setRegenerateConfirm,
      regenerateError,
      setRegenerateError,
      handleRegenerateSiteConfirmed,
      handleSignOut,
      profileDisplayName,
      setProfileDisplayName,
      profileTelegram,
      setProfileTelegram,
      profileWhatsapp,
      setProfileWhatsapp,
      profileEmailNotifications,
      setProfileEmailNotifications,
      profileTelegramChatId,
      setProfileTelegramChatId,
      profileSaving,
      profileSaveError,
      handleSaveProfile,
      dashboardStatus,
      refreshDashboardStatus
    }),
    [
      loading,
      userId,
      email,
      sessionToken,
      offer,
      refreshOffer,
      landingSlug,
      savedProfileDisplayName,
      offerContext,
      salesBuilderContext,
      uiTheme,
      buildingLanding,
      buildError,
      buildLogVisible,
      buildProgressWidth,
      buildingLogMessages,
      buildLogEndRef,
      handleBuildLandingPage,
      regenerateConfirm,
      regenerateError,
      handleRegenerateSiteConfirmed,
      handleSignOut,
      profileDisplayName,
      profileTelegram,
      profileWhatsapp,
      profileEmailNotifications,
      profileTelegramChatId,
      profileSaving,
      profileSaveError,
      handleSaveProfile,
      dashboardStatus,
      refreshDashboardStatus
    ]
  );

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export { buildSalesBuilderIntro };
