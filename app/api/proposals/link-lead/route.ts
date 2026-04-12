import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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

  let body: { proposalId?: string; leadId?: string };
  try {
    body = (await req.json()) as { proposalId?: string; leadId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const proposalId = typeof body.proposalId === "string" ? body.proposalId.trim() : "";
  const leadId = typeof body.leadId === "string" ? body.leadId.trim() : "";
  if (!proposalId || !leadId) {
    return NextResponse.json({ error: "proposalId and leadId required." }, { status: 400 });
  }

  const { data: proposal, error: pErr } = await supabase
    .from("proposals")
    .select("id, user_id")
    .eq("id", proposalId)
    .maybeSingle();

  if (pErr || !proposal || (proposal as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }

  const { data: lead, error: lErr } = await supabase
    .from("leads")
    .select("id, user_id")
    .eq("id", leadId)
    .maybeSingle();

  if (lErr || !lead || (lead as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const { error: uErr } = await supabase
    .from("proposals")
    .update({ lead_id: leadId } as never)
    .eq("id", proposalId)
    .eq("user_id", user.id);

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  await supabase
    .from("leads")
    .update({ status: "proposal_sent" } as never)
    .eq("id", leadId)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
