import type { CSSProperties } from "react";

/** Injected on `.dash-premium-root` in DashboardChrome */
export const dashPremiumCss = `
.dash-premium-root {
  --sidebar-bg: #0D0D10;
  --content-bg: #111114;
  --chat-bg: #0F0F12;
  --card-bg: #18181C;
  --card-border: rgba(255,255,255,0.06);
  --text-primary: #F4F4F5;
  --text-secondary: #A1A1AA;
  --text-muted: #52525B;
  --accent: #06B6D4;
  --accent-subtle: rgba(6,182,212,0.08);
  --success: #22c55e;
  --danger: #ef4444;
  --border: rgba(255,255,255,0.06);
}
.dash-premium-root .dash-focusable:focus {
  outline: none;
  border-color: rgba(6,182,212,0.5) !important;
}
`;

export const dash = {
  pageShell: {
    padding: "32px 40px",
    boxSizing: "border-box" as const,
    background: "var(--content-bg)",
    minHeight: "100%"
  } satisfies CSSProperties,

  pageHeaderWrap: {
    borderBottom: "1px solid var(--border)",
    paddingBottom: 20,
    marginBottom: 28
  } satisfies CSSProperties,

  pageTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 600,
    color: "var(--text-primary)",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  pageSubtitle: {
    margin: "2px 0 0",
    fontSize: 13,
    color: "var(--text-muted)",
    fontFamily: "inherit",
    lineHeight: 1.5
  } satisfies CSSProperties,

  sectionTitle: {
    margin: 0,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.08em",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  /** @deprecated use sectionTitle */
  sectionLabel: {
    margin: 0,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.08em",
    color: "var(--text-muted)",
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
    fontSize: 36,
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
    fontFamily: "inherit",
    lineHeight: 1.1
  } satisfies CSSProperties,

  card: {
    background: "var(--card-bg)",
    border: "1px solid var(--card-border)",
    borderRadius: 10,
    padding: 20,
    boxSizing: "border-box" as const
  } satisfies CSSProperties,

  cardCompact: {
    background: "var(--card-bg)",
    border: "1px solid var(--card-border)",
    borderRadius: 10,
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
    padding: "8px 14px",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  btnGhost: {
    background: "transparent",
    border: "1px solid var(--border)",
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
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  btnDanger: {
    color: "#ef4444",
    border: "1px solid rgba(239,68,68,0.3)",
    background: "transparent",
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 500,
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  input: {
    width: "100%",
    boxSizing: "border-box" as const,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 14,
    color: "var(--text-primary)",
    outline: "none",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  badgeSuccess: {
    fontSize: 10,
    fontWeight: 600,
    color: "var(--success)",
    background: "rgba(34,197,94,0.1)",
    padding: "1px 6px",
    borderRadius: 4
  } satisfies CSSProperties,

  badgeLive: {
    fontSize: 10,
    fontWeight: 600,
    color: "var(--accent)",
    background: "rgba(6,182,212,0.1)",
    padding: "1px 6px",
    borderRadius: 4
  } satisfies CSSProperties,

  badgeSoon: {
    fontSize: 10,
    fontWeight: 600,
    color: "var(--text-muted)",
    background: "rgba(255,255,255,0.04)",
    padding: "1px 6px",
    borderRadius: 4
  } satisfies CSSProperties
};
