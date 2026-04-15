import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { STYLE_THEMES, type LandingStyle } from "@/types/landing";

type Body = { style?: string };

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    data: { user },
    error: userErr
  } = await supabase.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const landingId = params.id?.trim();
  if (!landingId) {
    return NextResponse.json({ error: "Missing landing id." }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const nextStyle = typeof body.style === "string" ? body.style.trim() : "";
  if (!nextStyle || !(nextStyle in STYLE_THEMES)) {
    return NextResponse.json({ error: "Invalid style." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("landing_pages")
    .update({ style: nextStyle } as never)
    .eq("id", landingId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ style: nextStyle as LandingStyle });
}
