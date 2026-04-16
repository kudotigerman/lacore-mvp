"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode
} from "react";
import ProjectSelector from "@/app/components/dashboard/ProjectSelector";
import { DASH_TOAST_EVENT } from "@/lib/dash-toast";
import { CreditsWidget } from "@/components/dashboard/CreditsWidget";
import { Logo } from "@/components/Logo";
import {
  buildSalesBuilderIntro,
  profileInitialsFromName,
  useDashboardData
} from "@/components/dashboard/DashboardDataContext";
import { dashPremiumCss } from "@/components/dashboard/dashTokens";
import { LandingGenerationLoader } from "@/components/dashboard/LandingGenerationLoader";
import { useCreditsBalance } from "@/components/dashboard/useCreditsBalance";
import {
  BarChart2,
  BookOpen,
  DollarSign,
  FileText,
  Layout,
  Mail,
  MoreHorizontal,
  PenLine,
  Send,
  Settings,
  Sparkles,
  Users
} from "lucide-react";

const CHAT_STORAGE_KEY = "lacore-chat-history";
const CHECKLIST_COLLAPSED_KEY = "lacore_checklist_collapsed";

type DashChatMessage = { role: "user" | "assistant"; text: string };

function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/---/g, "")
    .trim();
}

const SIDEBAR_W = 220;
const MOBILE_NAV_ITEMS = [
  { href: "/dashboard/offer", label: "Offer", icon: Sparkles },
  { href: "/dashboard/landing", label: "Landing", icon: Layout },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart2 },
  { href: "#more", label: "More", icon: MoreHorizontal }
] as const;

const MOBILE_MORE_ITEMS = [
  { href: "/dashboard/content", label: "Content", icon: PenLine },
  { href: "/dashboard/proposals", label: "Proposals", icon: FileText },
  { href: "/dashboard/pricing-strategy", label: "Pricing", icon: DollarSign },
  { href: "/dashboard/sequences", label: "Sequences", icon: Mail },
  { href: "/dashboard/outreach", label: "Outreach", icon: Send },
] as const;

const MOBILE_MORE_SECONDARY_ITEMS = [
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

const QUICK_ACTIONS: { label: string; message: string }[] = [
  {
    label: "✦ Improve my offer",
    message:
      "Improve my offer: give 3 concrete, specific alternative versions of my offer, headlines, and positioning using my saved business context. Be sharp and conversion-focused."
  },
  {
    label: "📄 Write landing copy",
    message:
      "Write landing page copy for me: hero headline, subheadline, 3 benefit bullets, social proof placeholder line, and a strong CTA — all specific to my offer and audience."
  },
  {
    label: "📱 Generate posts",
    message:
      "Generate ready-to-post content for Instagram, X, LinkedIn, Threads, and Telegram based on my offer. Format each piece for the platform."
  },
  {
    label: "💬 DM scripts",
    message:
      "Write cold DM and short outreach scripts tailored to my offer and audience (Instagram DMs and LinkedIn)."
  },
  {
    label: "📊 Growth strategy",
    message:
      "Give me a concrete 30-day growth action plan with daily tasks specific to my offer and audience — not generic advice."
  }
];

const FUNNEL_STEPS = [
  { num: "01", label: "Offer", href: "/dashboard/offer", key: "offer" as const, icon: Sparkles },
  { num: "02", label: "Landing page", href: "/dashboard/landing", key: "landing" as const, icon: Layout },
  { num: "03", label: "Content", href: "/dashboard/content", key: "content" as const, icon: PenLine },
  { num: "04", label: "Leads & closing", href: "/dashboard/leads", key: "leads" as const, icon: Users }
];

function stepDone(
  key: (typeof FUNNEL_STEPS)[number]["key"],
  s: { offer: boolean; landing: boolean; content: boolean; leads: boolean } | null
): boolean {
  if (!s) return false;
  if (key === "offer") return s.offer;
  if (key === "landing") return s.landing;
  if (key === "content") return s.content;
  if (key === "leads") return s.leads;
  return false;
}

export default function DashboardChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const data = useDashboardData();
  const salesBuilderFabBottom =
    pathname?.startsWith("/dashboard/offer") ||
    pathname?.startsWith("/dashboard/content") ||
    pathname?.startsWith("/dashboard/landing")
      ? "bottom-20"
      : "bottom-6";
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<DashChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [checklistCollapsed, setChecklistCollapsed] = useState(true);
  const creditsBalance = useCreditsBalance();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInitDone = useRef(false);
  const isMoreRoute = useMemo(() => {
    const all = [...MOBILE_MORE_ITEMS, ...MOBILE_MORE_SECONDARY_ITEMS];
    return all.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
  }, [pathname]);

  useEffect(() => {
    try {
      const v = localStorage.getItem(CHECKLIST_COLLAPSED_KEY);
      if (v === "false") setChecklistCollapsed(false);
    } catch {
      /* ignore */
    }
  }, []);

  function toggleChecklistCollapsed() {
    setChecklistCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(CHECKLIST_COLLAPSED_KEY, next ? "true" : "false");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  useEffect(() => {
    function onToast(e: Event) {
      const msg = (e as CustomEvent<{ message?: string }>).detail?.message;
      if (typeof msg !== "string" || !msg.trim()) return;
      setToastMsg(msg.trim());
      window.setTimeout(() => setToastMsg(null), 3000);
    }
    window.addEventListener(DASH_TOAST_EVENT, onToast);
    return () => window.removeEventListener(DASH_TOAST_EVENT, onToast);
  }, []);

  useEffect(() => {
    if (data.loading) return;
    if (chatInitDone.current) return;
    chatInitDone.current = true;
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (
          Array.isArray(parsed) &&
          parsed.every(
            (m) =>
              m &&
              typeof m === "object" &&
              (m as DashChatMessage).role &&
              ((m as DashChatMessage).role === "user" || (m as DashChatMessage).role === "assistant") &&
              typeof (m as DashChatMessage).text === "string"
          )
        ) {
          setChatMessages(parsed as DashChatMessage[]);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setChatMessages([{ role: "assistant", text: buildSalesBuilderIntro(data.savedProfileDisplayName) }]);
  }, [data.loading, data.savedProfileDisplayName]);

  useEffect(() => {
    if (data.loading || !chatInitDone.current) return;
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatMessages));
    } catch {
      /* ignore */
    }
  }, [chatMessages, data.loading]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const sidebarInitials = useMemo(
    () => profileInitialsFromName(data.savedProfileDisplayName ?? data.profileDisplayName, data.email),
    [data.savedProfileDisplayName, data.profileDisplayName, data.email]
  );

  const funnel = data.dashboardStatus;
  const offerDone = !!funnel?.offer;
  const landingDone = !!funnel?.landing;
  const contentDone = !!funnel?.content;
  const flowCompletedCount = [offerDone, landingDone, contentDone].filter(Boolean).length;
  const flowTotal = 3;
  const flowPct = Math.round((flowCompletedCount / flowTotal) * 100);

  const checklistItems = useMemo(
    () => [
      {
        id: "offer",
        label: "Create your offer",
        href: "/dashboard/offer",
        done: !!funnel?.offer
      },
      {
        id: "landing",
        label: "Build your landing page",
        href: "/dashboard/landing",
        done: !!funnel?.landing
      },
      {
        id: "share",
        label: "Share your landing page",
        href: "/dashboard/landing",
        done: (funnel?.landingViewsTotal ?? 0) > 0
      },
      {
        id: "lead",
        label: "Get your first lead",
        href: "/dashboard/leads",
        done: (funnel?.leadsTotalCount ?? 0) > 0
      },
      {
        id: "won",
        label: "Close first deal",
        href: "/dashboard/leads",
        done: !!funnel?.hasWonLead
      }
    ],
    [funnel]
  );
  const checklistDoneCount = checklistItems.filter((i) => i.done).length;
  const checklistAllDone = checklistDoneCount === checklistItems.length;

  const nextFlowHint = !offerDone
    ? "Next: Offer"
    : !landingDone
      ? "Next: Landing page"
      : !contentDone
        ? "Next: Content"
        : "Next: Leads & closing";

  const apiSalesContext = useMemo(
    () => ({
      offer: data.salesBuilderContext.offer,
      audience: data.salesBuilderContext.audience,
      pricing: data.salesBuilderContext.pricing,
      positioning: data.salesBuilderContext.positioning,
      headline: data.salesBuilderContext.headline,
      slug: data.salesBuilderContext.landingSlug
    }),
    [data.salesBuilderContext]
  );

  const sendChatMessage = useCallback(
    async (userText: string) => {
      const text = userText.trim();
      if (!text || chatLoading || !data.sessionToken) return;
      const thread: DashChatMessage[] = [...chatMessages, { role: "user", text }];
      setChatMessages(thread);
      setChatLoading(true);
      try {
        const res = await fetch("/api/dashboard-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.sessionToken}`
          },
          body: JSON.stringify({
            messages: thread.map((m) => ({ role: m.role, content: m.text })),
            salesContext: apiSalesContext
          })
        });
        const json = (await res.json()) as { reply?: string; error?: string };
        if (!res.ok) {
          throw new Error(json.error || "Chat failed.");
        }
        if (!json.reply?.trim()) {
          throw new Error("Empty response.");
        }
        setChatMessages((prev) => [...prev, { role: "assistant", text: json.reply!.trim() }]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", text: `Sorry — ${msg} Try again in a moment.` }
        ]);
      } finally {
        setChatLoading(false);
      }
    },
    [chatLoading, data.sessionToken, apiSalesContext, chatMessages]
  );

  function handleChatSubmit(e?: FormEvent) {
    e?.preventDefault();
    const text = chatInput.trim();
    if (!text || chatLoading || !data.sessionToken) return;
    setChatInput("");
    void sendChatMessage(text);
  }

  function handleChatKeyDown(ev: KeyboardEvent<HTMLTextAreaElement>) {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      handleChatSubmit();
    }
  }

  if (data.loading) {
    return (
      <main
        className="dash-premium-root"
        style={{
          minHeight: "100vh",
          background: "var(--content-bg)",
          color: "var(--text-primary)",
          padding: 24,
          fontFamily: "inherit"
        }}
      >
        <style>{dashPremiumCss}</style>
        <p style={{ color: "var(--text-muted)" }}>Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main
      className="dash-shell-root dash-premium-root lg:h-screen lg:overflow-hidden"
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--content-bg)",
        color: "var(--text-primary)",
        fontFamily: "inherit"
      }}
    >
      <style>{`
        ${dashPremiumCss}
        @keyframes dash-build-pulse { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.8)} }
        @keyframes dash-sb-dot-pulse { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.55;transform:scale(0.9)} }
        .dash-sb-fab {
          transition: all 0.2s ease;
        }
        .dash-sb-fab--closed:hover {
          transform: translateY(-2px);
        }
        .dash-sb-quick-pill {
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }
        .dash-sb-quick-pill:hover {
          background: rgba(99,102,241,0.12) !important;
          border-color: rgba(99,102,241,0.35) !important;
          color: #a5b4fc !important;
        }
        .dash-sb-chat-close {
          transition: background 0.15s ease, color 0.15s ease;
        }
        .dash-sb-chat-close:hover {
          background: rgba(255,255,255,0.1) !important;
          color: #FFFFFF !important;
        }
        @media (max-width: 1023px) {
          .dash-shell-root {
            flex-direction: column;
            height: auto;
            min-height: 100vh;
            max-height: none;
            overflow: auto;
          }
          .dash-sidebar-col {
            display: none !important;
          }
          .dash-main-col { flex: 1; min-height: 0; overflow: visible !important; }
        }
      `}</style>

      {data.buildingLanding ? (
        <LandingGenerationLoader
          currentStep={
            data.buildLogVisible > 0
              ? (data.buildingLogMessages[data.buildLogVisible - 1] ?? data.buildingLogMessages[0] ?? "Starting...")
              : (data.buildingLogMessages[0] ?? "Starting...")
          }
        />
      ) : null}

      <aside
        className="dash-sidebar-col hidden flex-col border-r border-white/[0.06] bg-[#060608] lg:flex"
        style={{
          width: SIDEBAR_W,
          flexShrink: 0,
          height: "100vh",
          boxSizing: "border-box"
        }}
      >
        <div className="flex-shrink-0 px-4 pb-3 pt-5">
          <Logo size="sm" variant="dark" href="/dashboard/offer" />
          <div className="mt-2.5">
            <ProjectSelector />
          </div>
        </div>

        <div className="px-4 py-2">
          {flowCompletedCount === 0 ? (
            <p className="px-2 text-[10px] text-white/30">Start with Step 1 →</p>
          ) : (
            <div className="px-2">
              <div className="mb-1 flex justify-between text-[10px] text-white/30">
                <span>Your sales system</span>
                <span>{flowPct}%</span>
              </div>
              <div className="h-0.5 rounded-full bg-white/[0.08]">
                <div
                  className="h-0.5 rounded-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${flowPct}%` }}
                />
              </div>
              <p className="pt-1 text-[9px] text-white/25">{nextFlowHint}</p>
            </div>
          )}
        </div>

        <div className="border-b border-white/[0.06] px-3 pb-2 pt-0">
          <button
            type="button"
            onClick={toggleChecklistCollapsed}
            className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-white/35 transition-colors hover:bg-white/[0.04] hover:text-white/50"
            aria-expanded={!checklistCollapsed}
          >
            <span>Launch checklist</span>
            <span className="text-white/25">{checklistCollapsed ? "▸" : "▾"}</span>
          </button>
          {!checklistCollapsed ? (
            <div className="mt-1 space-y-1.5 px-1 pb-1">
              <p className="px-1 text-[10px] text-white/30">
                {checklistDoneCount}/{checklistItems.length} complete
              </p>
              {checklistAllDone ? (
                <p className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1.5 text-[10px] font-medium leading-snug text-emerald-300/95">
                  Your sales system is live! 🎉
                </p>
              ) : null}
              {checklistItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start gap-2 rounded-md px-1 py-1 text-[11px] no-underline transition-colors hover:bg-white/[0.04]"
                >
                  <span
                    className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[9px] ${
                      item.done
                        ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                        : "border-white/20 bg-transparent text-transparent"
                    }`}
                    aria-hidden
                  >
                    {item.done ? "✓" : ""}
                  </span>
                  <span className={`min-w-0 flex-1 leading-snug ${item.done ? "text-white/45" : "text-white/65"}`}>
                    {item.label}
                  </span>
                  <span className="shrink-0 text-indigo-400/80">→</span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {FUNNEL_STEPS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const done = stepDone(item.key, funnel);
            const suffix = done ? (
              <span className="text-[10px] text-emerald-400">✓</span>
            ) : active ? (
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" aria-hidden />
            ) : null;

            const baseRow =
              "flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-[12px] transition-colors duration-150";
            const activeCls = "bg-indigo-500/15 text-indigo-300";
            const doneCls = "text-white/60 hover:bg-white/5";
            const availCls = "text-white/55 hover:bg-white/5";
            const cls = active ? `${baseRow} ${activeCls}` : done ? `${baseRow} ${doneCls}` : `${baseRow} ${availCls}`;

            return (
              <Link key={item.href} href={item.href} className={`${cls} no-underline`}>
                <span className="w-5 flex-shrink-0 text-[10px] text-white/35">{item.num}</span>
                <item.icon size={14} className="shrink-0 text-white/45" />
                <span className="min-w-0 flex-1 leading-tight">{item.label}</span>
                {suffix}
              </Link>
            );
          })}

          <Link
            href="/dashboard/proposals"
            className={`flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-[12px] no-underline transition-colors duration-150 ${
              pathname === "/dashboard/proposals" || pathname.startsWith("/dashboard/proposals/")
                ? "bg-indigo-500/15 text-indigo-300"
                : "text-white/40 hover:bg-white/5 hover:text-white/70"
            }`}
          >
            <span className="w-5 flex-shrink-0 text-[10px] text-white/20">05</span>
            <FileText size={14} className="shrink-0 text-white/45" />
            <span className="min-w-0 flex-1 leading-tight">Proposals</span>
          </Link>

          <Link
            href="/dashboard/pricing-strategy"
            className={`flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-[12px] no-underline transition-colors duration-150 ${
              pathname === "/dashboard/pricing-strategy" ||
              pathname.startsWith("/dashboard/pricing-strategy/")
                ? "bg-indigo-500/15 text-indigo-300"
                : "text-white/40 hover:bg-white/5 hover:text-white/70"
            }`}
          >
            <span className="w-5 flex-shrink-0 text-[10px] text-white/20">06</span>
            <DollarSign size={14} className="shrink-0 text-white/45" />
            <span className="min-w-0 flex-1 leading-tight">Pricing</span>
          </Link>

          <Link
            href="/dashboard/sequences"
            className={`flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-[12px] no-underline transition-colors duration-150 ${
              pathname === "/dashboard/sequences" || pathname.startsWith("/dashboard/sequences/")
                ? "bg-indigo-500/15 text-indigo-300"
                : "text-white/40 hover:bg-white/5 hover:text-white/70"
            }`}
          >
            <span className="w-5 flex-shrink-0 text-[10px] text-white/20">07</span>
            <Mail size={14} className="shrink-0 text-white/45" />
            <span className="min-w-0 flex-1 leading-tight">Sequences</span>
          </Link>

          <Link
            href="/dashboard/outreach"
            className={`flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-[12px] no-underline transition-colors duration-150 ${
              pathname === "/dashboard/outreach" || pathname.startsWith("/dashboard/outreach/")
                ? "bg-indigo-500/15 text-indigo-300"
                : "text-white/40 hover:bg-white/5 hover:text-white/70"
            }`}
          >
            <span className="w-5 flex-shrink-0 text-[10px] text-white/20">08</span>
            <Send size={14} className="shrink-0 text-white/45" />
            <span className="min-w-0 flex-1 leading-tight">Outreach</span>
          </Link>

          <div className="mx-2 my-2 h-px bg-white/[0.06]" />

          <Link
            href="/dashboard/analytics"
            className={`flex h-9 items-center rounded-lg px-3 text-xs no-underline transition-colors duration-150 ${
              pathname === "/dashboard/analytics" || pathname.startsWith("/dashboard/analytics/")
                ? "bg-white/[0.06] text-white/70"
                : "text-white/35 hover:bg-white/5 hover:text-white/50"
            }`}
          >
            <BarChart2 size={14} className="mr-2 shrink-0 text-white/45" />
            Analytics
          </Link>

          <div className="mt-4 border-t border-white/6 pt-4">
            <p className="mb-2 px-3 text-[10px] uppercase tracking-wider text-white/20">Learn</p>
            <Link
              href="/dashboard/playbook"
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs no-underline transition-colors ${
                pathname === "/dashboard/playbook" || pathname.startsWith("/dashboard/playbook/")
                  ? "text-white/70"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <BookOpen size={14} className="shrink-0 text-white/45" />
              Playbook
            </Link>
          </div>
        </nav>

        <CreditsWidget />

        <div
          style={{
            flexShrink: 0,
            borderTop: "1px solid #1C1C22",
            padding: "12px 16px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "#6366F1",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              {sidebarInitials}
            </div>
            <span
              style={{
                fontSize: 11,
                color: "#52525B",
                marginLeft: 8,
                maxWidth: 120,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
              title={data.email}
            >
              {data.email}
            </span>
          </div>
          <Link
            href="/dashboard/settings"
            className="dash-sidebar-footer-link"
            style={{
              display: "block",
              fontSize: 11,
              color: "#3F3F46",
              textDecoration: "none",
              cursor: "pointer",
              marginTop: 4
            }}
          >
            <Settings size={14} className="mr-1 inline-block align-[-2px] text-white/45" />
            Settings
          </Link>
          <button
            type="button"
            onClick={() => void data.handleSignOut()}
            className="dash-sidebar-footer-link mt-1 hidden w-full cursor-pointer border-0 bg-transparent p-0 text-left font-inherit lg:block"
            style={{
              fontSize: 11,
              color: "#3F3F46"
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <div
        className="dash-main-col dashboard-main min-h-screen overflow-y-auto px-4 pb-24 pt-4 lg:min-h-0 lg:px-8 lg:py-6"
        style={{
          flex: 1,
          minWidth: 0,
          boxSizing: "border-box",
          background: "var(--content-bg)"
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3 lg:hidden">
          <div className="min-w-0 flex-1">
            <Logo size="sm" variant="dark" href="/dashboard/offer" />
            <div className="mt-2">
              <ProjectSelector />
            </div>
          </div>
          <div className="shrink-0 rounded-full border border-indigo-500/35 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300">
            Credits: {creditsBalance ?? "…"}
          </div>
        </div>
        {children}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#060608]/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {MOBILE_NAV_ITEMS.map((item) => {
            const active =
              item.href === "#more"
                ? isMoreRoute
                : pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            if (item.href === "#more") {
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => setMoreOpen(true)}
                  className={`flex min-h-11 flex-col items-center justify-center rounded-lg px-1 text-[11px] ${
                    active ? "text-indigo-300" : "text-white/50"
                  }`}
                >
                  <Icon size={14} aria-hidden />
                  <span>{item.label}</span>
                </button>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-11 flex-col items-center justify-center rounded-lg px-1 text-[11px] no-underline ${
                  active ? "text-indigo-300" : "text-white/50"
                }`}
              >
                <Icon size={14} aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {moreOpen ? (
        <>
          <button
            type="button"
            aria-label="Close More menu"
            onClick={() => setMoreOpen(false)}
            className="fixed inset-0 z-[90] border-0 bg-black/50 p-0 lg:hidden"
          />
          <div className="fixed inset-x-0 bottom-0 z-[91] max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-white/[0.1] bg-[#0D0F1A] pb-4 pt-2 lg:hidden">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <div className="space-y-1 px-3">
              {MOBILE_MORE_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm no-underline ${
                      active ? "bg-indigo-500/15 text-indigo-300" : "text-white/70 hover:bg-white/[0.05]"
                    }`}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <div className="my-2 h-px bg-white/[0.08]" />
              {MOBILE_MORE_SECONDARY_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm no-underline ${
                      active ? "bg-indigo-500/15 text-indigo-300" : "text-white/70 hover:bg-white/[0.05]"
                    }`}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  void data.handleSignOut();
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-white/70 hover:bg-white/[0.05]"
              >
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </>
      ) : null}

      {!data.buildingLanding ? (
        <>
          {chatOpen ? (
            <button
              type="button"
              aria-label="Close Sales Builder overlay"
              onClick={() => setChatOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 998,
                background: "rgba(0,0,0,0.3)",
                backdropFilter: "blur(2px)",
                WebkitBackdropFilter: "blur(2px)",
                border: "none",
                padding: 0,
                cursor: "pointer"
              }}
            />
          ) : null}

          <aside
            id="dash-sales-builder-panel"
            aria-hidden={!chatOpen}
            className="box-border flex h-full max-h-screen w-96 max-w-[100vw] flex-col border-l border-white/[0.08] bg-[#0D0F1A] shadow-[-8px_0_40px_rgba(0,0,0,0.5)]"
            style={{
              position: "fixed",
              right: 0,
              top: 0,
              zIndex: 999,
              transform: chatOpen ? "translateX(0)" : "translateX(100%)",
              transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
              pointerEvents: chatOpen ? "auto" : "none"
            }}
          >
            <div className="flex flex-shrink-0 flex-col border-b border-white/[0.08] px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                  <span className="text-sm font-semibold text-white">Sales Builder</span>
                  <span className="flex-shrink-0 rounded border border-indigo-500/25 bg-indigo-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-300">
                    AI
                  </span>
                </div>
                <button
                  type="button"
                  className="dash-sb-chat-close flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border-0 bg-white/[0.06] text-base text-zinc-500"
                  aria-label="Close Sales Builder"
                  onClick={() => setChatOpen(false)}
                >
                  ✕
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-white/40">Your AI sales assistant</p>
            </div>

            <div className="flex flex-shrink-0 gap-2 overflow-x-auto border-b border-white/[0.08] px-4 py-3 scrollbar-thin">
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa.label}
                  type="button"
                  disabled={chatLoading || !data.sessionToken}
                  className="dash-sb-quick-pill flex-shrink-0 cursor-pointer rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/55 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => void sendChatMessage(qa.message)}
                >
                  {qa.label}
                </button>
              ))}
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto px-4 py-4">
              {chatMessages.map((m, idx) => (
                <div
                  key={`${idx}-${m.text.slice(0, 20)}`}
                  className={
                    m.role === "user"
                      ? "mb-2.5 ml-8 max-w-[88%] self-end rounded-xl border border-indigo-500/20 bg-indigo-600/20 px-4 py-3 text-sm text-white"
                      : "mb-2.5 mr-8 max-w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white/85"
                  }
                >
                  {m.role === "assistant" ? cleanMarkdown(m.text) : m.text}
                </div>
              ))}
              {chatLoading ? <div className="text-xs text-white/35">Thinking…</div> : null}
              <div ref={chatEndRef} />
            </div>

            <form
              onSubmit={(e) => handleChatSubmit(e)}
              className="flex flex-shrink-0 flex-col gap-2 border-t border-white/[0.08] px-4 py-3.5"
            >
              <textarea
                className="dash-chat-input min-h-[4.5rem] w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-indigo-500/50 focus:outline-none"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                rows={3}
                placeholder="Ask anything…"
              />
              <button
                type="submit"
                disabled={chatLoading || !data.sessionToken}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Send
              </button>
            </form>
          </aside>

          {!chatOpen ? (
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className={`dash-sb-fab dash-sb-fab--closed fixed right-6 z-40 hidden items-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-colors hover:bg-indigo-500 lg:flex ${salesBuilderFabBottom}`}
              aria-expanded={false}
              aria-controls="dash-sales-builder-panel"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path
                  d="M7 1L9 5H13L10 8L11 12L7 10L3 12L4 8L1 5H5L7 1Z"
                  fill="currentColor"
                />
              </svg>
              Sales Builder
            </button>
          ) : null}
        </>
      ) : null}

      {toastMsg ? (
        <div className="fixed bottom-6 left-1/2 z-[10001] -translate-x-1/2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toastMsg}
        </div>
      ) : null}
    </main>
  );
}
