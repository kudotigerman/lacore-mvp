import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * OAuth PKCE return URL. Session cookies are attached to the redirect response.
 * Also ensures `profiles` row with starter credits (fallback if DB trigger did not run).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next") ?? "/dashboard/offer";
  const safeNext =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard/offer";
  const redirectTo = new URL(safeNext, url.origin);

  if (!code) {
    return NextResponse.redirect(new URL("/auth", url.origin));
  }

  const response = NextResponse.redirect(redirectTo);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookies().getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(exchangeError.message)}`, url.origin)
    );
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("user_id, credits_balance")
      .eq("user_id", user.id)
      .maybeSingle();

    const row = existing as { user_id: string; credits_balance: number | null } | null;

    const displayName =
      (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
      user.email?.split("@")[0] ||
      "User";

    if (!row) {
      const { error: insErr } = await supabase.from("profiles").insert({
        user_id: user.id,
        plan: "free",
        credits_balance: 20,
        subscription_status: "inactive",
        display_name: displayName
      } as never);
      if (insErr) {
        const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (serviceUrl && serviceKey) {
          const admin = createServiceClient(serviceUrl, serviceKey);
          await admin.from("profiles").upsert(
            {
              user_id: user.id,
              plan: "free",
              credits_balance: 20,
              subscription_status: "inactive",
              display_name: displayName,
              updated_at: new Date().toISOString()
            } as never,
            { onConflict: "user_id" }
          );
        }
      }
    } else if (row.credits_balance == null || row.credits_balance === 0) {
      await supabase.from("profiles").update({ credits_balance: 20, plan: "free" }).eq("user_id", user.id);
    }

    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceUrl && serviceKey) {
      const { createClient: createServiceClientDynamic } = await import("@supabase/supabase-js");
      const serviceClient = createServiceClientDynamic(serviceUrl, serviceKey);
      await serviceClient
        .from("profiles")
        .update({ credits_balance: 20, plan: "free" })
        .eq("user_id", user.id)
        .eq("credits_balance", 0);
    }
  }

  return response;
}
