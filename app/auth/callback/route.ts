import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function safeNextPath(next: string | null): string {
  const raw = next ?? "/dashboard/offer";
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard/offer";
}

/** After OAuth, send users to canonical www host in production; keep request origin in dev. */
function postAuthRedirectUrl(request: Request, path: string): string {
  const url = new URL(request.url);
  const safe = path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard/offer";
  if (process.env.NODE_ENV === "development") {
    return `${url.origin}${safe}`;
  }
  return `https://www.lacore.ai${safe}`;
}

/**
 * OAuth PKCE: attach session cookies to redirect response, then ensure profile + credits via service role.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams } = url;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard/offer";
  const safeNext = safeNextPath(next);

  if (!code) {
    return NextResponse.redirect(new URL("/auth", url.origin));
  }

  const redirectLocation = postAuthRedirectUrl(request, safeNext);
  const response = NextResponse.redirect(redirectLocation);

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

  const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !exchangeData?.session?.user) {
    return NextResponse.redirect(
      new URL(
        `/auth?error=${encodeURIComponent(exchangeError?.message ?? "callback_failed")}`,
        url.origin
      )
    );
  }

  const sessionUser = exchangeData.session.user;
  const userId = sessionUser.id;

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (serviceUrl && serviceKey) {
    const serviceClient = createServiceClient(serviceUrl, serviceKey);

    const { data: existingProfile, error: selectErr } = await serviceClient
      .from("profiles")
      .select("user_id, credits_balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (selectErr) {
      console.error("callback: profile select error", selectErr.message);
    }

    const row = existingProfile as { user_id: string; credits_balance: number | null } | null;

    const meta = sessionUser.user_metadata as Record<string, unknown> | undefined;
    const displayName =
      (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
      (typeof meta?.name === "string" && meta.name.trim()) ||
      sessionUser.email?.split("@")[0] ||
      "User";

    if (!row) {
      const { error: insertErr } = await serviceClient.from("profiles").insert({
        user_id: userId,
        plan: "free",
        credits_balance: 20,
        subscription_status: "inactive",
        display_name: displayName,
        email_notifications: true
      } as never);
      if (insertErr) {
        console.error("callback: profile insert error", insertErr.message);
      } else {
        console.log("callback: created new profile for", userId, "with 20 credits");
      }
    } else if (row.credits_balance == null || row.credits_balance === 0) {
      const { error: updErr } = await serviceClient
        .from("profiles")
        .update({ credits_balance: 20, plan: "free" })
        .eq("user_id", userId);
      if (updErr) {
        console.error("callback: profile credits update error", updErr.message);
      } else {
        console.log("callback: fixed credits for", userId);
      }
    }
  } else {
    console.error("auth/callback: SUPABASE_SERVICE_ROLE_KEY missing — profile not ensured server-side");
  }

  return response;
}
