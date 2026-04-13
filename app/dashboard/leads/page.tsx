"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LeadKanbanCard } from "@/components/dashboard/LeadKanbanCard";
import LeadClosingPanel from "@/components/dashboard/LeadClosingPanel";
import { DashboardStepShell } from "@/components/dashboard/DashboardStepShell";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { useProjectContext } from "@/app/contexts/ProjectContext";
import { getSupabaseClient } from "@/lib/supabase";
import type { LeadRow } from "@/components/LeadsList";
import { normalizePipelineStatus, nextForwardStatus, type PipelineColumnId } from "@/lib/leadPipeline";

function MailInboxIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="8" y="16" width="48" height="36" rx="4" stroke="currentColor" strokeWidth="2" className="text-white/20" />
      <path d="M8 24 L32 40 L56 24" stroke="currentColor" strokeWidth="2" className="text-indigo-400/80" strokeLinecap="round" />
    </svg>
  );
}

const COLUMNS = [
  { id: "new", label: "New", color: "border-white/20" },
  { id: "contacted", label: "Contacted", color: "border-blue-500/40" },
  { id: "replied", label: "Replied", color: "border-indigo-500/40" },
  { id: "call_booked", label: "Call Booked", color: "border-violet-500/40" },
  { id: "proposal_sent", label: "Proposal Sent", color: "border-amber-500/40" },
  { id: "won", label: "Won 🎉", color: "border-emerald-500/40" },
  { id: "lost", label: "Lost", color: "border-red-500/40" }
] as const;

type ColumnId = (typeof COLUMNS)[number]["id"];

export default function DashboardLeadsPage() {
  const d = useDashboardData();
  const router = useRouter();
  const { activeProject } = useProjectContext();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LeadRow | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [showAddLead, setShowAddLead] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addMessage, setAddMessage] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [panelEnter, setPanelEnter] = useState(false);
  const [activeMobileColumn, setActiveMobileColumn] = useState<ColumnId>("new");
  const [kanbanTouchStartX, setKanbanTouchStartX] = useState<number | null>(null);
  const [panelTouchStartY, setPanelTouchStartY] = useState<number | null>(null);
  const [wonModalLeadId, setWonModalLeadId] = useState<string | null>(null);
  const [wonDealInput, setWonDealInput] = useState("");
  const [wonSaving, setWonSaving] = useState(false);
  const [wonError, setWonError] = useState<string | null>(null);
  const [invoiceModalLeadId, setInvoiceModalLeadId] = useState<string | null>(null);
  const [invoiceAmountInput, setInvoiceAmountInput] = useState("");
  const [invoiceDescription, setInvoiceDescription] = useState("Services as discussed");
  const [invoiceSendEmail, setInvoiceSendEmail] = useState(true);
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceSuccess, setInvoiceSuccess] = useState<string | null>(null);
  const [depositAmountInput, setDepositAmountInput] = useState("");
  const [depositSaving, setDepositSaving] = useState(false);

  const st = d.dashboardStatus;
  const completedCount = st?.completedSteps ?? 0;
  const url = d.landingSlug ? `https://www.lacore.ai/p/${d.landingSlug}` : "";

  const fetchLeads = useCallback(async () => {
    if (!d.userId) {
      setLoading(false);
      setLeads([]);
      return;
    }
    setLoading(true);
    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setLoading(false);
      return;
    }
    const qs = activeProject?.id ? `?project_id=${encodeURIComponent(activeProject.id)}` : "";
    const res = await fetch(`/api/leads/list${qs}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    const json = (await res.json()) as { leads?: LeadRow[] };
    if (res.ok && Array.isArray(json.leads)) {
      setLeads(json.leads);
    } else {
      setLeads([]);
    }
    setLoading(false);
  }, [d.userId, activeProject?.id]);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads, refreshNonce]);

  useEffect(() => {
    if (!selected) {
      setPanelEnter(false);
      return;
    }
    setPanelEnter(false);
    const t = window.setTimeout(() => setPanelEnter(true), 10);
    return () => window.clearTimeout(t);
  }, [selected, selected?.id]);

  async function copyLanding() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
  }

  const getLeadsByStatus = (colId: ColumnId) =>
    leads.filter((l) => normalizePipelineStatus(l.status) === colId);
  const activeMobileColumnIndex = COLUMNS.findIndex((c) => c.id === activeMobileColumn);

  function mergeLeadFromServer(leadId: string, row: LeadRow | undefined) {
    if (!row) return;
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...row } : l)));
    setSelected((s) => (s?.id === leadId ? { ...s, ...row } : s));
  }

  function openInvoiceModal(lead: LeadRow) {
    setInvoiceModalLeadId(lead.id);
    const rawDeal = typeof lead.deal_value === "number" ? lead.deal_value : Number.parseFloat(String(lead.deal_value ?? ""));
    setInvoiceAmountInput(Number.isFinite(rawDeal) && rawDeal > 0 ? String(rawDeal) : "");
    setInvoiceDescription("Services as discussed");
    setInvoiceSendEmail(!!lead.email?.trim());
    const defaultDeposit = Number.isFinite(rawDeal) && rawDeal > 0 ? rawDeal * 0.5 : 0;
    setDepositAmountInput(defaultDeposit > 0 ? defaultDeposit.toFixed(2).replace(/\.00$/, "") : "");
    setInvoiceError(null);
    setInvoiceSuccess(null);
  }

  async function changeLeadStatus(leadId: string, status: PipelineColumnId) {
    if (status === "won") {
      setWonError(null);
      setWonDealInput("");
      setWonModalLeadId(leadId);
      return;
    }
    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch("/api/leads/update", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ lead_id: leadId, status })
    });
    if (!res.ok) return;
    const json = (await res.json()) as { lead?: LeadRow };
    if (json.lead) mergeLeadFromServer(leadId, json.lead);
    else {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l)));
      setSelected((s) => (s?.id === leadId ? { ...s, status } : s));
    }
  }

  async function moveToNextStatus(leadId: string, currentStatus: PipelineColumnId) {
    const next = nextForwardStatus(currentStatus);
    if (!next) return;
    await changeLeadStatus(leadId, next);
  }

  async function skipWonDeal() {
    if (!wonModalLeadId) return;
    const leadId = wonModalLeadId;
    setWonSaving(true);
    setWonError(null);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch("/api/leads/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ lead_id: leadId, status: "won" })
      });
      if (!res.ok) return;
      const json = (await res.json()) as { lead?: LeadRow };
      mergeLeadFromServer(leadId, json.lead);
      setWonModalLeadId(null);
      if (json.lead) openInvoiceModal(json.lead);
    } finally {
      setWonSaving(false);
    }
  }

  async function saveWonDeal() {
    if (!wonModalLeadId) return;
    const leadId = wonModalLeadId;
    setWonSaving(true);
    setWonError(null);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const raw = wonDealInput.replace(/[$,\s]/g, "");
      if (raw === "") {
        const resEmpty = await fetch("/api/leads/update", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ lead_id: leadId, status: "won" })
        });
        if (!resEmpty.ok) return;
        const jEmpty = (await resEmpty.json()) as { lead?: LeadRow };
        mergeLeadFromServer(leadId, jEmpty.lead);
        setWonModalLeadId(null);
        if (jEmpty.lead) openInvoiceModal(jEmpty.lead);
        return;
      }
      const n = Number.parseFloat(raw);
      if (!Number.isFinite(n) || n < 0) {
        setWonError("Enter a valid dollar amount.");
        return;
      }

      const res = await fetch("/api/leads/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ lead_id: leadId, status: "won", deal_value: n })
      });
      if (!res.ok) return;
      const json = (await res.json()) as { lead?: LeadRow };
      mergeLeadFromServer(leadId, json.lead);
      setWonModalLeadId(null);
      if (json.lead) openInvoiceModal(json.lead);
    } finally {
      setWonSaving(false);
    }
  }

  async function sendInvoiceNow() {
    if (!invoiceModalLeadId || !d.sessionToken) return;
    setInvoiceError(null);
    setInvoiceSuccess(null);
    const amount = Number.parseFloat(invoiceAmountInput.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      setInvoiceError("Enter a valid amount.");
      return;
    }
    if (!invoiceDescription.trim()) {
      setInvoiceError("Description is required.");
      return;
    }
    setInvoiceSaving(true);
    try {
      const res = await fetch("/api/invoice/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${d.sessionToken}`
        },
        body: JSON.stringify({
          lead_id: invoiceModalLeadId,
          amount,
          description: invoiceDescription.trim(),
          send_email: invoiceSendEmail
        })
      });
      const json = (await res.json()) as { success?: boolean; payment_link?: string; error?: string; redirect?: string };
      if (!res.ok || !json.success || !json.payment_link) {
        if (json.redirect) {
          router.push(json.redirect);
        }
        setInvoiceError(json.error || "Could not send invoice.");
        return;
      }
      await navigator.clipboard.writeText(json.payment_link);
      setInvoiceSuccess("Invoice sent! Payment link copied to clipboard");
      setLeads((prev) =>
        prev.map((l) =>
          l.id === invoiceModalLeadId ? { ...l, payment_link: json.payment_link, invoice_sent_at: new Date().toISOString() } : l
        )
      );
      setSelected((s) =>
        s?.id === invoiceModalLeadId ? { ...s, payment_link: json.payment_link, invoice_sent_at: new Date().toISOString() } : s
      );
    } catch {
      setInvoiceError("Could not send invoice.");
    } finally {
      setInvoiceSaving(false);
    }
  }

  async function sendDepositNow() {
    if (!invoiceModalLeadId || !d.sessionToken) return;
    setInvoiceError(null);
    setInvoiceSuccess(null);
    const amount = Number.parseFloat(depositAmountInput.replace(/[$,\s]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      setInvoiceError("Enter a valid deposit amount.");
      return;
    }
    setDepositSaving(true);
    try {
      const res = await fetch("/api/invoice/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${d.sessionToken}`
        },
        body: JSON.stringify({
          lead_id: invoiceModalLeadId,
          amount,
          description: `Deposit — ${invoiceDescription.trim() || "Services as discussed"}`,
          send_email: invoiceSendEmail,
          deposit: true
        })
      });
      const json = (await res.json()) as { success?: boolean; payment_link?: string; error?: string; redirect?: string };
      if (!res.ok || !json.success || !json.payment_link) {
        if (json.redirect) router.push(json.redirect);
        setInvoiceError(json.error || "Could not send deposit request.");
        return;
      }
      await navigator.clipboard.writeText(json.payment_link);
      setInvoiceSuccess("Deposit request sent! Payment link copied to clipboard");
      setLeads((prev) =>
        prev.map((l) =>
          l.id === invoiceModalLeadId ? { ...l, payment_link: json.payment_link, invoice_sent_at: new Date().toISOString() } : l
        )
      );
      setSelected((s) =>
        s?.id === invoiceModalLeadId ? { ...s, payment_link: json.payment_link, invoice_sent_at: new Date().toISOString() } : s
      );
    } catch {
      setInvoiceError("Could not send deposit request.");
    } finally {
      setDepositSaving(false);
    }
  }

  function generateProposalForLead(lead: LeadRow) {
    const params = new URLSearchParams();
    const name = lead.name?.trim() || lead.email.split("@")[0] || "Client";
    params.set("client", name);
    const problem =
      lead.message?.trim() ||
      `Follow up with ${lead.email} — turn this lead into a paying client.`;
    params.set("problem", problem);
    router.push(`/dashboard/proposals?${params.toString()}`);
  }

  function writeSequenceForLead(lead: LeadRow) {
    const params = new URLSearchParams();
    const name = lead.name?.trim() || lead.email.split("@")[0] || "";
    params.set("leadName", name);
    const ctx =
      lead.message?.trim() ||
      `Email: ${lead.email}${lead.phone ? ` · Phone: ${lead.phone}` : ""}`;
    params.set("leadContext", ctx);
    router.push(`/dashboard/sequences?${params.toString()}`);
  }

  async function submitManualLead() {
    if (!activeProject?.id) {
      setAddError("Select a project first.");
      return;
    }
    setAddError(null);
    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setAddError("Sign in required.");
      return;
    }
    if (!addEmail.trim()) {
      setAddError("Email is required.");
      return;
    }
    setAddSaving(true);
    try {
      const res = await fetch("/api/leads/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          project_id: activeProject.id,
          name: addName.trim(),
          email: addEmail.trim(),
          phone: addPhone.trim() || undefined,
          message: addMessage.trim() || undefined
        })
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setAddError(j.error ?? "Could not add lead.");
        return;
      }
      setShowAddLead(false);
      setAddName("");
      setAddEmail("");
      setAddPhone("");
      setAddMessage("");
      setRefreshNonce((n) => n + 1);
    } finally {
      setAddSaving(false);
    }
  }

  return (
    <div className="min-h-full" style={{ background: "var(--content-bg)" }}>
      <DashboardStepShell
        stepNum={4}
        completedCount={completedCount}
        title="Leads & closing"
        subtitle="Capture leads from your landing page and close them with AI"
        isStepDone={!!st?.leads}
        nextStepLabel="Analytics"
        nextStepHref="/dashboard/analytics"
      >
        {!d.userId ? null : loading ? (
          <p className="text-sm text-white/40">Loading leads…</p>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 text-white/20">
              <MailInboxIcon />
            </div>
            <h3 className="mb-2 font-medium text-white">No leads yet</h3>
            <p className="mb-6 max-w-xs text-sm text-white/45">Share your landing page to start getting leads.</p>
            {url ? (
              <>
                <button
                  type="button"
                  onClick={() => void copyLanding()}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-indigo-500"
                >
                  Copy landing page link
                </button>
                <p className="mt-4 max-w-md break-all text-xs text-white/35">{url}</p>
              </>
            ) : (
              <p className="max-w-xs text-sm text-white/35">Create a landing page first to get a shareable link.</p>
            )}
            <button
              type="button"
              onClick={() => setShowAddLead(true)}
              className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-white/15 px-4 py-2.5 text-xs text-white/40 transition-colors hover:border-indigo-500/40 hover:text-indigo-400"
            >
              <span>+</span>
              Add lead manually
            </button>
            <button
              type="button"
              onClick={() => setRefreshNonce((n) => n + 1)}
              className="mt-6 text-xs text-white/40 underline transition-colors hover:text-white/60"
            >
              Refresh status
            </button>
          </div>
        ) : (
          <div className="flex min-h-0 w-full flex-col gap-8 overflow-x-hidden lg:flex-row lg:items-stretch lg:gap-0 lg:overflow-hidden">
            <div className="min-w-0 flex-1 lg:min-w-0">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-1 flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4 sm:max-w-xl">
                  <div className="flex items-start gap-3">
                    <span className="text-xl" aria-hidden>
                      💡
                    </span>
                    <div>
                      <p className="mb-1 text-sm font-medium text-white">How leads appear here</p>
                      <p className="text-sm leading-relaxed text-white/50">
                        When someone visits your landing page and fills the contact form — they automatically appear in{" "}
                        <span className="text-indigo-400">New</span> column. Move them through stages as you work the
                        deal.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-400 hover:text-indigo-300"
                          >
                            View your landing page ↗
                          </a>
                        ) : null}
                        {url ? <span className="text-white/20">·</span> : null}
                        <button
                          type="button"
                          onClick={() => router.push("/dashboard/landing")}
                          className="text-xs text-white/40 hover:text-white/60"
                        >
                          Edit landing page
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                  <button
                    type="button"
                    onClick={() => setRefreshNonce((n) => n + 1)}
                    className="rounded-lg border border-white/15 px-3 py-1 text-xs text-white/50 hover:text-white/70"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddLead(true)}
                className="mb-6 flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-white/15 px-4 py-2.5 text-xs text-white/40 transition-colors hover:border-indigo-500/40 hover:text-indigo-400"
              >
                <span>+</span>
                Add lead manually
              </button>

              <div className="mb-3 flex min-w-0 gap-2 overflow-x-auto pb-2 lg:hidden">
                {COLUMNS.map((col) => {
                  const count = getLeadsByStatus(col.id).length;
                  const active = col.id === activeMobileColumn;
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setActiveMobileColumn(col.id)}
                      className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                        active
                          ? "border-indigo-500/45 bg-indigo-500/20 text-indigo-200"
                          : "border-white/10 bg-white/5 text-white/60"
                      }`}
                    >
                      <span>{col.label}</span>
                      <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px]">{count}</span>
                    </button>
                  );
                })}
              </div>

              <div
                className="space-y-2 pb-4 lg:hidden"
                onTouchStart={(e) => setKanbanTouchStartX(e.touches[0]?.clientX ?? null)}
                onTouchEnd={(e) => {
                  if (kanbanTouchStartX === null) return;
                  const dx = (e.changedTouches[0]?.clientX ?? 0) - kanbanTouchStartX;
                  if (Math.abs(dx) > 40) {
                    const next = dx < 0 ? activeMobileColumnIndex + 1 : activeMobileColumnIndex - 1;
                    if (next >= 0 && next < COLUMNS.length) {
                      setActiveMobileColumn(COLUMNS[next]!.id);
                    }
                  }
                  setKanbanTouchStartX(null);
                }}
              >
                {getLeadsByStatus(activeMobileColumn).map((lead) => (
                  <LeadKanbanCard
                    key={lead.id}
                    lead={lead}
                    selected={selected?.id === lead.id}
                    onSelect={() => setSelected(lead)}
                    onChangeStatus={(status) => void changeLeadStatus(lead.id, status)}
                    onGenerateProposal={() => generateProposalForLead(lead)}
                    onWriteSequence={() => writeSequenceForLead(lead)}
                  />
                ))}
                {getLeadsByStatus(activeMobileColumn).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 p-3 text-center">
                    <p className="text-xs text-white/25">No leads in this stage.</p>
                  </div>
                ) : null}
              </div>

              <div className="hidden min-w-0 gap-3 overflow-x-auto pb-4 lg:flex">
                {COLUMNS.map((col) => {
                  const colLeads = getLeadsByStatus(col.id);
                  return (
                    <div key={col.id} className="w-[200px] flex-shrink-0">
                      <div className={`mb-3 border-t-2 pt-3 ${col.color}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-white/70">{col.label}</span>
                          <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-xs text-white/30">
                            {colLeads.length}
                          </span>
                        </div>
                      </div>
                      <div className="min-h-[100px] space-y-2">
                        {colLeads.map((lead) => {
                          const stNorm = normalizePipelineStatus(lead.status);
                          return (
                            <LeadKanbanCard
                              key={lead.id}
                              lead={lead}
                              selected={selected?.id === lead.id}
                              onSelect={() => setSelected(lead)}
                              onChangeStatus={(status) => void changeLeadStatus(lead.id, status)}
                              onGenerateProposal={() => generateProposalForLead(lead)}
                              onWriteSequence={() => writeSequenceForLead(lead)}
                            />
                          );
                        })}
                        {colLeads.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-white/10 p-3 text-center">
                            <p className="text-xs text-white/20">
                              {col.id === "new"
                                ? "Share your landing page to get leads"
                                : "No leads here yet"}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {selected ? (
              <aside
                className={`fixed inset-x-0 bottom-0 top-auto z-[60] flex h-[92vh] min-h-0 flex-col rounded-t-2xl border border-white/[0.08] bg-[var(--content-bg)] transition-transform duration-200 ease-out lg:static lg:inset-auto lg:z-auto lg:h-[min(100vh-8rem,900px)] lg:w-[400px] lg:max-w-[400px] lg:flex-shrink-0 lg:rounded-none lg:border-l lg:bg-transparent lg:shadow-none ${
                  panelEnter ? "translate-y-0 lg:translate-x-0" : "translate-y-full lg:translate-x-full"
                } `}
                onTouchStart={(e) => setPanelTouchStartY(e.touches[0]?.clientY ?? null)}
                onTouchEnd={(e) => {
                  if (panelTouchStartY === null) return;
                  const dy = (e.changedTouches[0]?.clientY ?? 0) - panelTouchStartY;
                  if (dy > 80) setSelected(null);
                  setPanelTouchStartY(null);
                }}
              >
                <LeadClosingPanel
                  lead={selected}
                  sessionToken={d.sessionToken}
                  salesContext={d.salesBuilderContext}
                  onClose={() => setSelected(null)}
                  onStatusChange={(status) => void changeLeadStatus(selected.id, status)}
                  onCreateProposal={() => generateProposalForLead(selected)}
                  onLeadUpdated={(updated) => {
                    setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
                    setSelected((s) => (s?.id === updated.id ? { ...s, ...updated } : s));
                  }}
                  onLeadDeleted={(leadId) => {
                    setLeads((prev) => prev.filter((l) => l.id !== leadId));
                    setSelected(null);
                  }}
                  onOpenInvoice={() => {
                    if (selected) openInvoiceModal(selected);
                  }}
                />
              </aside>
            ) : null}
          </div>
        )}

        {showAddLead ? (
          <div
            className="fixed inset-0 z-[10002] flex items-end justify-center bg-black/60 px-0 sm:items-center sm:px-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-t-2xl border border-white/10 bg-[#0D0F1A] p-6 sm:rounded-2xl">
              <h3 className="mb-1 text-lg font-semibold text-white">Add lead manually</h3>
              <p className="mb-4 text-sm text-white/45">Creates a lead in the New column for this project.</p>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-white/40">Name</label>
                  <input
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-white/40">Email *</label>
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
                    placeholder="jane@company.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-white/40">Phone (optional)</label>
                  <input
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
                    placeholder="+1 …"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-white/40">Message (optional)</label>
                  <textarea
                    value={addMessage}
                    onChange={(e) => setAddMessage(e.target.value)}
                    rows={3}
                    className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
                    placeholder="Notes from a call, LinkedIn DM, etc."
                  />
                </div>
              </div>
              {addError ? <p className="mt-3 text-sm text-red-400">{addError}</p> : null}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddLead(false);
                    setAddError(null);
                  }}
                  className="rounded-lg px-4 py-2 text-sm text-white/50 hover:text-white/70"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={addSaving || !addEmail.trim()}
                  onClick={() => void submitManualLead()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-40"
                >
                  {addSaving ? "Saving…" : "Add lead"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {wonModalLeadId ? (
          <div
            className="fixed inset-0 z-[10003] flex items-end justify-center bg-black/60 px-0 sm:items-center sm:px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="won-deal-title"
          >
            <div className="w-full max-w-md rounded-t-2xl border border-white/10 bg-[#0D0F1A] p-6 shadow-xl sm:rounded-2xl">
              <h3 id="won-deal-title" className="mb-1 text-lg font-semibold text-white">
                Deal won! 🎉
              </h3>
              <p className="mb-4 text-sm text-white/45">What was the deal value? (optional)</p>
              <div className="flex overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <span className="flex items-center pl-3 text-sm text-white/45">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={wonDealInput}
                  onChange={(e) => {
                    let v = e.target.value.replace(/[^\d.]/g, "");
                    const dot = v.indexOf(".");
                    if (dot !== -1) {
                      v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "");
                    }
                    setWonDealInput(v);
                  }}
                  className="min-w-0 flex-1 border-0 bg-transparent py-2.5 pr-3 text-sm text-white outline-none ring-0 placeholder:text-white/25 focus:ring-0"
                  placeholder="0"
                  aria-label="Deal value in dollars"
                />
              </div>
              {wonError ? <p className="mt-2 text-sm text-red-400">{wonError}</p> : null}
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={wonSaving}
                  onClick={() => void skipWonDeal()}
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 transition-colors hover:border-white/25 hover:text-white disabled:opacity-40"
                >
                  Skip
                </button>
                <button
                  type="button"
                  disabled={wonSaving}
                  onClick={() => void saveWonDeal()}
                  className="min-h-11 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"
                >
                  {wonSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {invoiceModalLeadId ? (
          <div className="fixed inset-0 z-[10004] flex items-end justify-center bg-black/60 px-0 sm:items-center sm:px-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-t-2xl border border-white/10 bg-[#0D0F1A] p-6 shadow-xl sm:rounded-2xl">
              <h3 className="mb-1 text-lg font-semibold text-white">Send invoice?</h3>
              <p className="mb-4 text-sm text-white/45">Create a Stripe payment link for this won deal.</p>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs uppercase tracking-wider text-white/40">Amount (USD)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={invoiceAmountInput}
                    onChange={(e) => setInvoiceAmountInput(e.target.value.replace(/[^\d.]/g, ""))}
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
                    placeholder="0"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs uppercase tracking-wider text-white/40">Description</span>
                  <input
                    type="text"
                    value={invoiceDescription}
                    onChange={(e) => setInvoiceDescription(e.target.value)}
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
                    placeholder="Services as discussed"
                  />
                </label>
                <label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={invoiceSendEmail}
                    onChange={(e) => setInvoiceSendEmail(e.target.checked)}
                  />
                  Send email to {(leads.find((l) => l.id === invoiceModalLeadId)?.email || "lead")}
                </label>
              </div>
              {invoiceError ? <p className="mt-3 text-sm text-red-400">{invoiceError}</p> : null}
              {invoiceSuccess ? <p className="mt-3 text-sm text-emerald-400">{invoiceSuccess}</p> : null}
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={invoiceSaving || depositSaving}
                  onClick={() => setInvoiceModalLeadId(null)}
                  className="min-h-11 rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 transition-colors hover:border-white/25 hover:text-white disabled:opacity-40"
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  disabled={invoiceSaving || depositSaving}
                  onClick={() => void sendInvoiceNow()}
                  className="min-h-11 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"
                >
                  {invoiceSaving ? "Sending…" : "Send Invoice"}
                </button>
              </div>
              <div className="mt-6 border-t border-white/10 pt-4">
                <p className="text-sm font-medium text-white">Or request a deposit first?</p>
                <div className="mt-3 space-y-2">
                  <label className="block">
                    <span className="mb-1 block text-xs uppercase tracking-wider text-white/40">Deposit amount</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={depositAmountInput}
                      onChange={(e) => setDepositAmountInput(e.target.value.replace(/[^\d.]/g, ""))}
                      className="min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
                      placeholder="0"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={depositSaving || invoiceSaving}
                    onClick={() => void sendDepositNow()}
                    className="min-h-11 w-full rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-200 transition-colors hover:bg-indigo-500/20 disabled:opacity-40"
                  >
                    {depositSaving ? "Sending…" : "Send deposit request"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DashboardStepShell>
    </div>
  );
}
