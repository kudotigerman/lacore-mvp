import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

export function LacoreLegalLayout({
  children,
  isLoggedIn = false
}: {
  children: ReactNode;
  isLoggedIn?: boolean;
}) {
  return (
    <div
      className="min-h-screen bg-[#07080F] text-white antialiased"
      style={{ fontFamily: "var(--font-geist-sans), Inter, system-ui, sans-serif" }}
    >
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#07080F]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo size="md" variant="dark" href="/" />
          <div className="hidden items-center gap-6 md:flex">
            <Link
              href="/#how-it-works"
              className="text-sm text-white/55 no-underline transition hover:text-white/90"
            >
              How it works
            </Link>
            <Link href="/#pricing" className="text-sm text-white/55 no-underline transition hover:text-white/90">
              Pricing
            </Link>
            <Link href="/blog" className="text-sm text-white/55 no-underline transition hover:text-white/90">
              Blog
            </Link>
          </div>
          {isLoggedIn ? (
            <Link
              href="/dashboard/offer"
              className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white no-underline transition hover:bg-indigo-500"
            >
              Go to dashboard →
            </Link>
          ) : (
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/auth"
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/70 no-underline transition-colors hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/auth"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white no-underline transition-colors hover:bg-indigo-500"
              >
                Start free →
              </Link>
            </div>
          )}
        </div>
      </nav>

      {children}

      <footer className="relative z-[1] border-t border-white/5 px-6 py-8 text-xs text-white/25 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Logo size="md" variant="dark" href="/" />
            <p className="mt-3 max-w-xs text-white/25">Your business. Our sales machine.</p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end sm:text-right">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <Link href="/privacy" className="text-white/25 no-underline transition hover:text-white/50">
                Privacy
              </Link>
              <span aria-hidden className="text-white/15">
                ·
              </span>
              <Link href="/terms" className="text-white/25 no-underline transition hover:text-white/50">
                Terms
              </Link>
              <span aria-hidden className="text-white/15">
                ·
              </span>
              <Link href="/cookies" className="text-white/25 no-underline transition hover:text-white/50">
                Cookies
              </Link>
            </div>
            <p>© 2026 LACORE. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
