"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { dashToast } from "@/lib/dash-toast";

type Row = {
  id: string;
  client_name: string;
  client_role: string | null;
  rating: number;
  content: string;
  approved: boolean;
  created_at: string;
};

const siteBase = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.lacore.ai").replace(/\/$/, "");

export function LandingTestimonialsPanel({ slug }: { slug: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const reviewUrl = `${siteBase}/review/${slug}`;

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("testimonials")
      .select("id, client_name, client_role, rating, content, approved, created_at")
      .eq("slug", slug)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      dashToast(error.message);
      setRows([]);
    } else {
      setRows((data as Row[]) ?? []);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(reviewUrl);
      setCopied(true);
      dashToast("Review link copied!");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      dashToast("Could not copy.");
    }
  };

  const toggleApproved = async (row: Row) => {
    const supabase = getSupabaseClient();
    const next = !row.approved;
    const { error } = await supabase.from("testimonials").update({ approved: next }).eq("id", row.id);
    if (error) {
      dashToast(error.message);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, approved: next } : r)));
  };

  return (
    <div className="space-y-3 border-t border-white/[0.06] pt-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Testimonials</p>
      <button
        type="button"
        onClick={() => void copyLink()}
        className="w-full rounded-lg border border-amber-500/25 bg-amber-500/10 py-2 text-xs font-medium text-amber-200/90 transition-colors hover:border-amber-400/40 hover:bg-amber-500/15"
      >
        {copied ? "Copied!" : "Get testimonials — copy review link"}
      </button>
      <p className="break-all font-mono text-[10px] text-white/25">{reviewUrl}</p>

      {loading ? (
        <p className="text-xs text-white/35">Loading reviews…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-white/35">No reviews yet. Share the link with happy clients.</p>
      ) : (
        <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {rows.map((t) => (
            <li
              key={t.id}
              className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2.5 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white/85">
                    {t.client_name}
                    {t.client_role ? <span className="font-normal text-white/40"> · {t.client_role}</span> : null}
                  </p>
                  <p className="mt-0.5 text-[10px] text-amber-400/80">{"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/50">{t.content}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleApproved(t)}
                  className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors ${
                    t.approved
                      ? "border-emerald-500/30 text-emerald-400/90 hover:border-emerald-400/50"
                      : "border-white/15 text-white/45 hover:border-white/25"
                  }`}
                >
                  {t.approved ? "Shown" : "Hidden"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
