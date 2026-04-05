import { getAllPosts, getPostBySlug } from "@/lib/blog";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPostBySlug(params.slug);
  if (!post) return {};
  return {
    title: `${post.title} — LACORE Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date
    }
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

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
        <Link
          href="/"
          style={{
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: "0.1em",
            color: "white",
            textDecoration: "none"
          }}
        >
          LACORE
        </Link>
        <Link href="/blog" style={{ fontSize: 13, color: "var(--text-secondary)", textDecoration: "none" }}>
          ← All posts
        </Link>
      </nav>

      <article style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ marginBottom: 32 }}>
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
          <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 12 }}>{post.readTime}</span>
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: "white", lineHeight: 1.2, marginBottom: 16 }}>{post.title}</h1>
        <p style={{ fontSize: 18, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 8 }}>{post.description}</p>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 48 }}>{post.date}</p>

        <div style={{ fontSize: 16, lineHeight: 1.8, color: "var(--text-secondary)" }} className="blog-content">
          <MDXRemote source={post.content} />
        </div>

        <div
          style={{
            marginTop: 64,
            padding: 32,
            background: "var(--bg-card)",
            border: "1px solid var(--border-primary)",
            borderRadius: 8,
            textAlign: "center"
          }}
        >
          <p style={{ fontSize: 20, fontWeight: 700, color: "white", marginBottom: 8 }}>Ready to get more clients?</p>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 20 }}>
            Build your sales machine in 60 minutes. Free to start.
          </p>
          <Link
            href="/auth"
            style={{
              background: "#06B6D4",
              color: "#000",
              padding: "12px 28px",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-block",
              borderRadius: 6
            }}
          >
            START FOR FREE →
          </Link>
        </div>
      </article>
    </div>
  );
}
