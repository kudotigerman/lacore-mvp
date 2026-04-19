"use client";

import { useMemo, useState } from "react";
import type { LeadRow } from "@/components/LeadsList";
import {
  PIPELINE_COLUMNS,
  normalizePipelineStatus,
  pipelineColumnLabel,
  type PipelineColumnId
} from "@/lib/leadPipeline";

const STATUS_COLORS: Record<string, { bar: string; badge: string; text: string }> = {
  new: { bar: "rgba(255,255,255,0.15)", badge: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.5)" },
  contacted: { bar: "#3B82F6", badge: "rgba(59,130,246,0.15)", text: "#93C5FD" },
  replied: { bar: "#6366F1", badge: "rgba(99,102,241,0.15)", text: "#A5B4FC" },
  call_booked: { bar: "#8B5CF6", badge: "rgba(139,92,246,0.15)", text: "#C4B5FD" },
  proposal_sent: { bar: "#F59E0B", badge: "rgba(245,158,11,0.15)", text: "#FCD34D" },
  won: { bar: "#10B981", badge: "rgba(16,185,129,0.15)", text: "#6EE7B7" },
  lost: { bar: "#EF4444", badge: "rgba(239,68,68,0.15)", text: "#FCA5A5" },
};

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
  const statusBar = STATUS_COLORS[currentStatus]?.bar ?? "rgba(255,255,255,0.15)";
  const statusBorder = statusBar.startsWith("#") ? `${statusBar}40` : "rgba(255,255,255,0.22)";

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
      className={`group min-w-0 w-full cursor-pointer rounded-xl border bg-white/[0.04] p-3 text-left transition-colors overflow-hidden relative ${
        selected
          ? "border-indigo-500/50 bg-indigo-500/10"
          : "border-white/[0.08] hover:border-white/[0.15]"
      }`}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          borderRadius: "12px 0 0 12px",
          background: statusBar,
        }}
      />
      <div className="mb-1 flex items-start justify-between gap-2 pl-2">
        <p className="truncate text-sm font-medium text-white">{lead.name?.trim() || lead.email}</p>
        {lead.deal_value && Number(lead.deal_value) > 0 ? (
          <span
            style={{
              flexShrink: 0,
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 7px",
              borderRadius: 999,
              background: "rgba(16,185,129,0.15)",
              color: "#6EE7B7",
              border: "1px solid rgba(16,185,129,0.25)",
            }}
          >
            ${Number(lead.deal_value).toLocaleString()}
          </span>
        ) : null}
      </div>
      <p className="mb-2 truncate pl-2 text-xs text-white/40">{lead.email}</p>
      {lead.message ? (
        <p className="mb-3 line-clamp-2 pl-2 text-xs italic text-white/40">&quot;{lead.message}&quot;</p>
      ) : null}
      <p className="mb-3 pl-2 text-[10px] text-white/25">{formatDate(lead.created_at)}</p>
      <div className="flex flex-wrap gap-1.5 pl-2" onClick={(e) => e.stopPropagation()}>
        {!selected ? (
          <div className="relative w-full">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                width: "100%",
                borderRadius: 999,
                padding: "4px 10px",
                fontSize: 10,
                fontWeight: 600,
                border: `1px solid ${statusBorder}`,
                background: STATUS_COLORS[currentStatus]?.badge ?? "rgba(255,255,255,0.05)",
                color: STATUS_COLORS[currentStatus]?.text ?? "rgba(255,255,255,0.5)",
                cursor: "pointer",
                transition: "opacity 0.15s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              {pipelineColumnLabel(currentStatus)}
              <span style={{ opacity: 0.6 }}>▾</span>
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
