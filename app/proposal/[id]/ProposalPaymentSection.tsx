"use client";

import { useEffect, useState } from "react";

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ProposalPaymentSection({
  proposalId,
  signedAt,
  status
}: {
  proposalId: string;
  signedAt: string | null;
  status: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    if (!signedAt || status === "paid") return;
    let cancelled = false;
    setLoading(true);
    void fetch("/api/proposals/payment-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposal_id: proposalId })
    })
      .then((res) => res.json())
      .then((json: { success?: boolean; payment_link?: string; amount?: number }) => {
        if (cancelled) return;
        if (json.success && json.payment_link && typeof json.amount === "number") {
          setPaymentLink(json.payment_link);
          setAmount(json.amount);
        }
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [proposalId, signedAt, status]);

  if (!signedAt || status === "paid" || (!loading && !paymentLink)) return null;

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-5 sm:px-6">
      <h3 className="text-lg font-semibold text-indigo-900">Complete your payment</h3>
      {loading ? <p className="mt-2 text-sm text-indigo-700/80">Preparing secure checkout...</p> : null}
      {paymentLink && amount ? (
        <a
          href={paymentLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Pay {formatMoney(amount)} →
        </a>
      ) : null}
    </div>
  );
}
