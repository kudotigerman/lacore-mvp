"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

const CNAME_DEFAULT = "cname.vercel-dns.com";
const A_DEFAULT = "76.76.21.21";
const POLL_MS = 15_000;
const POLL_MAX_MS = 5 * 60 * 1000;

type ConnectedRow = { domain: string; verified: boolean };

async function authJsonHeaders(): Promise<HeadersInit> {
  const supabase = getSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.access_token) h.Authorization = `Bearer ${session.access_token}`;
  return h;
}

type Props = {
  userId: string | null;
  activeProjectId: string | undefined;
  defaultSlug: string | null;
};

export function ConnectDomainSettings({ userId, activeProjectId, defaultSlug }: Props) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [connected, setConnected] = useState<ConnectedRow | null>(null);
  const [cnameTarget, setCnameTarget] = useState(CNAME_DEFAULT);
  const [aRecord, setARecord] = useState(A_DEFAULT);
  const [loadingSlugs, setLoadingSlugs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollNote, setPollNote] = useState<string | null>(null);

  const loadSlugs = useCallback(async () => {
    if (!userId || !activeProjectId) {
      setSlugs([]);
      setLoadingSlugs(false);
      return;
    }
    setLoadingSlugs(true);
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from("landing_pages")
      .select("slug")
      .eq("user_id", userId)
      .eq("project_id", activeProjectId)
      .order("created_at", { ascending: false });
    const list = (data ?? [])
      .map((r: { slug?: string }) => (typeof r.slug === "string" ? r.slug : ""))
      .filter(Boolean);
    setSlugs(list);
    setSelectedSlug((prev) => {
      if (prev && list.includes(prev)) return prev;
      if (defaultSlug && list.includes(defaultSlug)) return defaultSlug;
      return list[0] ?? "";
    });
    setLoadingSlugs(false);
  }, [userId, activeProjectId, defaultSlug]);

  const loadConnectedForSlug = useCallback(async () => {
    if (!userId || !selectedSlug) {
      setConnected(null);
      return;
    }
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from("custom_domains")
      .select("domain, verified")
      .eq("user_id", userId)
      .eq("slug", selectedSlug)
      .maybeSingle();
    const row = data as ConnectedRow | null;
    setConnected(row && row.domain ? { domain: row.domain, verified: Boolean(row.verified) } : null);
    setError(null);
    setPollNote(null);
  }, [userId, selectedSlug]);

  useEffect(() => {
    void loadSlugs();
  }, [loadSlugs]);

  useEffect(() => {
    void loadConnectedForSlug();
  }, [loadConnectedForSlug]);

  const verifyDomain = useCallback(async (domain: string, quiet: boolean): Promise<boolean> => {
    if (!quiet) setError(null);
    try {
      const res = await fetch("/api/domains/verify", {
        method: "POST",
        headers: await authJsonHeaders(),
        body: JSON.stringify({ domain })
      });
      const data = (await res.json()) as { verified?: boolean; error?: string };
      if (!res.ok) {
        if (!quiet) setError(data.error ?? "Could not verify domain.");
        return false;
      }
      if (data.verified) {
        setConnected((c) => (c && c.domain === domain ? { ...c, verified: true } : c));
        setPollNote(null);
        return true;
      }
      return false;
    } catch {
      if (!quiet) setError("Network error while verifying.");
      return false;
    }
  }, []);

  useEffect(() => {
    if (!connected?.domain || connected.verified) return;
    const domain = connected.domain;

    let cancelled = false;
    const started = Date.now();
    let id: number | undefined;

    const tick = async () => {
      if (cancelled) return;
      if (Date.now() - started > POLL_MAX_MS) {
        setPollNote("Auto-check stopped after 5 minutes. Use Check status if DNS is still propagating.");
        if (id !== undefined) window.clearInterval(id);
        return;
      }
      const ok = await verifyDomain(domain, true);
      if (ok && id !== undefined) window.clearInterval(id);
    };

    id = window.setInterval(() => void tick(), POLL_MS);
    void tick();
    return () => {
      cancelled = true;
      if (id !== undefined) window.clearInterval(id);
    };
  }, [connected?.domain, connected?.verified, verifyDomain]);

  async function handleAdd() {
    if (!selectedSlug || !domainInput.trim()) {
      setError("Enter a domain and select a landing page.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setPollNote(null);
    try {
      const res = await fetch("/api/domains/add", {
        method: "POST",
        headers: await authJsonHeaders(),
        body: JSON.stringify({ domain: domainInput.trim(), slug: selectedSlug })
      });
      const data = (await res.json()) as {
        error?: string;
        success?: boolean;
        cname_target?: string;
        a_record?: string;
        verified?: boolean;
      };
      if (!res.ok || data.error) {
        setError(data.error ?? "Could not connect domain.");
        return;
      }
      setCnameTarget(typeof data.cname_target === "string" ? data.cname_target : CNAME_DEFAULT);
      setARecord(typeof data.a_record === "string" ? data.a_record : A_DEFAULT);
      const clean = domainInput
        .toLowerCase()
        .trim()
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, "")
        .split("/")[0]
        .replace(/^www\./, "");
      setConnected({ domain: clean, verified: Boolean(data.verified) });
      setDomainInput("");
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckStatus() {
    if (!connected?.domain) return;
    setChecking(true);
    setError(null);
    try {
      const ok = await verifyDomain(connected.domain, false);
      if (!ok) setError("Not verified yet. Confirm DNS records and wait for propagation.");
    } finally {
      setChecking(false);
    }
  }

  async function handleRemove() {
    if (!connected?.domain) return;
    setRemoving(true);
    setError(null);
    try {
      await fetch("/api/domains/remove", {
        method: "POST",
        headers: await authJsonHeaders(),
        body: JSON.stringify({ domain: connected.domain })
      });
      setConnected(null);
      setPollNote(null);
      await loadConnectedForSlug();
    } finally {
      setRemoving(false);
    }
  }

  if (!userId) {
    return <p className="text-sm text-white/40">Sign in to connect a custom domain.</p>;
  }

  if (!activeProjectId) {
    return <p className="text-sm text-white/40">Select a project to connect a domain.</p>;
  }

  if (loadingSlugs) {
    return <p className="text-sm text-white/40">Loading landing pages…</p>;
  }

  if (slugs.length === 0) {
    return (
      <p className="text-sm text-white/45">
        Create a landing page first, then you can point your own domain at it.
      </p>
    );
  }

  const inputClass =
    "dash-focusable w-full rounded-xl border border-white/10 bg-[#0a0a12] px-4 py-3 text-sm text-white placeholder:text-white/25 transition-colors focus:border-indigo-500/50 focus:outline-none";

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">Landing page</span>
        <select
          value={selectedSlug}
          onChange={(e) => setSelectedSlug(e.target.value)}
          className={inputClass}
        >
          {slugs.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      {connected?.verified ? (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/90">
                ✓ Domain connected
              </p>
              <p className="mt-1 text-sm font-medium text-white">{connected.domain}</p>
              <a
                href={`https://${connected.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-indigo-400 hover:text-indigo-300"
              >
                Open https://{connected.domain} ↗
              </a>
            </div>
            <button
              type="button"
              disabled={removing}
              onClick={() => void handleRemove()}
              className="shrink-0 rounded-xl border border-white/15 px-4 py-2 text-xs font-medium text-white/70 transition-colors hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
            >
              {removing ? "Removing…" : "Remove"}
            </button>
          </div>
        </div>
      ) : connected ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-white">{connected.domain}</span>
            <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
              Pending DNS
            </span>
          </div>

          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-indigo-400">DNS setup</p>
            <p className="mb-3 text-sm leading-relaxed text-white/55">
              Add this CNAME record to your DNS provider (or use the A record for the apex @ host):
            </p>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <span className="text-white/40">CNAME — Name: </span>
                <code className="text-indigo-300">@</code>
                <span className="text-white/40"> or </span>
                <code className="text-indigo-300">www</code>
                <span className="text-white/40"> → Value: </span>
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-indigo-200">{cnameTarget}</code>
              </li>
              <li>
                <span className="text-white/40">A — Name: </span>
                <code className="text-indigo-300">@</code>
                <span className="text-white/40"> → Value: </span>
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-indigo-200">{aRecord}</code>
              </li>
            </ul>
          </div>

          {pollNote ? <p className="text-xs text-white/40">{pollNote}</p> : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={checking}
              onClick={() => void handleCheckStatus()}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {checking ? "Checking…" : "Check status"}
            </button>
            <button
              type="button"
              disabled={removing}
              onClick={() => void handleRemove()}
              className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white disabled:opacity-50"
            >
              {removing ? "Removing…" : "Remove"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">Domain</span>
            <input
              type="text"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="mysite.com"
              className={inputClass}
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            type="button"
            disabled={submitting || !domainInput.trim()}
            onClick={() => void handleAdd()}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting ? "Connecting…" : "Connect domain"}
          </button>
        </>
      )}
    </div>
  );
}
