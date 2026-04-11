import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROD_APP_ORIGIN = "https://www.lacore.ai";

/**
 * OAuth PKCE: single redirect response; session cookies are set on that same response via setAll.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    const redirectBase =
      process.env.NODE_ENV === "development" ? url.origin : PROD_APP_ORIGIN;

    if (!code) {
      const offerResponse = NextResponse.redirect(new URL("/dashboard/offer", redirectBase));
      const cookieStore = cookies();
      const supabaseNoCode = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) =>
                offerResponse.cookies.set(name, value, options)
              );
            }
          }
        }
      );
      const {
        data: { user }
      } = await supabaseNoCode.auth.getUser();
      if (user) {
        return offerResponse;
      }
      return NextResponse.redirect(new URL("/auth", redirectBase));
    }

    const response = NextResponse.redirect(new URL("/dashboard/offer", redirectBase));

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
              response.cookies.set(name, value, options)
            );
          }
        }
      }
    );

    const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !exchangeData?.session?.user) {
      throw exchangeError ?? new Error("exchangeCodeForSession failed");
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
  } catch (err) {
    console.error("callback error:", err);
    return NextResponse.redirect(new URL("/dashboard/offer", PROD_APP_ORIGIN));
  }
}
