import { getAllPosts } from "@/lib/blog";
import { Logo } from "@/components/Logo";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog — LACORE",
  description: "Insights on getting clients, sales automation, and growing your service business."
};

export default function BlogPage() {
  const posts = getAllPosts();
  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      <nav
        style={{
          padding: "20px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border-primary)"
        }}
      >
        <Logo size="md" variant="dark" href="/" />
        <Link
          href="/dashboard"
          style={{
            background: "#06B6D4",
            color: "#000",
            padding: "8px 18px",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            borderRadius: 6
          }}
        >
          GO TO DASHBOARD →
        </Link>
      </nav>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "64px 24px" }}>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: "white", marginBottom: 8 }}>Blog</h1>
        <p style={{ fontSize: 16, color: "var(--text-muted)", marginBottom: 48 }}>
          Insights on getting clients, automating sales, and growing your service business.
        </p>

        {posts.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No posts yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-primary)",
                    borderRadius: 8,
                    padding: "24px 28px",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        color: "#06B6D4",
                        background: "rgba(6,182,212,0.08)",
                        padding: "2px 8px",
                        borderRadius: 4
                      }}
                    >
                      {post.category}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{post.readTime}</span>
                  </div>
                  <h2
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "white",
                      marginBottom: 8,
                      lineHeight: 1.3
                    }}
                  >
                    {post.title}
                  </h2>
                  <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>{post.description}</p>
                  <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-muted)" }}>{post.date}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
