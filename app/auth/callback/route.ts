import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          }
        }
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    const user = data.session?.user;

    if (!error && user) {
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
              (typeof meta?.name === "string" && meta.name.trim()) ||
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
          console.error("profile creation error:", e);
        }
      }
    }
  }

  const reqUrl = new URL(request.url);
  const base = process.env.NODE_ENV === "development" ? reqUrl.origin : "https://www.lacore.ai";
  return NextResponse.redirect(new URL("/dashboard/offer", base));
}
