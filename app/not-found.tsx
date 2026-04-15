"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07080F",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        padding: "24px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background orbs */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 800px 500px at 50% -100px, rgba(99,102,241,0.12), transparent)",
      }} />
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 400px 300px at 80% 80%, rgba(99,102,241,0.06), transparent)",
      }} />

      {/* Logo */}
      <div style={{ marginBottom: 48, position: "relative", zIndex: 1 }}>
        <Logo size="lg" variant="dark" href="/" />
      </div>

      {/* 404 number */}
      <div style={{ position: "relative", zIndex: 1, marginBottom: 24 }}>
        <p style={{
          fontSize: "clamp(96px, 20vw, 180px)",
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: "-0.05em",
          background: "linear-gradient(135deg, #6366F1, #818CF8)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          margin: 0,
        }}>404</p>
      </div>

      {/* Message */}
      <div style={{ position: "relative", zIndex: 1, marginBottom: 40, maxWidth: 420 }}>
        <h1 style={{
          fontSize: "clamp(20px, 4vw, 28px)",
          fontWeight: 700,
          color: "#FAFAFA",
          letterSpacing: "-0.02em",
          margin: "0 0 12px",
        }}>
          This page doesn&apos;t exist
        </h1>
        <p style={{
          fontSize: 16,
          color: "#A1A1AA",
          lineHeight: 1.6,
          margin: 0,
        }}>
          Looks like this page was moved or never existed. Let&apos;s get you back on track.
        </p>
      </div>

      {/* Buttons */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center"
      }}>
        <Link
          href="/"
          style={{
            background: "#6366F1",
            color: "#fff",
            padding: "12px 28px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
            letterSpacing: "0.02em",
          }}
        >
          Back to home
        </Link>
        <Link
          href="/dashboard/offer"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#FAFAFA",
            padding: "12px 28px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Go to dashboard
        </Link>
      </div>

      {/* Bottom watermark */}
      <div style={{
        position: "absolute", bottom: 24,
        fontSize: 12, color: "#3F3F46", zIndex: 1,
      }}>
        © 2026 LACORE · Your AI Sales Team
      </div>
    </div>
  );
}
