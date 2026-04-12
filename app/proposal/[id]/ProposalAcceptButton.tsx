"use client";

export function ProposalAcceptButton() {
  return (
    <button
      type="button"
      disabled
      className="w-full max-w-md cursor-not-allowed rounded-xl border-2 border-indigo-100 bg-indigo-50/50 px-6 py-4 text-center text-base font-bold text-indigo-300 shadow-sm sm:w-auto"
      title="Payment integration coming soon"
    >
      Accept proposal
      <span className="mt-1 block text-xs font-medium text-indigo-400/80">Stripe checkout — coming soon</span>
    </button>
  );
}
