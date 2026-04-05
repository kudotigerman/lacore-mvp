import { getAllPosts } from "@/lib/blog";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const blogUrls = posts.map((post) => ({
    url: `https://lacore.ai/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7
  }));

  return [
    { url: "https://lacore.ai", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: "https://lacore.ai/blog", lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: "https://lacore.ai/privacy", lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: "https://lacore.ai/terms", lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    ...blogUrls
  ];
}
