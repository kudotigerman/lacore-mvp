import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendWonDealTelegramNotification } from "@/lib/leadTelegram";

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

  let body: { leadId?: string; status?: string };
  try {
    body = (await req.json()) as { leadId?: string; status?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const leadId = typeof body.leadId === "string" ? body.leadId.trim() : "";
  const status = typeof body.status === "string" ? body.status.trim() : "";
  if (!leadId || !STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid leadId or status." }, { status: 400 });
  }

  const { data: existingLead, error: existingLeadError } = await supabase
    .from("leads")
    .select("id, status")
    .eq("id", leadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingLeadError) return NextResponse.json({ error: existingLeadError.message }, { status: 500 });
  if (!existingLead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  const { data, error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", leadId)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  if (existingLead.status !== "won" && status === "won") {
    void sendWonDealTelegramNotification({
      userId: user.id,
      name: typeof data.name === "string" ? data.name : null,
      dealValue: typeof data.deal_value === "number" ? data.deal_value : null
    }).catch((err) => console.error("won deal telegram notify:", err));
  }

  return NextResponse.json({ lead: data });
}
