import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runLeadNotifications } from "@/lib/notifyLeadOwner";

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const body = (await request.json()) as {
      leadId?: string;
      userId?: string;
      name?: string;
      email?: string;
      message?: string;
      slug?: string;
    };

    const leadId = typeof body.leadId === "string" ? body.leadId.trim() : "";
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";

    if (!leadId || !userId || !email || !slug) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("id, user_id, email, slug")
      .eq("id", leadId)
      .maybeSingle();

    if (leadErr || !lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const row = lead as { id: string; user_id: string; email: string; slug: string };
    if (row.user_id !== userId || row.email !== email || row.slug !== slug) {
      return NextResponse.json({ error: "Invalid lead data." }, { status: 403 });
    }

    const { emailSent, telegramSent } = await runLeadNotifications({
      userId,
      name,
      email,
      message,
      slug
    });

    return NextResponse.json({ success: true, emailSent, telegramSent });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}
