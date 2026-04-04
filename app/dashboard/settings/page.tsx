"use client";

import { dash } from "@/components/dashboard/dashTokens";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";

export default function DashboardSettingsPage() {
  const d = useDashboardData();

  return (
    <div style={{ padding: 48, maxWidth: 600, boxSizing: "border-box" }}>
      <h1 style={{ ...dash.pageTitle, marginBottom: 40 }}>SETTINGS</h1>

      <section style={{ marginBottom: 40, paddingBottom: 32, borderBottom: "1px solid var(--border-primary)" }}>
        <p style={{ ...dash.sectionLabel, marginBottom: 20 }}>PROFILE</p>
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <p style={{ ...dash.sectionLabel, marginBottom: 8, fontSize: 10 }}>DISPLAY NAME</p>
            <input
              type="text"
              value={d.profileDisplayName}
              onChange={(e) => d.setProfileDisplayName(e.target.value)}
              style={dash.input}
            />
          </div>
          <div>
            <p style={{ ...dash.sectionLabel, marginBottom: 8, fontSize: 10 }}>EMAIL</p>
            <p style={{ ...dash.body, margin: 0, color: "var(--text-muted)" }}>{d.email || "—"}</p>
          </div>
          <div>
            <p style={{ ...dash.sectionLabel, marginBottom: 8, fontSize: 10 }}>TELEGRAM</p>
            <input
              type="text"
              value={d.profileTelegram}
              onChange={(e) => d.setProfileTelegram(e.target.value)}
              placeholder="@username"
              style={dash.input}
            />
          </div>
          <div>
            <p style={{ ...dash.sectionLabel, marginBottom: 8, fontSize: 10 }}>WHATSAPP</p>
            <input
              type="text"
              value={d.profileWhatsapp}
              onChange={(e) => d.setProfileWhatsapp(e.target.value)}
              placeholder="+1..."
              style={dash.input}
            />
          </div>
          {d.profileSaveError ? <p style={{ color: "#ef4444", fontSize: 12, margin: 0 }}>{d.profileSaveError}</p> : null}
          <button
            type="button"
            disabled={d.profileSaving}
            onClick={() => void d.handleSaveProfile()}
            style={{ ...dash.btnPrimary, alignSelf: "flex-start", opacity: d.profileSaving ? 0.6 : 1 }}
          >
            {d.profileSaving ? "SAVING…" : "SAVE PROFILE"}
          </button>
        </div>
      </section>

      <section style={{ marginBottom: 40, paddingBottom: 32, borderBottom: "1px solid var(--border-primary)" }}>
        <p style={{ ...dash.sectionLabel, marginBottom: 20 }}>NOTIFICATIONS</p>
        <p style={{ ...dash.sectionLabel, marginBottom: 8, fontSize: 10 }}>EMAIL NOTIFICATIONS</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => d.setProfileEmailNotifications(true)}
            style={{
              ...dash.btnGhost,
              borderColor: d.profileEmailNotifications ? "#06B6D4" : "var(--border-primary)",
              background: d.profileEmailNotifications ? "rgba(6,182,212,0.12)" : "transparent"
            }}
          >
            ON
          </button>
          <button
            type="button"
            onClick={() => d.setProfileEmailNotifications(false)}
            style={{
              ...dash.btnGhost,
              borderColor: !d.profileEmailNotifications ? "#06B6D4" : "var(--border-primary)",
              background: !d.profileEmailNotifications ? "rgba(6,182,212,0.12)" : "transparent"
            }}
          >
            OFF
          </button>
        </div>
        <p style={{ ...dash.sectionLabel, marginBottom: 8, fontSize: 10 }}>TELEGRAM CHAT ID</p>
        <input
          type="text"
          value={d.profileTelegramChatId}
          onChange={(e) => d.setProfileTelegramChatId(e.target.value)}
          placeholder="123456789"
          style={{ ...dash.input, marginBottom: 8 }}
        />
        <p style={{ ...dash.small, margin: 0, lineHeight: 1.5 }}>
          To get your Chat ID: open Telegram → find @lacorebot → send /start → bot will reply with your Chat ID
        </p>
        <p style={{ ...dash.small, margin: "12px 0 0", fontStyle: "italic" }}>
          Use Save Profile above to persist notification settings.
        </p>
      </section>

      <section style={{ marginBottom: 40, paddingBottom: 32, borderBottom: "1px solid var(--border-primary)" }}>
        <p style={{ ...dash.sectionLabel, marginBottom: 16 }}>APPEARANCE</p>
        <p style={{ ...dash.small, margin: "0 0 10px" }}>Theme</p>
        <div style={{ display: "flex", gap: 8 }}>
          {(["dark", "light"] as const).map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => d.setDashboardTheme(theme)}
              style={{
                ...dash.btnGhost,
                flex: 1,
                borderColor: d.uiTheme === theme ? "#06B6D4" : "var(--border-primary)",
                background: d.uiTheme === theme ? "rgba(6,182,212,0.12)" : "transparent",
                textTransform: "uppercase"
              }}
            >
              {theme}
            </button>
          ))}
        </div>
      </section>

      <section>
        <p style={{ ...dash.sectionLabel, marginBottom: 16 }}>ACCOUNT</p>
        <button type="button" onClick={() => void d.handleSignOut()} style={dash.btnDanger}>
          SIGN OUT
        </button>
      </section>
    </div>
  );
}
