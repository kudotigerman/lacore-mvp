import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function requestHostname(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-host");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim().split(":")[0]?.toLowerCase();
    if (first) return first;
  }
  return (request.headers.get("host") || "").split(":")[0].toLowerCase();
}

export async function middleware(request: NextRequest) {
  const hostname = requestHostname(request);

  const isLacore =
    hostname === "lacore.ai" ||
    hostname === "www.lacore.ai" ||
    hostname.includes("localhost") ||
    hostname.endsWith(".vercel.app");

  console.log("middleware host:", hostname);
  console.log("isLacore:", isLacore);

  if (!isLacore) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !supabaseKey) {
        return NextResponse.next();
      }

      const domainFilter = encodeURIComponent(hostname);
      const lookupUrl = `${supabaseUrl}/rest/v1/custom_domains?domain=eq.${domainFilter}&select=slug,verified`;

      const controller = new AbortController();
      const timeoutMs = 8000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      let res: Response;
      try {
        res = await fetch(lookupUrl, {
          method: "GET",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Accept: "application/json"
          },
          signal: controller.signal,
          cache: "no-store"
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!res.ok) {
        return NextResponse.next();
      }

      let data: unknown;
      try {
        const text = await res.text();
        if (!text.trim()) {
          return NextResponse.next();
        }
        data = JSON.parse(text) as unknown;
      } catch {
        return NextResponse.next();
      }

      const rows = Array.isArray(data) ? data : [];
      const row = rows[0] as { slug?: string; verified?: boolean } | undefined;

      if (row?.verified && typeof row.slug === "string") {
        const slug = row.slug.trim();
        if (slug && !slug.includes("/") && !slug.includes("..")) {
          const nextUrl = request.nextUrl.clone();
          nextUrl.pathname = `/p/${slug}`;
          return NextResponse.rewrite(nextUrl);
        }
      }
    } catch (e) {
      console.error("[middleware] custom domain routing failed:", e);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|_next/data|favicon.ico).*)"]
};
