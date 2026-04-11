import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

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
  if (request.nextUrl.pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  const host = normalizedHost(request);

  const isPrimaryAppHost =
    host === "lacore.ai" ||
    host === "localhost" ||
    host.startsWith("127.0.0.1") ||
    host.endsWith(".vercel.app");

  /**
   * Custom domain → rewrite to /p/[slug]. Skip /dashboard so the app route runs (layout enforces auth).
   */
  if (!isPrimaryAppHost && !request.nextUrl.pathname.startsWith("/dashboard")) {
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
    const slugRaw =
      list[0] && typeof list[0] === "object" ? (list[0] as { slug?: string }).slug : undefined;
    const slug = typeof slugRaw === "string" ? slugRaw.trim() : "";

    if (slug && !slug.includes("/") && !slug.includes("..")) {
      const nextUrl = request.nextUrl.clone();
      nextUrl.pathname = `/p/${slug}`;
      return NextResponse.rewrite(nextUrl);
    }

    return NextResponse.redirect(new URL("https://www.lacore.ai/", request.url), 307);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
