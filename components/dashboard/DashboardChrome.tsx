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
import {
  buildSalesBuilderIntro,
  profileInitialsFromName,
  useDashboardData
} from "@/components/dashboard/DashboardDataContext";

const CHAT_STORAGE_KEY = "lacore-chat-history";

type DashChatMessage = { role: "user" | "assistant"; text: string };

const SIDEBAR_W = 280;
const CHAT_W = 400;

type NavTone = "done" | "live" | "soon" | "muted";

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

  const navItems: {
    href: string;
    num: string;
    label: string;
    badge: string;
    badgeTone: NavTone;
  }[] = useMemo(
    () => [
      { href: "/dashboard/offer", num: "01", label: "OFFER", badge: data.offer ? "DONE" : "—", badgeTone: data.offer ? "done" : "muted" },
      {
        href: "/dashboard/landing",
        num: "02",
        label: "LANDING PAGE",
        badge: data.landingSlug ? "LIVE" : "NEXT",
        badgeTone: data.landingSlug ? "live" : "muted"
      },
      { href: "/dashboard/content", num: "03", label: "CONTENT", badge: "LIVE", badgeTone: "live" },
      { href: "/dashboard/leads", num: "04", label: "LEADS", badge: "LIVE", badgeTone: "live" },
      { href: "/dashboard/closing", num: "05", label: "CLOSING", badge: "LIVE", badgeTone: "live" },
      { href: "/dashboard/analytics", num: "06", label: "ANALYTICS", badge: "SOON", badgeTone: "soon" }
    ],
    [data.offer, data.landingSlug]
  );

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
        style={{
          minHeight: "100vh",
          background: "var(--bg-primary)",
          color: "var(--text-primary)",
          padding: 24,
          fontFamily: "inherit"
        }}
      >
        <p style={{ color: "var(--text-muted)" }}>Loading dashboard...</p>
      </main>
    );
  }

  const badgeColor = (tone: "done" | "live" | "soon" | "muted") => {
    if (tone === "done") return "#22c55e";
    if (tone === "live") return "#06B6D4";
    return "var(--text-muted)";
  };

  return (
    <main
      className="dash-shell-root"
      style={{
        display: "flex",
        height: "100vh",
        maxHeight: "100vh",
        overflow: "hidden",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        fontFamily: "inherit"
      }}
    >
      <style>{`
        @keyframes dash-build-pulse { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.8)} }
        @media (max-width: 900px) {
          .dash-shell-root {
            flex-direction: column;
            height: auto;
            min-height: 100vh;
            max-height: none;
            overflow: auto;
          }
          .dash-sidebar-col { width: 100% !important; height: auto !important; border-right: none !important; border-bottom: 1px solid var(--border-primary); flex-shrink: 0; }
          .dash-chat-col { width: 100% !important; height: min(48vh, 480px) !important; max-height: 480px; border-right: none !important; border-bottom: 1px solid var(--border-primary); flex-shrink: 0; }
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
            background: "var(--bg-primary)",
            overflow: "hidden"
          }}
        >
          <aside
            style={{
              width: isMobile ? "100%" : 360,
              flexShrink: 0,
              borderRight: isMobile ? "none" : "1px solid var(--border-primary)",
              borderBottom: isMobile ? "1px solid var(--border-primary)" : "none",
              display: "flex",
              flexDirection: "column",
              maxHeight: isMobile ? "42vh" : "100%"
            }}
          >
            <div style={{ flexShrink: 0, padding: "20px 20px 16px", borderBottom: "1px solid var(--border-primary)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    background: "#22C55E",
                    animation: "dash-build-pulse 2s ease-in-out infinite",
                    flexShrink: 0
                  }}
                />
                <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: "1px" }}>LACORE AGENT</span>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {data.buildingLogMessages.slice(0, data.buildLogVisible).map((text, idx) => (
                <div
                  key={`${idx}-${text}`}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-primary)",
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
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: 24 }}>
            <div style={{ width: "100%", maxWidth: 360, margin: "0 auto" }}>
              <div style={{ height: 3, background: "var(--border-primary)", overflow: "hidden" }}>
                <div
                  style={{
                    height: 3,
                    width: `${data.buildProgressWidth}%`,
                    background: "#06B6D4",
                    transition: "width 90s linear"
                  }}
                />
              </div>
              <p style={{ margin: "14px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
                {data.buildLogVisible > 0
                  ? data.buildingLogMessages[data.buildLogVisible - 1]
                  : "Starting..."}
              </p>
              <p style={{ margin: "10px 0 0", fontSize: 10, color: "var(--text-muted)" }}>
                Generating your landing page...
              </p>
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
              padding: 20
            }}
          >
            <h3 style={{ margin: 0, fontWeight: 800, letterSpacing: "-0.02em", fontSize: 36 }}>TELL US ABOUT YOUR BUSINESS</h3>
            <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
              3 quick questions to make your landing page 10x better
            </p>
            <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
              <div>
                <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.14em", color: "#06B6D4" }}>BUSINESS NAME</p>
                <input
                  value={data.businessName}
                  onChange={(e) => data.setBusinessName(e.target.value)}
                  placeholder="Nike, Alex Design Studio..."
                  style={{
                    width: "100%",
                    marginTop: 6,
                    border: "1px solid var(--border-primary)",
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    padding: "10px 12px",
                    fontFamily: "inherit",
                    fontSize: 12,
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.14em", color: "#06B6D4" }}>PRIMARY GOAL</p>
                <p style={{ margin: "6px 0 0", fontSize: 10, color: "var(--text-muted)" }}>What should visitors do?</p>
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
                          border: `1px solid ${selected ? "#06B6D4" : "var(--border-primary)"}`,
                          background: selected ? "#06B6D4" : "transparent",
                          color: selected ? "#000" : "var(--text-secondary)",
                          fontFamily: "inherit",
                          fontSize: 11,
                          textAlign: "left",
                          padding: "10px",
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
                <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.14em", color: "#06B6D4" }}>SITE VIBE</p>
                <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {["💼 Professional & trustworthy", "⚡ Bold & energetic", "💎 Luxury & premium", "🤝 Warm & approachable"].map(
                    (vibe) => {
                      const selected = data.siteVibe === vibe;
                      return (
                        <button
                          key={vibe}
                          type="button"
                          onClick={() => data.setSiteVibe(vibe)}
                          style={{
                            border: `1px solid ${selected ? "#06B6D4" : "var(--border-primary)"}`,
                            background: selected ? "#06B6D4" : "transparent",
                            color: selected ? "#000" : "var(--text-secondary)",
                            fontFamily: "inherit",
                            fontSize: 11,
                            textAlign: "left",
                            padding: "10px",
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
                  data.setShowOnboarding(false);
                  void data.handleBuildLandingPage();
                }}
                style={{
                  flex: 1,
                  border: "1px solid #06B6D4",
                  background: "transparent",
                  color: "#06B6D4",
                  fontFamily: "inherit",
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
                    !data.businessName.trim() || data.primaryGoals.length === 0 || !data.siteVibe
                      ? "var(--border-primary)"
                      : "#06B6D4",
                  color:
                    !data.businessName.trim() || data.primaryGoals.length === 0 || !data.siteVibe
                      ? "var(--text-muted)"
                      : "#000",
                  fontFamily: "inherit",
                  fontSize: 11,
                  padding: "10px 12px",
                  cursor:
                    !data.businessName.trim() || data.primaryGoals.length === 0 || !data.siteVibe
                      ? "not-allowed"
                      : "pointer"
                }}
              >
                BUILD MY PAGE →
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
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border-primary)",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box"
        }}
      >
        <div style={{ padding: "24px 20px" }}>
          <Link
            href="/"
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "var(--text-primary)",
              textDecoration: "none",
              display: "inline-block"
            }}
          >
            ← LACORE
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#06B6D4",
                color: "#000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              {sidebarInitials}
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)", wordBreak: "break-all" }}>{data.email}</span>
          </div>
          <button
            type="button"
            onClick={() => void data.handleSignOut()}
            style={{
              marginTop: 4,
              padding: 0,
              border: "none",
              background: "none",
              fontSize: 10,
              color: "var(--text-muted)",
              cursor: "pointer",
              fontFamily: "inherit"
            }}
          >
            SIGN OUT
          </button>
        </div>
        <div style={{ height: 1, background: "var(--border-primary)" }} />
        <nav style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  cursor: "pointer",
                  textDecoration: "none",
                  borderLeft: active ? "2px solid #06B6D4" : "2px solid transparent",
                  background: active ? "rgba(6,182,212,0.08)" : "transparent",
                  marginBottom: 2
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", width: 20 }}>{item.num}</span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    color: active ? "var(--text-primary)" : "var(--text-secondary)"
                  }}
                >
                  {item.label}
                </span>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: badgeColor(item.badgeTone) }}>
                  {item.badge}
                </span>
              </Link>
            );
          })}
        </nav>
        <div style={{ height: 1, background: "var(--border-primary)" }} />
        <div style={{ padding: 8 }}>
          <Link
            href="/dashboard/settings"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              textDecoration: "none",
              borderLeft: pathname.startsWith("/dashboard/settings") ? "2px solid #06B6D4" : "2px solid transparent",
              background: pathname.startsWith("/dashboard/settings") ? "rgba(6,182,212,0.08)" : "transparent",
              color: pathname.startsWith("/dashboard/settings") ? "var(--text-primary)" : "var(--text-secondary)",
              fontSize: 12,
              fontWeight: 600
            }}
          >
            <span>⚙</span>
            <span>SETTINGS</span>
          </Link>
        </div>
      </aside>

      <aside
        className="dash-chat-col"
        style={{
          width: CHAT_W,
          flexShrink: 0,
          height: "100vh",
          background: "var(--bg-primary)",
          borderRight: "1px solid var(--border-primary)",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box"
        }}
      >
        <div style={{ padding: 20, borderBottom: "1px solid var(--border-primary)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 6, height: 6, background: "#22c55e", display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}>SALES BUILDER</span>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
          {chatMessages.map((m, idx) => (
            <div
              key={`${idx}-${m.text.slice(0, 20)}`}
              style={{
                background: m.role === "user" ? "rgba(6,182,212,0.08)" : "var(--bg-card)",
                border: m.role === "assistant" ? "1px solid var(--border-primary)" : "none",
                padding: "12px 14px",
                marginBottom: 8,
                marginLeft: m.role === "user" ? "auto" : 0,
                marginRight: m.role === "user" ? 0 : "auto",
                maxWidth: m.role === "user" ? "85%" : "95%",
                fontSize: 13,
                lineHeight: 1.6,
                color: "var(--text-primary)",
                boxSizing: "border-box"
              }}
            >
              {m.text}
            </div>
          ))}
          {chatLoading ? (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Thinking…</div>
          ) : null}
          <div ref={chatEndRef} />
        </div>
        <form
          onSubmit={(e) => void handleDashboardChatSend(e)}
          style={{
            borderTop: "1px solid var(--border-primary)",
            padding: "16px 20px",
            flexShrink: 0
          }}
        >
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleChatKeyDown}
            rows={3}
            placeholder="Ask anything…"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "var(--bg-input)",
              border: "1px solid var(--border-primary)",
              padding: "10px 12px",
              fontSize: 13,
              resize: "none",
              fontFamily: "inherit",
              color: "var(--text-primary)",
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
              padding: "12px 24px",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.1em",
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
          boxSizing: "border-box"
        }}
      >
        {children}
      </div>
    </main>
  );
}
