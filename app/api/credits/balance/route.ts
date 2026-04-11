import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("credits_balance, plan")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = data as { credits_balance?: number | null; plan?: string | null } | null;

  return NextResponse.json({
    credits_balance: typeof row?.credits_balance === "number" ? row.credits_balance : 20,
    plan: typeof row?.plan === "string" && row.plan.length > 0 ? row.plan : "free"
  });
}
