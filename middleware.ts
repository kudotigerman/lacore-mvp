import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const LACORE_HOSTS = new Set(["lacore.ai", "www.lacore.ai", "localhost"]);

function isLacoreHost(hostname: string): boolean {
  if (LACORE_HOSTS.has(hostname)) return true;
  if (hostname.endsWith(".vercel.app")) return true;
  if (hostname.endsWith(".localhost")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  const pathname = request.nextUrl.pathname;

  if (!isLacoreHost(hostname)) {
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api/") ||
      /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf)$/.test(pathname)
    ) {
      return NextResponse.next();
    }

    if (pathname === "/" || pathname === "") {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        try {
          const apiRes = await fetch(
            `${supabaseUrl}/rest/v1/custom_domains?domain=eq.${encodeURIComponent(hostname)}&verified=eq.true&select=slug&limit=1`,
            {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
            }
          );
          if (apiRes.ok) {
            const rows = (await apiRes.json()) as Array<{ slug: string }>;
            const slug = rows[0]?.slug;
            if (slug) {
              const url = request.nextUrl.clone();
              url.pathname = `/p/${slug}`;
              return NextResponse.rewrite(url);
            }
          }
        } catch {
          // DB lookup failed — fall through to normal routing
        }
      }
    }

    return NextResponse.next();
  }

  // LACORE domain — existing Supabase auth session handling
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
        },
      },
    }
  );
  await supabase.auth.getUser();
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
