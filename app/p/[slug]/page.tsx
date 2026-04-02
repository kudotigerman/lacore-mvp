import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type PageProps = {
  params: {
    slug: string;
  };
};

export default async function PublicLandingPage({ params }: PageProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) notFound();

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data } = await supabase
    .from("landing_pages")
    .select("html_content")
    .eq("slug", params.slug)
    .single();

  if (!data?.html_content) notFound();

  return (
    <main style={{ minHeight: "100vh", margin: 0, padding: 0 }}>
      <iframe
        srcDoc={data.html_content}
        title="Landing page preview"
        style={{
          width: "100%",
          height: "100vh",
          border: "none",
          display: "block"
        }}
      />
      <Link
        href="https://www.lacore.ai"
        target="_blank"
        style={{
          position: "fixed",
          right: 12,
          bottom: 12,
          background: "rgba(0,0,0,0.8)",
          border: "1px solid #06B6D4",
          borderRadius: 4,
          padding: "6px 12px",
          fontFamily: "var(--font-space-mono), monospace",
          fontSize: 9,
          color: "#06B6D4",
          textDecoration: "none",
          zIndex: 20
        }}
      >
        ⚡ Built with LACORE
      </Link>
    </main>
  );
}
