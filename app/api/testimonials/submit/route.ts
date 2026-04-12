import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  let body: {
    slug?: string;
    client_name?: string;
    client_role?: string;
    rating?: number;
    content?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const clientName = typeof body.client_name === "string" ? body.client_name.trim() : "";
  const clientRole = typeof body.client_role === "string" ? body.client_role.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const rating = typeof body.rating === "number" && Number.isInteger(body.rating) ? body.rating : NaN;

  if (!slug || !clientName || !content) {
    return NextResponse.json({ error: "Missing slug, client_name, or content." }, { status: 400 });
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
  }
  if (content.length > 8000) {
    return NextResponse.json({ error: "Review is too long." }, { status: 400 });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: lp, error: lpErr } = await supabase
    .from("landing_pages")
    .select("user_id, project_id")
    .eq("slug", slug)
    .maybeSingle();

  if (lpErr || !lp) {
    return NextResponse.json({ error: "Landing page not found." }, { status: 404 });
  }

  const row = lp as { user_id: string; project_id: string | null };

  const { error: insErr } = await supabase.from("testimonials").insert({
    user_id: row.user_id,
    project_id: row.project_id,
    slug,
    client_name: clientName,
    client_role: clientRole || null,
    rating,
    content,
    approved: true
  } as never);

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
