import type { CSSProperties } from "react";

export const dash = {
  pageTitle: {
    margin: 0,
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "var(--text-primary)",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  sectionLabel: {
    margin: 0,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.12em",
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

  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-primary)",
    padding: 24,
    boxSizing: "border-box" as const
  } satisfies CSSProperties,

  btnPrimary: {
    background: "#06B6D4",
    color: "#000",
    padding: "12px 24px",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.1em",
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  btnGhost: {
    background: "transparent",
    border: "1px solid var(--border-primary)",
    color: "var(--text-secondary)",
    padding: "12px 24px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  btnDanger: {
    background: "transparent",
    border: "1px solid rgba(239,68,68,0.4)",
    color: "#ef4444",
    padding: "12px 24px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit"
  } satisfies CSSProperties,

  input: {
    width: "100%",
    boxSizing: "border-box" as const,
    border: "1px solid var(--border-primary)",
    background: "var(--bg-input)",
    color: "var(--text-primary)",
    fontFamily: "inherit",
    fontSize: 13,
    lineHeight: 1.5,
    padding: "10px 12px",
    outline: "none"
  } satisfies CSSProperties
};
