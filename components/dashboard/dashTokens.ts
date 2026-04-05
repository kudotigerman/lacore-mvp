import type { CSSProperties } from "react";

/** Injected on `.dash-premium-root` in DashboardChrome */
export const dashPremiumCss = `
.dash-premium-root {
  --sidebar-bg: #060608;
  --content-bg: #0A0A0D;
  --chat-bg: #0D0D11;
  --card-bg: #111116;
  --card-border: #1C1C22;
  --input-bg: #16161C;
  --text-primary: #FAFAFA;
  --text-secondary: #A1A1AA;
  --text-muted: #52525B;
  --text-dim: #3F3F46;
  --nav-inactive: #71717A;
  --border: #1C1C22;
  --border-secondary: #27272E;
  --accent: #06B6D4;
  --accent-subtle: rgba(6,182,212,0.08);
  --success: #22c55e;
  --danger: #ef4444;
}
.dash-premium-root .dash-offer-gen-field::placeholder,
.dash-premium-root .dash-offer-gen-field::-webkit-input-placeholder {
  color: #3f3f46;
  font-style: italic;
  opacity: 1;
}
.dash-premium-root .dash-offer-gen-field::-moz-placeholder {
  color: #3f3f46;
  font-style: italic;
  opacity: 1;
}
.dash-premium-root .dash-focusable:focus {
  outline: none;
  border-color: rgba(6,182,212,0.5) !important;
}
.dash-premium-root textarea.dash-chat-input:focus {
  outline: none;
  border-color: rgba(6,182,212,0.4) !important;
}
.dash-premium-root .dash-nav-item:hover:not(.dash-nav-item-active) {
  background: rgba(255,255,255,0.03) !important;
}
.dash-premium-root .dash-sidebar-footer-link:hover {
  color: #71717A !important;
}
.dash-premium-root .content-machine-pill:hover {
  border-color: #27272E !important;
  color: #A1A1AA !important;
}
`;

export const dash = {
  pageShell: {
    padding: "36px 44px",
    boxSizing: "border-box" as const,
    background: "var(--content-bg)",
    minHeight: "100%",
    height: "100%",
    overflowY: "auto" as const
  } satisfies CSSProperties,

  pageHeaderWrap: {
    borderBottom: "1px solid #1C1C22",
    paddingBottom: 20,
    marginBottom: 28
  } satisfies CSSProperties,

  pageTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: "#FFFFFF",
    fontFamily: "inherit",
    letterSpacing: "-0.01em"
  } satisfies CSSProperties,

  pageSubtitle: {
    margin: "3px 0 0",
    fontSize: 13,
    color: "#52525B",
    fontFamily: "inherit",
    lineHeight: 1.5
  } satisfies CSSProperties,

  sectionTitle: {
    margin: 0,
    marginBottom: 6,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "#52525B",
    textTransform: "uppercase",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  /** @deprecated use sectionTitle */
  sectionLabel: {
    margin: 0,
    marginBottom: 6,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "#52525B",
    textTransform: "uppercase",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  body: {
    fontSize: 14,
    lineHeight: 1.6,
    color: "var(--text-secondary)",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  small: {
    fontSize: 12,
    color: "var(--text-muted)",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  metricNumber: {
    fontSize: 40,
    fontWeight: 800,
    color: "#FFFFFF",
    letterSpacing: "-0.03em",
    fontFamily: "inherit",
    lineHeight: 1
  } satisfies CSSProperties,

  metricCaption: {
    fontSize: 11,
    color: "#3F3F46",
    marginTop: 6,
    fontFamily: "inherit",
    lineHeight: 1.4
  } satisfies CSSProperties,

  card: {
    background: "var(--card-bg)",
    border: "1px solid #1C1C22",
    borderRadius: 8,
    padding: "20px 24px",
    boxSizing: "border-box" as const
  } satisfies CSSProperties,

  cardCompact: {
    background: "var(--card-bg)",
    border: "1px solid #1C1C22",
    borderRadius: 8,
    padding: "16px 20px",
    boxSizing: "border-box" as const
  } satisfies CSSProperties,

  /** Right column on landing — tighter card padding */
  cardPanel: {
    background: "var(--card-bg)",
    border: "1px solid #1C1C22",
    borderRadius: 8,
    padding: "16px 20px",
    boxSizing: "border-box" as const
  } satisfies CSSProperties,

  btnPrimary: {
    background: "#06B6D4",
    color: "#000",
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  btnPrimarySm: {
    background: "#06B6D4",
    color: "#000",
    padding: "6px 14px",
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 5,
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  btnSettingsSave: {
    background: "#06B6D4",
    color: "#000",
    padding: "9px 20px",
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  btnGhost: {
    background: "transparent",
    border: "1px solid #1C1C22",
    color: "var(--text-secondary)",
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 500,
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  btnGhostSm: {
    background: "transparent",
    border: "1px solid #1C1C22",
    color: "var(--text-secondary)",
    padding: "5px 12px",
    fontSize: 11,
    fontWeight: 500,
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  /** Edit on offer page */
  btnGhostEdit: {
    background: "transparent",
    border: "1px solid #1C1C22",
    color: "var(--text-secondary)",
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  /** Landing Preview / Edit full-width */
  btnGhostBlock: {
    background: "transparent",
    border: "1px solid #1C1C22",
    color: "var(--text-secondary)",
    padding: "9px 16px",
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box" as const,
    textAlign: "center" as const
  } satisfies CSSProperties,

  btnCopyAccent: {
    background: "rgba(6,182,212,0.08)",
    border: "1px solid rgba(6,182,212,0.2)",
    color: "#06B6D4",
    fontSize: 12,
    padding: "6px 12px",
    borderRadius: 5,
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 600,
    flexShrink: 0
  } satisfies CSSProperties,

  btnDanger: {
    color: "#ef4444",
    border: "1px solid rgba(239,68,68,0.25)",
    background: "transparent",
    padding: "9px 20px",
    fontSize: 13,
    fontWeight: 500,
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  input: {
    width: "100%",
    boxSizing: "border-box" as const,
    background: "var(--input-bg)",
    border: "1px solid #1C1C22",
    borderRadius: 6,
    padding: "9px 12px",
    fontSize: 14,
    color: "#FFFFFF",
    outline: "none",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  /** Readonly URL field on landing */
  inputUrl: {
    width: "100%",
    boxSizing: "border-box" as const,
    background: "#16161C",
    border: "1px solid #1C1C22",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 13,
    color: "#A1A1AA",
    outline: "none",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  badgeSuccess: {
    fontSize: 9,
    fontWeight: 600,
    color: "#22c55e",
    background: "rgba(34,197,94,0.08)",
    padding: "2px 6px",
    borderRadius: 3
  } satisfies CSSProperties,

  badgeLive: {
    fontSize: 9,
    fontWeight: 600,
    color: "#06B6D4",
    background: "rgba(6,182,212,0.08)",
    padding: "2px 6px",
    borderRadius: 3
  } satisfies CSSProperties,

  badgeSoon: {
    fontSize: 9,
    fontWeight: 600,
    color: "#3F3F46",
    background: "rgba(255,255,255,0.03)",
    padding: "2px 6px",
    borderRadius: 3
  } satisfies CSSProperties
};
