import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";

/** Canonical site origin for sitemap URLs (must match Search Console property). */
const SITE = "https://lacore.ai";

/** Revalidate sitemap periodically so new blog posts appear without redeploy. */
export const revalidate = 3600;

/**
 * Next.js Metadata API: default export `sitemap()` → served at /sitemap.xml
 * with Content-Type application/xml (Next sets this automatically).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const posts = getAllPosts();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.4 }
  ];

  const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE}/blog/${post.slug}`,
    lastModified: post.date ? new Date(post.date) : now,
    changeFrequency: "monthly" as const,
    priority: 0.7
  }));

  return [...staticEntries, ...blogEntries];
}
