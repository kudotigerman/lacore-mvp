"use client";

import DomainConnect from "@/components/DomainConnect";
import { dash } from "@/components/dashboard/dashTokens";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import StripeConnect from "@/components/StripeConnect";

export default function DashboardLandingPage() {
  const d = useDashboardData();

  async function copyUrl() {
    if (!d.landingSlug) return;
    await navigator.clipboard.writeText(`https://www.lacore.ai/p/${d.landingSlug}`);
  }

  return (
    <div style={{ padding: 48, boxSizing: "border-box" }}>
      <h1 style={{ ...dash.pageTitle, marginBottom: 32 }}>LANDING PAGE</h1>

      {!d.offer ? (
        <p style={dash.body}>Add your offer first on the Offer page.</p>
      ) : (
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 360px", minWidth: 280 }}>
            {!d.landingSlug ? (
              <div style={{ ...dash.card }}>
                <p style={{ ...dash.body, margin: "0 0 16px" }}>
                  Build a full page from your offer — no design skills required.
                </p>
                <button
                  type="button"
                  onClick={() => d.setShowOnboarding(true)}
                  disabled={d.buildingLanding}
                  style={{
                    ...dash.btnPrimary,
                    width: "100%",
                    cursor: d.buildingLanding ? "not-allowed" : "pointer",
                    opacity: d.buildingLanding ? 0.6 : 1
                  }}
                >
                  BUILD MY LANDING PAGE →
                </button>
                {d.buildError ? (
                  <p style={{ margin: "12px 0 0", fontSize: 12, color: "#ef4444" }}>{d.buildError}</p>
                ) : null}
              </div>
            ) : (
              <div
                style={{
                  border: "1px solid var(--border-primary)",
                  background: "var(--bg-card)",
                  overflow: "hidden"
                }}
              >
                <iframe
                  title="Landing preview"
                  src={`/p/${d.landingSlug}`}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
                  style={{
                    width: "100%",
                    height: 420,
                    border: "none",
                    display: "block",
                    pointerEvents: "none"
                  }}
                />
              </div>
            )}
          </div>

          <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 0 }}>
            {d.landingSlug ? (
              <>
                <div style={{ paddingBottom: 24, borderBottom: "1px solid var(--border-primary)" }}>
                  <p style={{ ...dash.sectionLabel, marginBottom: 12 }}>URL</p>
                  <div
                    style={{
                      border: "1px solid var(--border-primary)",
                      padding: "10px 12px",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      wordBreak: "break-all",
                      marginBottom: 12,
                      background: "var(--bg-card)"
                    }}
                  >
                    https://www.lacore.ai/p/{d.landingSlug}
                  </div>
                  <button type="button" onClick={() => void copyUrl()} style={{ ...dash.btnGhost, width: "100%", marginBottom: 12 }}>
                    COPY
                  </button>
                  <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                    <a
                      href={`/p/${d.landingSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ ...dash.btnGhost, textAlign: "center", textDecoration: "none", display: "block" }}
                    >
                      PREVIEW →
                    </a>
                    <a
                      href={`/p/${d.landingSlug}?edit=true`}
                      style={{ ...dash.btnGhost, textAlign: "center", textDecoration: "none", display: "block" }}
                    >
                      EDIT PAGE →
                    </a>
                  </div>
                </div>

                {d.userId ? (
                  <div style={{ padding: "24px 0", borderBottom: "1px solid var(--border-primary)" }}>
                    <p style={{ ...dash.sectionLabel, marginBottom: 12 }}>DOMAIN</p>
                    <DomainConnect slug={d.landingSlug} userId={d.userId} />
                  </div>
                ) : null}

                {d.userId ? (
                  <div style={{ padding: "24px 0", borderBottom: "1px solid var(--border-primary)" }}>
                    <p style={{ ...dash.sectionLabel, marginBottom: 12 }}>PAYMENT</p>
                    <StripeConnect userId={d.userId} />
                  </div>
                ) : null}

                <div style={{ paddingTop: 24 }}>
                  <p style={{ ...dash.sectionLabel, marginBottom: 12 }}>REGENERATE</p>
                  {d.regenerateConfirm ? (
                    <div>
                      <p style={{ ...dash.small, margin: "0 0 12px" }}>Are you sure? This will replace your current site.</p>
                      {d.regenerateError ? (
                        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#ef4444" }}>{d.regenerateError}</p>
                      ) : null}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => {
                            d.setRegenerateError(null);
                            void d.handleRegenerateSiteConfirmed();
                          }}
                          disabled={d.buildingLanding}
                          style={{ ...dash.btnPrimary, flex: 1, opacity: d.buildingLanding ? 0.6 : 1 }}
                        >
                          YES
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            d.setRegenerateConfirm(false);
                            d.setRegenerateError(null);
                          }}
                          style={{ ...dash.btnGhost, flex: 1 }}
                        >
                          NO
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          d.setRegenerateError(null);
                          d.setRegenerateConfirm(true);
                        }}
                        disabled={d.buildingLanding}
                        style={{
                          ...dash.btnPrimary,
                          width: "100%",
                          opacity: d.buildingLanding ? 0.6 : 1,
                          cursor: d.buildingLanding ? "not-allowed" : "pointer"
                        }}
                      >
                        REGENERATE SITE →
                      </button>
                      <p style={{ ...dash.small, margin: "12px 0 0", lineHeight: 1.5 }}>
                        Generate a new version of your landing page
                      </p>
                    </>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
