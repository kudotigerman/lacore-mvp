import Link from "next/link";
import type { ReactNode } from "react";

export function LegalDocShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-primary)",
        color: "var(--text-primary)"
      }}
    >
      <style>{`
        .legal-doc-body h2 {
          font-size: 18px;
          font-weight: 700;
          margin-top: 40px;
          margin-bottom: 12px;
          color: var(--text-primary);
          font-family: var(--font-geist-sans), system-ui, sans-serif;
        }
        .legal-doc-body h2:first-child {
          margin-top: 0;
        }
        .legal-doc-body p {
          font-size: 15px;
          line-height: 1.75;
          color: var(--text-secondary);
          margin: 0 0 12px;
          font-family: var(--font-geist-sans), system-ui, sans-serif;
        }
        .legal-doc-body ul {
          font-size: 15px;
          line-height: 1.75;
          color: var(--text-secondary);
          padding-left: 20px;
          margin: 0 0 16px;
          font-family: var(--font-geist-sans), system-ui, sans-serif;
        }
        .legal-doc-body li {
          margin-bottom: 8px;
        }
      `}</style>

      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          height: 68,
          background: "color-mix(in srgb, var(--bg-primary) 92%, transparent)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px"
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1300,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16
          }}
        >
          <Link
            href="/"
            style={{
              margin: 0,
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              fontSize: 22,
              color: "var(--accent)",
              textDecoration: "none"
            }}
          >
            LACORE
          </Link>
          <Link
            href="/dashboard"
            style={{
              border: "1px solid var(--accent)",
              background: "transparent",
              color: "var(--accent)",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontSize: 11,
              letterSpacing: "0.15em",
              padding: "10px 14px",
              cursor: "pointer",
              textDecoration: "none",
              whiteSpace: "nowrap"
            }}
          >
            GO TO DASHBOARD →
          </Link>
        </div>
      </nav>

      <main style={{ flex: 1 }}>
        <article style={{ maxWidth: 720, margin: "0 auto", padding: "80px 24px" }}>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 800,
              marginBottom: 8,
              color: "var(--text-primary)",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              letterSpacing: "-0.02em",
              lineHeight: 1.15
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              marginBottom: 48,
              marginTop: 0,
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
            }}
          >
            Last updated: April 2026
          </p>
          <div className="legal-doc-body">{children}</div>
        </article>
      </main>

      <footer
        style={{
          textAlign: "center",
          fontSize: 13,
          color: "var(--text-muted)",
          padding: "40px 24px",
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
          borderTop: "1px solid var(--border-primary)"
        }}
      >
        © 2026 LACORE. All rights reserved.
      </footer>
    </div>
  );
}
