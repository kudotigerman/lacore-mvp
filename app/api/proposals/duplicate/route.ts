import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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

  let body: { proposal_id?: string };
  try {
    body = (await req.json()) as { proposal_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const proposalId = typeof body.proposal_id === "string" ? body.proposal_id.trim() : "";
  if (!proposalId) return NextResponse.json({ error: "proposal_id is required." }, { status: 400 });

  const { data: source, error: srcErr } = await supabase
    .from("proposals")
    .select("user_id, project_id, client_name, client_problem, content")
    .eq("id", proposalId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (srcErr) return NextResponse.json({ error: srcErr.message }, { status: 500 });
  if (!source) return NextResponse.json({ error: "Proposal not found." }, { status: 404 });

  const row = source as {
    user_id: string;
    project_id: string | null;
    client_name: string;
    client_problem: string;
    content: unknown;
  };

  const { data: created, error: insErr } = await supabase
    .from("proposals")
    .insert({
      user_id: user.id,
      project_id: row.project_id,
      client_name: `Copy of ${row.client_name}`,
      client_problem: row.client_problem,
      content: row.content
    } as never)
    .select("id, client_name, client_problem, created_at")
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ proposal: created });
}
