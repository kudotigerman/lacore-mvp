import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "no slug" });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from("landing_pages")
    .select("jsx_content")
    .eq("slug", slug)
    .single();

  const jsx = data?.jsx_content ?? "";

  return NextResponse.json({
    length: jsx.length,
    first300: jsx.slice(0, 300),
    last300: jsx.slice(-300),
    hasImportReact: jsx.includes("import React"),
    hasLandingPage: jsx.includes("LandingPage"),
    hasExportDefault: jsx.includes("export default")
  });
}
