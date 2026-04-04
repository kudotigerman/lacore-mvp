"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode
} from "react";
import {
  buildSalesBuilderIntro,
  profileInitialsFromName,
  useDashboardData
} from "@/components/dashboard/DashboardDataContext";
import { dashPremiumCss } from "@/components/dashboard/dashTokens";

const CHAT_STORAGE_KEY = "lacore-chat-history";

type DashChatMessage = { role: "user" | "assistant"; text: string };

const SIDEBAR_W = 220;
const CHAT_W = 340;

type NavBadgeKind = "done" | "live" | "soon" | "muted";

export default function DashboardChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const data = useDashboardData();
  const [chatMessages, setChatMessages] = useState<DashChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInitDone = useRef(false);

  useEffect(() => {
    const u = () => setIsMobile(window.innerWidth < 900);
    u();
    window.addEventListener("resize", u);
    return () => window.removeEventListener("resize", u);
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

  const navItems: { href: string; num: string; label: string; badgeKind: NavBadgeKind }[] = useMemo(
    () => [
      { href: "/dashboard/offer", num: "01", label: "OFFER", badgeKind: data.offer ? "done" : "muted" },
      { href: "/dashboard/landing", num: "02", label: "LANDING PAGE", badgeKind: data.landingSlug ? "live" : "muted" },
      { href: "/dashboard/content", num: "03", label: "CONTENT", badgeKind: "live" },
      { href: "/dashboard/leads", num: "04", label: "LEADS", badgeKind: "live" },
      { href: "/dashboard/closing", num: "05", label: "CLOSING", badgeKind: "live" },
      { href: "/dashboard/analytics", num: "06", label: "ANALYTICS", badgeKind: "soon" }
    ],
    [data.offer, data.landingSlug]
  );

  const navBadge = (kind: NavBadgeKind): { text: string; style: CSSProperties } => {
    const base = { fontWeight: 600 as const, marginLeft: "auto" as const, flexShrink: 0 as const, whiteSpace: "nowrap" as const };
    if (kind === "done") {
      return {
        text: "✓ done",
        style: { ...base, fontSize: 9, color: "#22c55e", background: "rgba(34,197,94,0.08)", padding: "2px 6px", borderRadius: 3 }
      };
    }
    if (kind === "live") {
      return {
        text: "● live",
        style: { ...base, fontSize: 9, color: "#06B6D4", background: "rgba(6,182,212,0.08)", padding: "2px 6px", borderRadius: 3 }
      };
    }
    if (kind === "soon") {
      return {
        text: "soon",
        style: { ...base, fontSize: 9, color: "#3F3F46", background: "rgba(255,255,255,0.03)", padding: "2px 6px", borderRadius: 3 }
      };
    }
    return {
      text: "—",
      style: { ...base, fontSize: 9, color: "#3F3F46", background: "rgba(255,255,255,0.03)", padding: "2px 6px", borderRadius: 3 }
    };
  };

  const handleDashboardChatSend = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      const text = chatInput.trim();
      if (!text || chatLoading || !data.sessionToken) return;
      setChatInput("");
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
            offerContext: data.offerContext
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
    [chatInput, chatLoading, data.sessionToken, data.offerContext, chatMessages]
  );

  function handleChatKeyDown(ev: KeyboardEvent<HTMLTextAreaElement>) {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      void handleDashboardChatSend();
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
      className="dash-shell-root dash-premium-root"
      style={{
        display: "flex",
        height: "100vh",
        maxHeight: "100vh",
        overflow: "hidden",
        background: "var(--content-bg)",
        color: "var(--text-primary)",
        fontFamily: "inherit"
      }}
    >
      <style>{`
        ${dashPremiumCss}
        @keyframes dash-build-pulse { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.8)} }
        @media (max-width: 900px) {
          .dash-shell-root {
            flex-direction: column;
            height: auto;
            min-height: 100vh;
            max-height: none;
            overflow: auto;
          }
          .dash-sidebar-col { width: 100% !important; height: auto !important; border-right: none !important; border-bottom: 1px solid #1C1C22; flex-shrink: 0; }
          .dash-chat-col { width: 100% !important; height: min(48vh, 480px) !important; max-height: 480px; border-right: none !important; border-bottom: 1px solid #1C1C22; flex-shrink: 0; }
          .dash-main-col { flex: 1; min-height: 0; overflow: visible !important; }
        }
      `}</style>

      {data.buildingLanding && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            background: "var(--content-bg)",
            overflow: "hidden"
          }}
        >
          <aside
            style={{
              width: isMobile ? "100%" : 360,
              flexShrink: 0,
              borderRight: isMobile ? "none" : "1px solid #1C1C22",
              borderBottom: isMobile ? "1px solid #1C1C22" : "none",
              display: "flex",
              flexDirection: "column",
              maxHeight: isMobile ? "42vh" : "100%",
              background: "var(--sidebar-bg)"
            }}
          >
            <div style={{ flexShrink: 0, padding: "20px 20px 16px", borderBottom: "1px solid #1C1C22" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--success)",
                    animation: "dash-build-pulse 2s ease-in-out infinite",
                    flexShrink: 0
                  }}
                />
                <span style={{ fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>LACORE AGENT</span>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {data.buildingLogMessages.slice(0, data.buildLogVisible).map((text, idx) => (
                <div
                  key={`${idx}-${text}`}
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--card-border)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    fontSize: 12,
                    color: "var(--text-secondary)"
                  }}
                >
                  {text}
                </div>
              ))}
              <div ref={data.buildLogEndRef} />
            </div>
          </aside>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: 24, background: "var(--content-bg)" }}>
            <div style={{ width: "100%", maxWidth: 360, margin: "0 auto" }}>
              <div style={{ height: 3, background: "#1C1C22", borderRadius: 2, overflow: "hidden" }}>
                <div
                  style={{
                    height: 3,
                    width: `${data.buildProgressWidth}%`,
                    background: "var(--accent)",
                    transition: "width 90s linear"
                  }}
                />
              </div>
              <p style={{ margin: "14px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                {data.buildLogVisible > 0
                  ? data.buildingLogMessages[data.buildLogVisible - 1]
                  : "Starting..."}
              </p>
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Generating your landing page...</p>
            </div>
          </div>
        </div>
      )}

      {data.showOnboarding && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            background: "rgba(0,0,0,0.72)",
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
              border: "1px solid #1C1C22",
              background: "var(--card-bg)",
              borderRadius: 8,
              padding: 24
            }}
          >
            <h3 style={{ margin: 0, fontWeight: 600, fontSize: 22, color: "var(--text-primary)" }}>Tell us about your business</h3>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
              3 quick questions to make your landing page stronger
            </p>
            <div style={{ marginTop: 20, display: "grid", gap: 16 }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Business name
                </p>
                <input
                  className="dash-focusable"
                  value={data.businessName}
                  onChange={(e) => data.setBusinessName(e.target.value)}
                  placeholder="Nike, Alex Design Studio..."
                  style={{
                    width: "100%",
                    marginTop: 8,
                    border: "1px solid var(--border)",
                    background: "rgba(255,255,255,0.04)",
                    color: "var(--text-primary)",
                    padding: "8px 12px",
                    fontFamily: "inherit",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                    borderRadius: 6
                  }}
                />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Primary goal
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-muted)" }}>What should visitors do?</p>
                <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {["📞 Book a call", "💳 Buy a package", "✉️ Send a message", "📋 Join a waitlist"].map((goal) => {
                    const selected = data.primaryGoals.includes(goal);
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() =>
                          data.setPrimaryGoals((prev) =>
                            prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
                          )
                        }
                        style={{
                          border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                          background: selected ? "var(--accent-subtle)" : "rgba(255,255,255,0.04)",
                          color: selected ? "var(--accent)" : "var(--text-secondary)",
                          fontFamily: "inherit",
                          fontSize: 12,
                          textAlign: "left",
                          padding: "10px 12px",
                          cursor: "pointer",
                          borderRadius: 6
                        }}
                      >
                        {goal}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Site vibe
                </p>
                <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {["💼 Professional & trustworthy", "⚡ Bold & energetic", "💎 Luxury & premium", "🤝 Warm & approachable"].map((vibe) => {
                    const selected = data.siteVibe === vibe;
                    return (
                      <button
                        key={vibe}
                        type="button"
                        onClick={() => data.setSiteVibe(vibe)}
                        style={{
                          border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                          background: selected ? "var(--accent-subtle)" : "rgba(255,255,255,0.04)",
                          color: selected ? "var(--accent)" : "var(--text-secondary)",
                          fontFamily: "inherit",
                          fontSize: 12,
                          textAlign: "left",
                          padding: "10px 12px",
                          cursor: "pointer",
                          borderRadius: 6
                        }}
                      >
                        {vibe}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  data.setShowOnboarding(false);
                  void data.handleBuildLandingPage();
                }}
                style={{
                  flex: 1,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontFamily: "inherit",
                  fontSize: 13,
                  padding: "8px 16px",
                  cursor: "pointer",
                  borderRadius: 6,
                  fontWeight: 500
                }}
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => {
                  data.setShowOnboarding(false);
                  void data.handleBuildLandingPage({
                    businessName: data.businessName,
                    primaryGoal: data.primaryGoals.join(", "),
                    siteVibe: data.siteVibe
                  });
                }}
                disabled={!data.businessName.trim() || data.primaryGoals.length === 0 || !data.siteVibe}
                style={{
                  flex: 1,
                  border: "none",
                  background:
                    !data.businessName.trim() || data.primaryGoals.length === 0 || !data.siteVibe ? "var(--border)" : "var(--accent)",
                  color:
                    !data.businessName.trim() || data.primaryGoals.length === 0 || !data.siteVibe ? "var(--text-muted)" : "#000",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "8px 16px",
                  borderRadius: 6,
                  cursor:
                    !data.businessName.trim() || data.primaryGoals.length === 0 || !data.siteVibe ? "not-allowed" : "pointer"
                }}
              >
                Build page
              </button>
            </div>
          </div>
        </div>
      )}

      <aside
        className="dash-sidebar-col"
        style={{
          width: SIDEBAR_W,
          flexShrink: 0,
          background: "#060608",
          borderRight: "2px solid #06B6D4",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box"
        }}
      >
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #1C1C22", flexShrink: 0 }}>
          <Link
            href="/"
            style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "0.15em",
              color: "#fff",
              textDecoration: "none",
              display: "block"
            }}
          >
            LACORE
          </Link>
        </div>

        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 8px", minHeight: 0 }}>
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const nb = navBadge(item.badgeKind);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "dash-nav-item dash-nav-item-active" : "dash-nav-item"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: active ? "9px 10px 9px 8px" : "9px 10px",
                  borderRadius: 6,
                  marginBottom: 1,
                  textDecoration: "none",
                  cursor: "pointer",
                  borderLeft: active ? "2px solid #06B6D4" : "2px solid transparent",
                  background: active
                    ? "linear-gradient(90deg, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0.04) 100%)"
                    : "transparent",
                  color: active ? "#FFFFFF" : "#71717A",
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  letterSpacing: "0.03em",
                  boxSizing: "border-box"
                }}
              >
                <span style={{ width: 18, flexShrink: 0, fontSize: 10, color: "#52525B", textAlign: "left" }}>{item.num}</span>
                <span style={{ flex: 1, lineHeight: 1.25, minWidth: 0 }}>{item.label}</span>
                <span style={nb.style}>{nb.text}</span>
              </Link>
            );
          })}
        </nav>

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
                background: "#06B6D4",
                color: "#000",
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
            Settings
          </Link>
          <button
            type="button"
            onClick={() => void data.handleSignOut()}
            className="dash-sidebar-footer-link"
            style={{
              display: "block",
              padding: 0,
              border: "none",
              background: "none",
              fontSize: 11,
              color: "#3F3F46",
              cursor: "pointer",
              fontFamily: "inherit",
              textAlign: "left",
              marginTop: 4
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <aside
        className="dash-chat-col"
        style={{
          width: CHAT_W,
          flexShrink: 0,
          height: "100vh",
          background: "#0D0D11",
          borderRight: "1px solid #1C1C22",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box"
        }}
      >
        <div style={{ padding: "16px 18px", borderBottom: "1px solid #1C1C22", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#22c55e",
                marginRight: 8,
                flexShrink: 0
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#FFFFFF", letterSpacing: "0.05em" }}>Sales Builder</span>
          </div>
          <p style={{ margin: "1px 0 0", fontSize: 11, color: "#52525B" }}>AI sales assistant</p>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 0 }}>
          {chatMessages.map((m, idx) => (
            <div
              key={`${idx}-${m.text.slice(0, 20)}`}
              style={{
                background: m.role === "user" ? "rgba(6,182,212,0.07)" : "#111116",
                border: m.role === "user" ? "1px solid rgba(6,182,212,0.15)" : "1px solid #1C1C22",
                borderRadius: m.role === "user" ? "8px 8px 2px 8px" : "8px 8px 8px 2px",
                padding: "10px 13px",
                marginLeft: m.role === "user" ? "auto" : 0,
                marginRight: m.role === "user" ? 0 : "auto",
                maxWidth: m.role === "user" ? "88%" : "100%",
                fontSize: 13,
                lineHeight: 1.65,
                color: m.role === "user" ? "#E4E4E7" : "#A1A1AA",
                boxSizing: "border-box",
                marginBottom: 8
              }}
            >
              {m.text}
            </div>
          ))}
          {chatLoading ? (
            <div style={{ fontSize: 12, color: "#52525B" }}>Thinking…</div>
          ) : null}
          <div ref={chatEndRef} />
        </div>
        <form
          onSubmit={(e) => void handleDashboardChatSend(e)}
          style={{
            borderTop: "1px solid #1C1C22",
            padding: "12px 16px",
            flexShrink: 0
          }}
        >
          <textarea
            className="dash-chat-input"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleChatKeyDown}
            rows={2}
            placeholder="Ask anything…"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "#16161C",
              border: "1px solid #1C1C22",
              borderRadius: 6,
              padding: "9px 12px",
              fontSize: 13,
              resize: "none",
              fontFamily: "inherit",
              color: "#FFFFFF",
              outline: "none"
            }}
          />
          <button
            type="submit"
            disabled={chatLoading || !data.sessionToken}
            style={{
              width: "100%",
              marginTop: 8,
              background: "#06B6D4",
              color: "#000",
              border: "none",
              padding: 9,
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 6,
              letterSpacing: "0.06em",
              cursor: chatLoading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: chatLoading ? 0.6 : 1
            }}
          >
            SEND
          </button>
        </form>
      </aside>

      <div
        className="dash-main-col"
        style={{
          flex: 1,
          minWidth: 0,
          height: "100vh",
          overflow: "auto",
          boxSizing: "border-box",
          background: "var(--content-bg)"
        }}
      >
        {children}
      </div>
    </main>
  );
}
