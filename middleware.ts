import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Host only, lowercased, no leading www. (matches rows stored as e.g. geth.meme) */
function normalizedHost(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-host");
  let raw: string;
  if (forwarded) {
    raw = forwarded.split(",")[0]?.trim().split(":")[0] ?? "";
  } else {
    raw = (request.headers.get("host") || "").split(":")[0];
  }
  return raw.toLowerCase().replace(/^www\./, "");
}

export async function middleware(request: NextRequest) {
  /** OAuth callback + auth pages: never run session checks or custom-domain rewrite. */
  if (request.nextUrl.pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  /** Require auth for all /dashboard routes (Supabase SSR cookie refresh on response). */
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
            });
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => {
              supabaseResponse.cookies.set(name, value, options);
            });
          }
        }
      }
    );

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  /** Custom domain → rewrite to /p/[slug] (non-primary hosts only). */
  const host = normalizedHost(request);

  const isPrimaryAppHost =
    host === "lacore.ai" ||
    host === "localhost" ||
    host.startsWith("127.0.0.1") ||
    host.endsWith(".vercel.app");

  if (isPrimaryAppHost) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.redirect(new URL("https://www.lacore.ai/", request.url), 307);
  }

  const domainFilter = encodeURIComponent(host);
  const lookupUrl = `${supabaseUrl}/rest/v1/custom_domains?domain=eq.${domainFilter}&verified=eq.true&select=slug`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let res: Response;
  try {
    res = await fetch(lookupUrl, {
      method: "GET",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Accept: "application/json"
      },
      signal: controller.signal,
      cache: "no-store"
    });
  } catch (e) {
    console.error("[middleware] custom domain lookup failed:", e);
    return NextResponse.redirect(new URL("https://www.lacore.ai/", request.url), 307);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    console.error("[middleware] custom_domains HTTP", res.status);
    return NextResponse.redirect(new URL("https://www.lacore.ai/", request.url), 307);
  }

  let rows: unknown;
  try {
    const text = await res.text();
    if (!text.trim()) {
      return NextResponse.redirect(new URL("https://www.lacore.ai/", request.url), 307);
    }
    rows = JSON.parse(text) as unknown;
  } catch {
    return NextResponse.redirect(new URL("https://www.lacore.ai/", request.url), 307);
  }

  const list = Array.isArray(rows) ? rows : [];
  const slugRaw = list[0] && typeof list[0] === "object" ? (list[0] as { slug?: string }).slug : undefined;
  const slug = typeof slugRaw === "string" ? slugRaw.trim() : "";

  if (slug && !slug.includes("/") && !slug.includes("..")) {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = `/p/${slug}`;
    return NextResponse.rewrite(nextUrl);
  }

  return NextResponse.redirect(new URL("https://www.lacore.ai/", request.url), 307);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    // Custom domains + public app routes; exclude /auth so /auth/callback is not handled here
    "/((?!api|_next/static|_next/image|_next/data|favicon.ico|sitemap.xml|robots.txt|auth).*)"
  ]
};
