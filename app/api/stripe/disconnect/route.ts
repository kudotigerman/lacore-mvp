import { NextRequest, NextResponse } from "next/server";
import { requireUser, serviceSupabase } from "../../domains/_auth";

export async function POST(req: NextRequest) {
  const token = await requireUser(req);
  if (!token.ok) return token.response;

  const service = serviceSupabase();
  if (!service) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const { error } = await service.from("stripe_settings").delete().eq("user_id", token.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
