export const PIPELINE_COLUMNS = [
  { id: "new" as const, label: "New" },
  { id: "contacted" as const, label: "Contacted" },
  { id: "replied" as const, label: "Replied" },
  { id: "call_booked" as const, label: "Call Booked" },
  { id: "proposal_sent" as const, label: "Proposal Sent" },
  { id: "won" as const, label: "Won" },
  { id: "lost" as const, label: "Lost" }
] as const;

export type PipelineColumnId = (typeof PIPELINE_COLUMNS)[number]["id"];

const COLUMN_IDS = new Set<string>(PIPELINE_COLUMNS.map((c) => c.id));

const FORWARD_ORDER: Exclude<PipelineColumnId, "lost">[] = [
  "new",
  "contacted",
  "replied",
  "call_booked",
  "proposal_sent",
  "won"
];

export function normalizePipelineStatus(raw: string | null | undefined): PipelineColumnId {
  const v = (raw ?? "new").trim().toLowerCase();
  if (v === "in_talks") return "replied";
  if (COLUMN_IDS.has(v)) return v as PipelineColumnId;
  return "new";
}

export function nextForwardStatus(current: PipelineColumnId): PipelineColumnId | null {
  if (current === "lost") return null;
  const i = FORWARD_ORDER.indexOf(current as (typeof FORWARD_ORDER)[number]);
  if (i < 0 || i >= FORWARD_ORDER.length - 1) return null;
  return FORWARD_ORDER[i + 1]!;
}

export function pipelineColumnLabel(id: PipelineColumnId): string {
  return PIPELINE_COLUMNS.find((c) => c.id === id)?.label ?? id;
}
