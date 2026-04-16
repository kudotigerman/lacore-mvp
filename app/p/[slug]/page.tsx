import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ClientLandingWrapper from "./ClientLandingWrapper";
import { STYLE_THEMES, type LandingContent } from "@/types/landing";

type LandingRow = {
  html_content: string | null;
  jsx_content: string | null;
  json_content: unknown;
  style: string | null;
};

async function fetchPublicLandingRow(slug: string): Promise<LandingRow | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const supabase = createClient(url, key);
  const { data } = await supabase
    .from("landing_pages")
    .select("html_content, jsx_content, json_content, style")
    .eq("slug", slug)
    .maybeSingle();
  return (data as LandingRow | null) ?? null;
}

function landingOgUrl(slug: string): string {
  return `https://lacore.ai/p/${slug}`;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const row = await fetchPublicLandingRow(params.slug);
  if (!row) {
    return { title: "Landing page not found" };
  }

  const content = row.json_content as Partial<LandingContent> | null;
  if (!content || typeof content !== "object") {
    return { title: "Landing page" };
  }

  const title =
    `${typeof content.headline === "string" ? content.headline : ""} ${typeof content.headlineAccent === "string" ? content.headlineAccent : ""}`.trim() ||
    (typeof content.brand === "string" ? content.brand : "Landing");
  const description =
    (typeof content.subheadline === "string" && content.subheadline) ||
    (typeof content.socialProof === "string" && content.socialProof) ||
    "";
  const siteName = typeof content.brand === "string" ? content.brand : "LACORE";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: landingOgUrl(params.slug),
      siteName,
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    }
  };
}

type PageProps = {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function PublicLandingPage({ params, searchParams }: PageProps) {
  const slug = params.slug;
  const row = await fetchPublicLandingRow(slug);
  if (!row) {
    notFound();
  }

  const styleParamRaw = searchParams?.style;
  const styleParam =
    typeof styleParamRaw === "string"
      ? styleParamRaw
      : Array.isArray(styleParamRaw)
        ? styleParamRaw[0]
        : undefined;
  const hasRequestedStyle = typeof styleParam === "string" && styleParam in STYLE_THEMES;
  const dbStyle = row.style ?? "dark-indigo";
  const initialLandingStyle = hasRequestedStyle ? styleParam : dbStyle;

  const rawJson = row.json_content;
  const initialJsonContent =
    rawJson && typeof rawJson === "object" && !Array.isArray(rawJson) ? (rawJson as LandingContent) : null;

  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "var(--bg-primary)",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
          }}
        >
          Loading page...
        </div>
      }
    >
      <ClientLandingWrapper
        key={slug}
        slug={slug}
        initialHtml={row.html_content ?? ""}
        initialJsx={row.jsx_content ?? ""}
        initialJsonContent={initialJsonContent}
        initialLandingStyle={initialLandingStyle}
      />
    </Suspense>
  );
}
