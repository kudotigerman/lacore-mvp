import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const STATUSES = new Set([
  "new",
  "contacted",
  "replied",
  "call_booked",
  "proposal_sent",
  "won",
  "lost"
]);

export async function PATCH(req: NextRequest) {
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
    lead_id?: string;
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
    status?: string;
    deal_value?: number | null;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const leadId = typeof body.lead_id === "string" ? body.lead_id.trim() : "";
  if (!leadId) {
    return NextResponse.json({ error: "lead_id is required." }, { status: 400 });
  }

  const updates: Record<string, string | number | null> = {};

  if ("name" in body) {
    if (typeof body.name !== "string") {
      return NextResponse.json({ error: "Invalid name." }, { status: 400 });
    }
    updates.name = body.name.trim() || null;
  }
  if ("email" in body) {
    if (typeof body.email !== "string") {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }
    const e = body.email.trim();
    if (!e) {
      return NextResponse.json({ error: "Email cannot be empty." }, { status: 400 });
    }
    updates.email = e;
  }
  if ("phone" in body) {
    if (typeof body.phone !== "string") {
      return NextResponse.json({ error: "Invalid phone." }, { status: 400 });
    }
    updates.phone = body.phone.trim() || null;
  }
  if ("message" in body) {
    if (typeof body.message !== "string") {
      return NextResponse.json({ error: "Invalid message." }, { status: 400 });
    }
    updates.message = body.message.trim() || null;
  }
  if ("status" in body) {
    if (typeof body.status !== "string") {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    const s = body.status.trim();
    if (!STATUSES.has(s)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    updates.status = s;
  }
  if ("deal_value" in body) {
    if (body.deal_value === null) {
      updates.deal_value = null;
    } else if (typeof body.deal_value === "number" && Number.isFinite(body.deal_value)) {
      if (body.deal_value < 0) {
        return NextResponse.json({ error: "deal_value cannot be negative." }, { status: 400 });
      }
      updates.deal_value = body.deal_value;
    } else {
      return NextResponse.json({ error: "Invalid deal_value." }, { status: 400 });
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("leads")
    .update(updates as never)
    .eq("id", leadId)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  return NextResponse.json({ lead: data });
}
