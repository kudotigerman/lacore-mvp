import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

async function fetchOfferHeadlineForSlug(slug: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  const supabase = createClient(url, serviceKey);
  const { data: landing, error: landingError } = await supabase
    .from("landing_pages")
    .select("user_id")
    .eq("slug", slug)
    .maybeSingle();

  if (landingError || !landing?.user_id) return null;

  const { data: offer } = await supabase
    .from("offers")
    .select("headline")
    .eq("user_id", landing.user_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const headline = typeof offer?.headline === "string" ? offer.headline.trim() : "";
  return headline.length > 0 ? headline : null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = params.slug;
  let title = slug;
  try {
    const headline = await fetchOfferHeadlineForSlug(slug);
    if (headline) title = headline;
  } catch {
    /* keep slug */
  }

  return {
    title,
    icons: {
      icon: "/icon",
      apple: "/apple-icon"
    }
  };
}

export default function PublicLandingSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
