"use client";

import type { LeadRow } from "@/components/LeadsList";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return "—";
  }
}

export function LeadKanbanCard({
  lead,
  selected,
  showMove,
  onSelect,
  onMoveToNext,
  onGenerateProposal,
  onWriteSequence
}: {
  lead: LeadRow;
  selected: boolean;
  showMove: boolean;
  onSelect: () => void;
  onMoveToNext: () => void;
  onGenerateProposal: () => void;
  onWriteSequence: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group min-w-0 w-full cursor-pointer rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-left transition-colors ${
        selected
          ? "border-indigo-500/50 bg-indigo-500/10"
          : "hover:border-white/[0.15]"
      }`}
    >
      <p className="mb-1 truncate text-sm font-medium text-white">{lead.name?.trim() || lead.email}</p>
      <p className="mb-2 truncate text-xs text-white/40">{lead.email}</p>
      {lead.message ? (
        <p className="mb-3 line-clamp-2 text-xs italic text-white/40">&quot;{lead.message}&quot;</p>
      ) : null}
      <p className="mb-3 text-[10px] text-white/25">{formatDate(lead.created_at)}</p>
      <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
        {showMove ? (
          <button
            type="button"
            onClick={() => onMoveToNext()}
            className="flex-1 rounded-lg border border-indigo-500/30 py-1.5 text-[10px] text-indigo-400 transition-colors hover:bg-indigo-500/10"
          >
            Move →
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onGenerateProposal()}
          className={`min-w-0 rounded-lg border border-white/10 py-1.5 text-[10px] text-white/50 transition-colors hover:border-indigo-500/30 hover:text-indigo-400 ${showMove ? "flex-1" : "w-full"}`}
        >
          Proposal
        </button>
        <button
          type="button"
          onClick={() => onWriteSequence()}
          className="w-full rounded-lg border border-white/10 py-1.5 text-[10px] text-white/40 transition-colors hover:border-indigo-500/30 hover:text-indigo-400"
        >
          Sequence
        </button>
      </div>
    </div>
  );
}
