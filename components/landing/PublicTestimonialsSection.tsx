"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string;
  client_name: string;
  client_role: string | null;
  rating: number;
  content: string;
  created_at: string;
};

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const n = Math.min(5, Math.max(1, Math.round(rating)));
  return (
    <span
      aria-label={`${n} out of 5 stars`}
      style={{ display: "inline-flex", gap: 3, color: "var(--accent, #c4a574)" }}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ fontSize: size, lineHeight: 1, opacity: i < n ? 1 : 0.22 }}>
          ★
        </span>
      ))}
    </span>
  );
}

export function PublicTestimonialsSection({ slug }: { slug: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    void fetch(`/api/testimonials/get?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((j: { testimonials?: Row[] }) => {
        if (!cancelled) setRows(Array.isArray(j.testimonials) ? j.testimonials : []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (rows === null || rows.length === 0) return null;

  return (
    <section
      style={{
        padding: "72px 24px 96px",
        background: "color-mix(in srgb, var(--bg-primary, #0a0a0d) 94%, var(--accent, #6366f1) 6%)",
        borderTop: "1px solid var(--border-primary, rgba(255,255,255,0.08))",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <p
          style={{
            margin: 0,
            fontSize: 10,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--accent, #818cf8)",
            fontWeight: 600
          }}
        >
          Loved by clients
        </p>
        <h2
          style={{
            margin: "10px 0 40px",
            fontSize: "clamp(26px, 4vw, 36px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "var(--text-primary, #fafafa)"
          }}
        >
          What people say
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 20
          }}
        >
          {rows.map((t) => (
            <article
              key={t.id}
              style={{
                borderRadius: 16,
                padding: "24px 22px",
                background: "color-mix(in srgb, var(--bg-secondary, #111116) 88%, transparent)",
                border: "1px solid var(--border-primary, rgba(255,255,255,0.08))",
                boxShadow: "0 20px 50px rgba(0,0,0,0.25)"
              }}
            >
              <div style={{ marginBottom: 14 }}>
                <Stars rating={t.rating} size={18} />
              </div>
              <blockquote
                style={{
                  margin: 0,
                  fontSize: 15,
                  lineHeight: 1.65,
                  color: "var(--text-secondary, #a1a1aa)",
                  fontStyle: "normal"
                }}
              >
                “{t.content}”
              </blockquote>
              <footer style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border-primary, rgba(255,255,255,0.06))" }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary, #fafafa)" }}>
                  {t.client_name}
                </p>
                {t.client_role ? (
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted, #71717a)" }}>{t.client_role}</p>
                ) : null}
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
