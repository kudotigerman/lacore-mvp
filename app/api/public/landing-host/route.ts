import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/** Public: host display name for /review/[slug] headline. */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ display_name: null });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ display_name: null });
  }

  const supabase = createClient(url, serviceKey);
  const { data: lp } = await supabase.from("landing_pages").select("user_id").eq("slug", slug).maybeSingle();
  const uid =
    lp && typeof (lp as { user_id?: string }).user_id === "string" ? (lp as { user_id: string }).user_id : null;
  if (!uid) {
    return NextResponse.json({ display_name: null });
  }

  const { data: prof } = await supabase.from("profiles").select("display_name").eq("user_id", uid).maybeSingle();
  const raw = (prof as { display_name?: string | null } | null)?.display_name;
  const display_name = typeof raw === "string" && raw.trim() ? raw.trim() : null;

  return NextResponse.json({ display_name });
}
