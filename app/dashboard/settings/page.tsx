"use client";

import { DashPageHeader } from "@/components/dashboard/DashPageHeader";
import { dash } from "@/components/dashboard/dashTokens";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";

export default function DashboardSettingsPage() {
  const d = useDashboardData();

  const toggleActive = (on: boolean) => ({
    borderColor: on ? "rgba(6,182,212,0.4)" : "#1C1C22",
    background: on ? "rgba(6,182,212,0.15)" : "transparent",
    color: on ? "#06B6D4" : "var(--text-secondary)"
  });

  return (
    <div style={{ ...dash.pageShell, maxWidth: 520 }}>
      <DashPageHeader title="Settings" subtitle="Manage your account and preferences" />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ ...dash.card }}>
          <p style={{ ...dash.sectionTitle, marginBottom: 16 }}>Profile</p>
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <p style={dash.sectionTitle}>Display name</p>
              <input
                className="dash-focusable"
                type="text"
                value={d.profileDisplayName}
                onChange={(e) => d.setProfileDisplayName(e.target.value)}
                style={dash.input}
              />
            </div>
            <div>
              <p style={dash.sectionTitle}>Email</p>
              <input
                className="dash-focusable"
                type="text"
                readOnly
                value={d.email || "—"}
                style={{ ...dash.input, color: "#52525B" }}
              />
            </div>
            <div>
              <p style={dash.sectionTitle}>Telegram</p>
              <input
                className="dash-focusable"
                type="text"
                value={d.profileTelegram}
                onChange={(e) => d.setProfileTelegram(e.target.value)}
                placeholder="@username"
                style={dash.input}
              />
            </div>
            <div>
              <p style={dash.sectionTitle}>WhatsApp</p>
              <input
                className="dash-focusable"
                type="text"
                value={d.profileWhatsapp}
                onChange={(e) => d.setProfileWhatsapp(e.target.value)}
                placeholder="+1..."
                style={dash.input}
              />
            </div>
            {d.profileSaveError ? <p style={{ color: "var(--danger)", fontSize: 12, margin: 0 }}>{d.profileSaveError}</p> : null}
            <button
              type="button"
              disabled={d.profileSaving}
              onClick={() => void d.handleSaveProfile()}
              style={{ ...dash.btnSettingsSave, alignSelf: "flex-start", opacity: d.profileSaving ? 0.6 : 1 }}
            >
              {d.profileSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div style={{ ...dash.card }}>
          <p style={{ ...dash.sectionTitle, marginBottom: 16 }}>Notifications</p>
          <p style={dash.sectionTitle}>Email</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => d.setProfileEmailNotifications(true)}
              style={{
                ...dash.btnGhost,
                ...toggleActive(d.profileEmailNotifications),
                flex: 1
              }}
            >
              On
            </button>
            <button
              type="button"
              onClick={() => d.setProfileEmailNotifications(false)}
              style={{
                ...dash.btnGhost,
                ...toggleActive(!d.profileEmailNotifications),
                flex: 1
              }}
            >
              Off
            </button>
          </div>
          <p style={dash.sectionTitle}>Telegram chat ID</p>
          <input
            className="dash-focusable"
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
            Use Save above to persist notification settings.
          </p>
        </div>

        <div style={{ ...dash.card }}>
          <p style={{ ...dash.sectionTitle, marginBottom: 16 }}>Appearance</p>
          <div style={{ display: "flex", gap: 8 }}>
            {(["dark", "light"] as const).map((theme) => {
              const active = d.uiTheme === theme;
              return (
                <button
                  key={theme}
                  type="button"
                  onClick={() => d.setDashboardTheme(theme)}
                  style={{
                    ...dash.btnGhost,
                    flex: 1,
                    textTransform: "uppercase",
                    ...toggleActive(active)
                  }}
                >
                  {theme}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ ...dash.card }}>
          <p style={{ ...dash.sectionTitle, marginBottom: 16 }}>Account</p>
          <button type="button" onClick={() => void d.handleSignOut()} style={dash.btnDanger}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
