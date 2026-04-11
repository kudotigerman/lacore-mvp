import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * Public: which billing plan owns this landing (for free-only watermark).
 * Uses service role when configured; otherwise defaults to "free" (show watermark).
 */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ plan: "free" });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ plan: "free" });
  }

  const supabase = createClient(url, serviceKey);
  const { data: lp } = await supabase.from("landing_pages").select("user_id").eq("slug", slug).maybeSingle();
  const uid = lp && typeof (lp as { user_id?: string }).user_id === "string" ? (lp as { user_id: string }).user_id : null;
  if (!uid) {
    return NextResponse.json({ plan: "free" });
  }

  const { data: prof } = await supabase.from("profiles").select("plan").eq("user_id", uid).maybeSingle();
  const plan = typeof (prof as { plan?: string } | null)?.plan === "string" ? (prof as { plan: string }).plan : "free";

  return NextResponse.json({ plan: plan || "free" });
}
