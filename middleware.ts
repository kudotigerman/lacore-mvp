import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const hostname = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  const isLacore =
    hostname === "lacore.ai" ||
    hostname === "www.lacore.ai" ||
    hostname.includes("localhost") ||
    hostname.endsWith(".vercel.app");

  if (!isLacore) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.next();
    }

    const domainFilter = encodeURIComponent(hostname);
    const res = await fetch(
      `${supabaseUrl}/rest/v1/custom_domains?domain=eq.${domainFilter}&select=slug,verified`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        },
        next: { revalidate: 0 }
      }
    );

    if (!res.ok) {
      return NextResponse.next();
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return NextResponse.next();
    }

    const rows = Array.isArray(data) ? data : [];
    const row = rows[0] as { slug?: string; verified?: boolean } | undefined;
    if (row?.verified && row.slug) {
      const url = request.nextUrl.clone();
      url.pathname = `/p/${row.slug}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
