"use client";

import { useRouter } from "next/navigation";
import DomainConnect from "@/components/DomainConnect";
import { DashPageHeader } from "@/components/dashboard/DashPageHeader";
import { dash } from "@/components/dashboard/dashTokens";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import StripeConnect from "@/components/StripeConnect";
import {
  LANDING_EDITOR_IMAGE_POPUP_TOKEN,
  LANDING_EDITOR_QUICK_ACTIONS,
  LANDING_EDITOR_QUICK_STORAGE_KEY
} from "@/lib/landingEditorQuickActions";

export default function DashboardLandingPage() {
  const d = useDashboardData();
  const router = useRouter();

  async function copyUrl() {
    if (!d.landingSlug) return;
    await navigator.clipboard.writeText(`https://www.lacore.ai/p/${d.landingSlug}`);
  }

  const url = d.landingSlug ? `https://www.lacore.ai/p/${d.landingSlug}` : "";

  return (
    <div style={dash.pageShell}>
      <DashPageHeader title="Landing Page" subtitle="Your public-facing sales page" />

      {!d.offer ? (
        <p style={dash.body}>Add your offer first on the Offer page.</p>
      ) : (
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ flex: "1.4 1 320px", minWidth: 280 }}>
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
                  Build my landing page →
                </button>
                {d.buildError ? (
                  <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--danger)" }}>{d.buildError}</p>
                ) : null}
              </div>
            ) : (
              <div
                style={{
                  border: "1px solid #1C1C22",
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "#111116"
                }}
              >
                <iframe
                  title="Landing preview"
                  src={`/p/${d.landingSlug}`}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  style={{
                    width: "100%",
                    height: 480,
                    border: "none",
                    display: "block",
                    pointerEvents: "none"
                  }}
                />
              </div>
            )}
          </div>

          <div style={{ flex: "1 1 280px", minWidth: 260, display: "flex", flexDirection: "column", gap: 12 }}>
            {d.landingSlug ? (
              <>
                <div style={{ ...dash.cardPanel }}>
                  <p style={{ ...dash.sectionTitle, marginBottom: 10 }}>Public URL</p>
                  <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                    <input readOnly value={url} className="dash-focusable" style={{ ...dash.inputUrl, flex: 1, minWidth: 0 }} />
                    <button type="button" onClick={() => void copyUrl()} style={dash.btnCopyAccent}>
                      Copy
                    </button>
                  </div>
                  <a
                    href={`/p/${d.landingSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ ...dash.btnGhostBlock, marginTop: 6, textDecoration: "none", display: "block" }}
                  >
                    Preview →
                  </a>
                  <a
                    href={`/p/${d.landingSlug}?edit=true`}
                    style={{ ...dash.btnGhostBlock, marginTop: 6, textDecoration: "none", display: "block" }}
                  >
                    Edit Page →
                  </a>
                  <p style={{ ...dash.small, margin: "14px 0 8px", color: "var(--text-muted)" }}>
                    AI editor quick prompts (opens editor with text ready to send):
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {LANDING_EDITOR_QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        onClick={() => {
                          try {
                            const prefill =
                              "kind" in action && action.kind === "image"
                                ? LANDING_EDITOR_IMAGE_POPUP_TOKEN
                                : "text" in action
                                  ? action.text
                                  : "";
                            sessionStorage.setItem(LANDING_EDITOR_QUICK_STORAGE_KEY, prefill);
                          } catch {
                            /* ignore */
                          }
                          router.push(`/p/${d.landingSlug}?edit=true`);
                        }}
                        style={{
                          fontFamily: "inherit",
                          fontSize: 11,
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "1px solid var(--border-primary)",
                          background: "var(--bg-card)",
                          color: "var(--text-secondary)",
                          cursor: "pointer",
                          lineHeight: 1.3
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>

                {d.userId ? (
                  <div style={{ ...dash.cardPanel }}>
                    <p style={{ ...dash.sectionTitle, marginBottom: 10 }}>Custom Domain</p>
                    <DomainConnect slug={d.landingSlug} userId={d.userId} />
                  </div>
                ) : null}

                {d.userId ? (
                  <div style={{ ...dash.cardPanel }}>
                    <p style={{ ...dash.sectionTitle, marginBottom: 10 }}>Payments</p>
                    <StripeConnect userId={d.userId} />
                  </div>
                ) : null}

                <div style={{ ...dash.cardPanel }}>
                  {d.regenerateConfirm ? (
                    <div>
                      <p style={{ ...dash.small, margin: "0 0 12px" }}>Are you sure? This will replace your current site.</p>
                      {d.regenerateError ? (
                        <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--danger)" }}>{d.regenerateError}</p>
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
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            d.setRegenerateConfirm(false);
                            d.setRegenerateError(null);
                          }}
                          style={{ ...dash.btnGhost, flex: 1 }}
                        >
                          No
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
                        Regenerate Site →
                      </button>
                      <p style={{ ...dash.small, margin: "10px 0 0", lineHeight: 1.5 }}>
                        Create a fresh version of your landing page
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
