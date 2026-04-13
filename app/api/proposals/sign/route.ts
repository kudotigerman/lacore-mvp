import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendTelegramTextToUser } from "@/lib/leadTelegram";

function extractIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (!fwd) return null;
  const first = fwd.split(",")[0]?.trim() || "";
  return first || null;
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  let body: { proposal_id?: string; name?: string; agreed?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const proposalId = typeof body.proposal_id === "string" ? body.proposal_id.trim() : "";
  const signerName = typeof body.name === "string" ? body.name.trim() : "";
  if (!proposalId || !signerName) {
    return NextResponse.json({ error: "proposal_id and name are required." }, { status: 400 });
  }
  if (body.agreed !== true) {
    return NextResponse.json({ error: "Agreement is required." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: proposal, error: proposalErr } = await supabase
    .from("proposals")
    .select("id, user_id, is_public, signed_at")
    .eq("id", proposalId)
    .maybeSingle();

  if (proposalErr) {
    return NextResponse.json({ error: proposalErr.message }, { status: 500 });
  }
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }

  const row = proposal as {
    id: string;
    user_id: string;
    is_public?: boolean | null;
    signed_at?: string | null;
  };

  if (row.is_public === false) {
    return NextResponse.json({ error: "Proposal is not public." }, { status: 403 });
  }
  if (row.signed_at) {
    return NextResponse.json({ error: "Proposal already signed." }, { status: 409 });
  }

  const signedAt = new Date().toISOString();
  const ip = extractIp(req);
  const { error: updateErr } = await supabase
    .from("proposals")
    .update({
      signed_at: signedAt,
      signed_by_name: signerName,
      signed_ip: ip,
      status: "signed"
    } as never)
    .eq("id", proposalId)
    .is("signed_at", null);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  void sendTelegramTextToUser(row.user_id, `✍️ <b>${signerName}</b> signed your proposal!`).catch((err) =>
    console.error("proposal sign telegram notify:", err)
  );

  return NextResponse.json({ success: true, signed_at: signedAt });
}
