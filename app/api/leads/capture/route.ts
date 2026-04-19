import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendNewLeadTelegramNotification } from "@/lib/leadTelegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const body = (await request.json()) as {
      slug?: string;
      name?: string;
      email?: string;
      message?: string;
    };

    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!slug || !email) {
      return NextResponse.json({ error: "Slug and email are required." }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Find the landing page owner and project by slug
    const { data: landing, error: landingErr } = await supabase
      .from("landing_pages")
      .select("user_id, project_id")
      .eq("slug", slug)
      .maybeSingle();

    if (landingErr || !landing) {
      return NextResponse.json({ error: "Landing page not found." }, { status: 404 });
    }

    const row = landing as { user_id: string; project_id: string | null };

    // Insert the lead
    const { data: lead, error: insertErr } = await supabase
      .from("leads")
      .insert({
        user_id: row.user_id,
        project_id: row.project_id ?? null,
        slug,
        name: name || null,
        email,
        message: message || null,
        status: "new"
      } as never)
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Fire Telegram notification (non-blocking)
    void sendNewLeadTelegramNotification({
      userId: row.user_id,
      name: name || null,
      email,
      phone: null,
      message: message || null,
      slug
    }).catch((err) => console.error("capture lead telegram:", err));

    return NextResponse.json({ success: true, leadId: (lead as { id: string }).id });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
