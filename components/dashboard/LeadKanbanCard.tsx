"use client";

import { useMemo, useState } from "react";
import type { LeadRow } from "@/components/LeadsList";
import {
  PIPELINE_COLUMNS,
  normalizePipelineStatus,
  pipelineColumnLabel,
  type PipelineColumnId
} from "@/lib/leadPipeline";

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
  onSelect,
  onChangeStatus,
  onGenerateProposal,
  onWriteSequence
}: {
  lead: LeadRow;
  selected: boolean;
  onSelect: () => void;
  onChangeStatus: (status: PipelineColumnId) => void;
  onGenerateProposal: () => void;
  onWriteSequence: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const currentStatus = useMemo(() => normalizePipelineStatus(lead.status), [lead.status]);

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
        {!selected ? (
          <div className="relative w-full">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="w-full rounded-lg border border-indigo-500/30 py-1.5 text-[10px] text-indigo-300 transition-colors hover:bg-indigo-500/10"
            >
              Status: {pipelineColumnLabel(currentStatus)} ▾
            </button>
            {menuOpen ? (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 rounded-lg border border-white/10 bg-[#111116] p-1">
                {PIPELINE_COLUMNS.map((status) => {
                  const active = status.id === currentStatus;
                  return (
                    <button
                      key={status.id}
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        if (!active) onChangeStatus(status.id);
                      }}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[10px] transition-colors ${
                        active ? "bg-indigo-500/20 text-indigo-300" : "text-white/70 hover:bg-white/5"
                      }`}
                    >
                      <span>{status.label}</span>
                      <span className={active ? "text-emerald-400" : "text-transparent"}>✓</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => onGenerateProposal()}
          className="min-w-0 flex-1 rounded-lg border border-white/10 py-1.5 text-[10px] text-white/50 transition-colors hover:border-indigo-500/30 hover:text-indigo-400"
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
