"use client";

import { useMemo, useState } from "react";

type Props = {
  proposalId: string;
  initialSignedAt: string | null;
  initialSignedByName: string | null;
};

function formatSignedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

export function ProposalSignatureCard({ proposalId, initialSignedAt, initialSignedByName }: Props) {
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedAt, setSignedAt] = useState<string | null>(initialSignedAt);
  const [signedByName, setSignedByName] = useState<string | null>(initialSignedByName);

  const signedLabel = useMemo(() => {
    if (!signedAt) return "";
    const by = signedByName?.trim() || "Client";
    return `✓ Signed by ${by} on ${formatSignedDate(signedAt)}`;
  }, [signedAt, signedByName]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || signedAt) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Your full name is required.");
      return;
    }
    if (!agreed) {
      setError("You must agree before signing.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/proposals/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposal_id: proposalId,
          name: trimmed,
          agreed: true
        })
      });
      const json = (await res.json()) as { success?: boolean; signed_at?: string; error?: string };
      if (!res.ok || !json.success || !json.signed_at) {
        setError(json.error || "Could not sign proposal.");
        return;
      }
      setSignedByName(trimmed);
      setSignedAt(json.signed_at);
    } catch {
      setError("Could not sign proposal.");
    } finally {
      setLoading(false);
    }
  }

  if (signedAt) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 sm:px-6">
        {signedLabel}
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h3 className="text-lg font-semibold text-slate-900">Sign this proposal</h3>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Your full name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="min-h-11 w-full rounded-xl border border-slate-300 px-4 text-base text-slate-900 outline-none transition focus:border-indigo-500"
          placeholder="John Smith"
        />
      </label>

      <label className="mt-4 flex min-h-11 items-start gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 h-4 w-4 accent-indigo-600"
        />
        <span className="text-sm text-slate-700">I have read and agree to this proposal</span>
      </label>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60 sm:w-auto"
      >
        {loading ? "Signing..." : "Sign proposal →"}
      </button>
    </form>
  );
}
