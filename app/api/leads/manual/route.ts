import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { sendNewLeadTelegramNotification } from "@/lib/leadTelegram";

export async function POST(req: NextRequest) {
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

  let body: {
    project_id?: string;
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const projectId = typeof body.project_id === "string" ? body.project_id.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!projectId || !email) {
    return NextResponse.json({ error: "Project and email are required." }, { status: 400 });
  }

  const { data: proj, error: projErr } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (projErr || !proj) {
    return NextResponse.json({ error: "Invalid project." }, { status: 403 });
  }

  const { data: lead, error: insErr } = await supabase
    .from("leads")
    .insert({
      user_id: user.id,
      project_id: projectId,
      slug: "manual",
      name: name || null,
      email,
      phone: phone || null,
      message: message || null,
      status: "new"
    } as never)
    .select()
    .single();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  void sendNewLeadTelegramNotification({
    userId: user.id,
    name: name || null,
    email,
    phone: phone || null,
    message: message || null,
    slug: "manual"
  }).catch((err) => console.error("manual lead telegram notify:", err));

  return NextResponse.json({ lead });
}
