import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED = new Set(["draft", "sent", "signed", "paid"]);

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

  let body: { proposal_id?: string; status?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const proposalId = typeof body.proposal_id === "string" ? body.proposal_id.trim() : "";
  const status = typeof body.status === "string" ? body.status.trim().toLowerCase() : "";
  if (!proposalId || !ALLOWED.has(status)) {
    return NextResponse.json({ error: "proposal_id and valid status are required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("proposals")
    .update({ status } as never)
    .eq("id", proposalId)
    .eq("user_id", user.id)
    .select("id, client_name, client_problem, created_at, status, signed_at, signed_by_name")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Proposal not found." }, { status: 404 });

  return NextResponse.json({ proposal: data });
}
