import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  const redirectTo =
    process.env.NODE_ENV === "development"
      ? `${url.origin}/dashboard/offer`
      : "https://www.lacore.ai/dashboard/offer";

  if (!code) {
    return NextResponse.redirect(redirectTo);
  }

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        }
      }
    }
  );

  const { data } = await supabase.auth.exchangeCodeForSession(code);
  const user = data.session?.user;

  if (user) {
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceUrl && serviceKey) {
      try {
        const service = createServiceClient(serviceUrl, serviceKey);
        const { data: existing } = await service
          .from("profiles")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!existing) {
          const meta = user.user_metadata as Record<string, unknown> | undefined;
          const displayName =
            (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
            user.email?.split("@")[0] ||
            "User";
          await service.from("profiles").insert({
            user_id: user.id,
            plan: "free",
            credits_balance: 20,
            subscription_status: "inactive",
            display_name: displayName,
            email_notifications: true
          } as never);
        }
      } catch (e) {
        console.error("profile error:", e);
      }
    }
  }

  return NextResponse.redirect(redirectTo);
}
