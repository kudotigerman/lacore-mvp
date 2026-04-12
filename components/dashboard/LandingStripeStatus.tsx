"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type StatusPayload = { connected: boolean; button_text?: string };

export function LandingStripeStatus() {
  const router = useRouter();
  const [status, setStatus] = useState<StatusPayload | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setStatus({ connected: false });
      return;
    }
    const res = await fetch("/api/stripe/status", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    });
    if (!res.ok) {
      setStatus({ connected: false });
      return;
    }
    const data = (await res.json()) as StatusPayload;
    setStatus(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const goSettings = () => router.push("/dashboard/settings#stripe");

  if (status === null) {
    return (
      <div className="w-full rounded-lg border border-white/10 py-2 text-center text-xs text-white/35">Stripe…</div>
    );
  }

  if (status.connected) {
    return (
      <div className="flex w-full items-center justify-between gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M2.5 6l2 2 5-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="truncate text-xs font-medium text-white/90">Stripe connected</span>
        </div>
        <Link
          href="/dashboard/settings#stripe"
          className="shrink-0 text-[11px] font-medium text-indigo-400/90 transition-colors hover:text-indigo-300"
        >
          Manage →
        </Link>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="w-full rounded-lg border border-white/15 py-2 text-xs text-white/50 transition-colors hover:border-indigo-500/40 hover:text-white/70"
      onClick={goSettings}
    >
      + Connect Stripe
    </button>
  );
}
