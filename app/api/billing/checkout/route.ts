import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("paddle_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const row = profile as { paddle_customer_id?: string | null } | null;

  return NextResponse.json({
    customerId: row?.paddle_customer_id ?? undefined,
    customerEmail: user.email ?? undefined,
    userId: user.id
  });
}
