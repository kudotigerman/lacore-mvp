"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { useProjectContext } from "@/app/contexts/ProjectContext";
import { getSupabaseClient } from "@/lib/supabase";
import type { LeadRow } from "@/components/LeadsList";
import { dashToast } from "@/lib/dash-toast";
import { ContextualTip } from "@/components/dashboard/ContextualTip";

export type ProposalSection = { title: string; content: string };

type ProposalSummary = {
  id: string;
  client_name: string;
  client_problem: string;
  created_at: string;
  status: string | null;
  signed_at: string | null;
  signed_by_name: string | null;
};

function parseProposalContent(raw: unknown): ProposalSection[] | null {
  if (!raw || typeof raw !== "object") return null;
  const sections = (raw as { sections?: unknown }).sections;
  if (!Array.isArray(sections)) return null;
  const out: ProposalSection[] = [];
  for (const s of sections) {
    if (!s || typeof s !== "object") continue;
    const title = typeof (s as ProposalSection).title === "string" ? (s as ProposalSection).title : "";
    const content = typeof (s as ProposalSection).content === "string" ? (s as ProposalSection).content : "";
    if (title && content) out.push({ title, content });
  }
  return out.length ? out : null;
}

function formatProposalDate(iso: string): string {
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

function publicProposalUrl(id: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.lacore.ai").replace(/\/$/, "");
  return `${base}/proposal/${id}`;
}

function formatStatusDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function statusMeta(row: ProposalSummary): { label: string; className: string } {
  const status = (row.status || "").toLowerCase();
  if (status === "paid") {
    return { label: "Paid", className: "border-emerald-400/40 bg-emerald-500/15 text-emerald-300" };
  }
  if (status === "signed" || row.signed_at) {
    const signer = row.signed_by_name?.trim() || "Client";
    const date = formatStatusDate(row.signed_at);
    const suffix = date ? ` · ${signer} · ${date}` : ` · ${signer}`;
    return { label: `Signed ✓${suffix}`, className: "border-emerald-400/40 bg-emerald-500/15 text-emerald-300" };
  }
  if (status === "sent") {
    return { label: "Sent", className: "border-amber-400/40 bg-amber-500/15 text-amber-300" };
  }
  return { label: "Draft", className: "border-slate-400/30 bg-slate-500/10 text-slate-300" };
}

function ProposalsPageInner() {
  const d = useDashboardData();
  const { activeProject } = useProjectContext();
  const searchParams = useSearchParams();

  const [clientName, setClientName] = useState("");
  const [clientProblem, setClientProblem] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<ProposalSection[] | null>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [proposalCreatedAt, setProposalCreatedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkLeadId, setLinkLeadId] = useState("");
  const [linkSaving, setLinkSaving] = useState(false);
  const [allProposals, setAllProposals] = useState<ProposalSummary[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [proposalActionBusyId, setProposalActionBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadProposalsAndMaybeLast() {
      if (!d.userId || !activeProject?.id) {
        setAllProposals([]);
        setLoadingProposals(false);
        return;
      }
      setLoadingProposals(true);
      const supabase = getSupabaseClient();
      const { data: list } = await supabase
        .from("proposals")
        .select("id, client_name, client_problem, created_at, status, signed_at, signed_by_name")
        .eq("user_id", d.userId)
        .eq("project_id", activeProject.id)
        .order("created_at", { ascending: false })
        .limit(40);
      if (cancelled) return;
      setAllProposals((list as ProposalSummary[] | null) ?? []);

      const c = searchParams.get("client");
      const p = searchParams.get("problem") ?? searchParams.get("hint");
      if (c || p) {
        if (c) setClientName(c);
        if (p) setClientProblem(p);
        setProposal(null);
        setProposalId(null);
        setProposalCreatedAt(null);
        setLoadingProposals(false);
        return;
      }

      const { data: last } = await supabase
        .from("proposals")
        .select("*")
        .eq("user_id", d.userId)
        .eq("project_id", activeProject.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (last) {
        const row = last as {
          id: string;
          client_name: string;
          client_problem: string;
          content: unknown;
          created_at: string;
        };
        setClientName(row.client_name ?? "");
        setClientProblem(row.client_problem ?? "");
        const sections = parseProposalContent(row.content);
        if (sections?.length) {
          setProposal(sections);
          setProposalId(row.id);
          setProposalCreatedAt(row.created_at);
        } else {
          setProposal(null);
          setProposalId(null);
          setProposalCreatedAt(null);
        }
      }
      setLoadingProposals(false);
    }
    void loadProposalsAndMaybeLast();
    return () => {
      cancelled = true;
    };
  }, [d.userId, activeProject?.id, searchParams]);

  const loadLeads = useCallback(async () => {
    if (!d.userId) return;
    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const qs = activeProject?.id ? `?project_id=${encodeURIComponent(activeProject.id)}` : "";
    const res = await fetch(`/api/leads/list${qs}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    const json = (await res.json()) as { leads?: LeadRow[] };
    if (res.ok && Array.isArray(json.leads)) setLeads(json.leads);
  }, [d.userId, activeProject?.id]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  async function loadProposalById(p: ProposalSummary) {
    const supabase = getSupabaseClient();
    const { data, error: qErr } = await supabase.from("proposals").select("*").eq("id", p.id).single();
    if (qErr || !data) return;
    const row = data as {
      id: string;
      client_name: string;
      client_problem: string;
      content: unknown;
      created_at: string;
    };
    setClientName(row.client_name ?? "");
    setClientProblem(row.client_problem ?? "");
    const sections = parseProposalContent(row.content);
    if (sections?.length) {
      setProposal(sections);
      setProposalId(row.id);
      setProposalCreatedAt(row.created_at);
    }
  }

  async function refreshProposalList() {
    if (!d.userId || !activeProject?.id) {
      setAllProposals([]);
      return;
    }
    const supabase = getSupabaseClient();
    const { data: list } = await supabase
      .from("proposals")
      .select("id, client_name, client_problem, created_at, status, signed_at, signed_by_name")
      .eq("user_id", d.userId)
      .eq("project_id", activeProject.id)
      .order("created_at", { ascending: false })
      .limit(40);
    setAllProposals((list as ProposalSummary[] | null) ?? []);
  }

  async function duplicateProposal(p: ProposalSummary) {
    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    setProposalActionBusyId(p.id);
    try {
      const res = await fetch("/api/proposals/duplicate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ proposal_id: p.id })
      });
      const json = (await res.json()) as { proposal?: ProposalSummary; error?: string };
      if (!res.ok || !json.proposal) {
        dashToast(json.error ?? "Could not duplicate proposal.");
        return;
      }
      await refreshProposalList();
      await loadProposalById(json.proposal);
      dashToast("Proposal duplicated.");
    } finally {
      setProposalActionBusyId(null);
    }
  }

  async function deleteProposal(p: ProposalSummary) {
    const ok = window.confirm(`Delete proposal for ${p.client_name}?`);
    if (!ok) return;
    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    setProposalActionBusyId(p.id);
    try {
      const res = await fetch("/api/proposals/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ proposal_id: p.id })
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) {
        dashToast(json.error ?? "Could not delete proposal.");
        return;
      }
      setAllProposals((prev) => prev.filter((x) => x.id !== p.id));
      if (proposalId === p.id) {
        setProposal(null);
        setProposalId(null);
        setProposalCreatedAt(null);
      }
      dashToast("Proposal deleted.");
    } finally {
      setProposalActionBusyId(null);
    }
  }

  const handleGenerate = async () => {
    setError(null);
    setProposal(null);
    setProposalId(null);
    setProposalCreatedAt(null);
    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("Sign in required.");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-proposal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientProblem: clientProblem.trim(),
          project_id: activeProject?.id ?? undefined,
          offer: d.offer?.offer,
          audience: d.offer?.audience,
          pricing: d.offer?.pricing,
          positioning: d.offer?.positioning,
          headline: d.offer?.headline
        })
      });
      const json = (await res.json()) as {
        proposal?: { id?: string | null; sections?: ProposalSection[] };
        error?: string;
        message?: string;
      };
      if (res.status === 402) {
        setError(json.message ?? json.error ?? "Not enough credits.");
        return;
      }
      if (!res.ok) {
        setError(json.error ?? "Generation failed.");
        return;
      }
      const sections = json.proposal?.sections;
      if (!sections?.length) {
        setError("No proposal returned.");
        return;
      }
      setProposal(sections);
      setProposalId(json.proposal?.id ?? null);
      setProposalCreatedAt(new Date().toISOString());
      if (d.userId && activeProject?.id) {
        const supabase2 = getSupabaseClient();
        const { data: list } = await supabase2
          .from("proposals")
          .select("id, client_name, client_problem, created_at, status, signed_at, signed_by_name")
          .eq("user_id", d.userId)
          .eq("project_id", activeProject.id)
          .order("created_at", { ascending: false })
          .limit(40);
        setAllProposals((list as ProposalSummary[] | null) ?? []);
      }
    } catch {
      setError("Network error.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!proposal?.length) return;
    const text = proposal.map((s) => `${s.title}\n\n${s.content}`).join("\n\n---\n\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToLead = () => {
    if (!proposalId) {
      dashToast("Save the proposal first by generating.");
      return;
    }
    setLinkLeadId(leads[0]?.id ?? "");
    setLinkOpen(true);
    void loadLeads();
  };

  async function copyPublicProposalLink(id: string) {
    try {
      await navigator.clipboard.writeText(publicProposalUrl(id));
      dashToast("Public proposal link copied");
    } catch {
      dashToast("Could not copy link");
    }
  }

  const handleLinkConfirm = async () => {
    if (!proposalId || !linkLeadId) return;
    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    setLinkSaving(true);
    try {
      const res = await fetch("/api/proposals/link-lead", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ proposalId, leadId: linkLeadId })
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        dashToast(j.error ?? "Could not link.");
        return;
      }
      dashToast("Linked to lead — status set to Proposal sent.");
      setLinkOpen(false);
    } finally {
      setLinkSaving(false);
    }
  };

  return (
    <div className="min-h-full" style={{ background: "var(--content-bg)" }}>
      <div className="mb-8">
        <span className="text-xs uppercase tracking-wider text-indigo-400">Close deals</span>
        <h1 className="mb-1 mt-1 text-2xl font-bold text-white">Proposals</h1>
        <p className="text-sm text-white/40">
          AI writes a winning proposal in 30 seconds — personalized for each client
        </p>
      </div>

      <ContextualTip
        icon="💡"
        text="Pro tip: The more specific the client's problem, the better the proposal. Instead of 'needs more clients', try 'losing leads because follow-up takes too long'."
      />

      {loadingProposals ? (
        <p className="mb-4 text-sm text-white/35">Loading proposals…</p>
      ) : null}

      <div className="mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">Client name</label>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Sarah Johnson"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-indigo-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">
              Client&apos;s main problem
            </label>
            <input
              value={clientProblem}
              onChange={(e) => setClientProblem(e.target.value)}
              placeholder="e.g. losing clients to competitors"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-indigo-500/50 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={isGenerating || !clientName.trim() || !clientProblem.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"
        >
          {isGenerating ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Writing your proposal...
            </>
          ) : (
            <>Generate proposal → (uses 3 credits)</>
          )}
        </button>
        {error ? <p className="mt-3 text-center text-sm text-red-400">{error}</p> : null}
      </div>

      {proposal && proposal.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
          <div className="flex flex-col gap-3 border-b border-indigo-500/20 bg-indigo-500/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-white">Proposal for {clientName}</h3>
              <p className="mt-0.5 text-xs text-white/40">
                Generated {proposalCreatedAt ? formatProposalDate(proposalCreatedAt) : "—"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/60 transition-colors hover:text-white/90"
              >
                {copied ? "✓ Copied" : "Copy text"}
              </button>
              {proposalId ? (
                <>
                  <button
                    type="button"
                    onClick={() => void copyPublicProposalLink(proposalId)}
                    className="rounded-lg border border-indigo-500/35 px-3 py-1.5 text-xs text-indigo-300 transition-colors hover:bg-indigo-500/10"
                  >
                    Share link
                  </button>
                  <a
                    href={publicProposalUrl(proposalId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/60 transition-colors hover:text-white/90"
                  >
                    Open public page ↗
                  </a>
                </>
              ) : null}
              <button
                type="button"
                onClick={handleSaveToLead}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-indigo-500"
              >
                Save to lead
              </button>
            </div>
          </div>
          <div className="space-y-4 px-6 py-5">
            {proposal.map((section) => (
              <div key={section.title}>
                <h4 className="mb-2 text-xs uppercase tracking-wider text-indigo-400">{section.title}</h4>
                <p className="text-sm leading-relaxed text-white/75 whitespace-pre-wrap">{section.content}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {allProposals.length > 0 ? (
        <div className="mt-8">
          <h3 className="mb-3 text-xs uppercase tracking-wider text-white/30">Previous proposals</h3>
          {allProposals.map((p) => (
            <div
              key={p.id}
              className="group mb-2 flex flex-col overflow-hidden rounded-xl border border-white/6 bg-white/[0.02] transition-colors hover:border-white/15 sm:flex-row"
            >
              <button
                type="button"
                onClick={() => void loadProposalById(p)}
                className="min-w-0 flex-1 px-4 py-3 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-white/70">{p.client_name}</p>
                  <p className="shrink-0 text-xs text-white/30">{formatProposalDate(p.created_at)}</p>
                </div>
                <p className="mt-0.5 truncate text-xs text-white/40">{p.client_problem}</p>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${statusMeta(p).className}`}
                  >
                    {statusMeta(p).label}
                  </span>
                </div>
              </button>
              <div className="flex shrink-0 flex-row flex-wrap justify-start gap-1 border-t border-white/10 px-2 py-2 sm:w-[140px] sm:flex-col sm:justify-center sm:border-l sm:border-t-0">
                <button
                  type="button"
                  onClick={() => void loadProposalById(p)}
                  className="rounded-lg px-2 py-1.5 text-center text-[10px] font-semibold text-white/80 opacity-100 transition-all hover:bg-white/5 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={proposalActionBusyId === p.id}
                  onClick={() => void duplicateProposal(p)}
                  className="rounded-lg px-2 py-1.5 text-center text-[10px] font-medium text-white/55 opacity-100 transition-all hover:bg-white/5 hover:text-white/80 disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  disabled={proposalActionBusyId === p.id}
                  onClick={() => void deleteProposal(p)}
                  className="rounded-lg px-2 py-1.5 text-center text-[10px] font-medium text-red-400/80 opacity-100 transition-all hover:bg-red-500/10 disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => void copyPublicProposalLink(p.id)}
                  className="rounded-lg py-1.5 text-center text-[10px] font-medium text-indigo-400 transition-colors hover:bg-white/5"
                >
                  Copy link
                </button>
                <a
                  href={publicProposalUrl(p.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg py-1.5 text-center text-[10px] font-medium text-white/45 transition-colors hover:bg-white/5 hover:text-white/75"
                >
                  Open ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {linkOpen ? (
        <div
          className="fixed inset-0 z-[10002] flex items-end justify-center bg-black/60 px-0 sm:items-center sm:px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-t-2xl border border-white/10 bg-[#0D0F1A] p-6 sm:rounded-2xl">
            <h3 className="mb-2 text-lg font-semibold text-white">Link to lead</h3>
            <p className="mb-4 text-sm text-white/45">Sets the lead&apos;s pipeline status to Proposal sent.</p>
            {leads.length === 0 ? (
              <p className="text-sm text-white/40">No leads yet. Capture leads from your landing page first.</p>
            ) : (
              <select
                value={linkLeadId}
                onChange={(e) => setLinkLeadId(e.target.value)}
                className="mb-4 min-h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-base text-white"
              >
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name?.trim() || l.email} — {l.email}
                  </option>
                ))}
              </select>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLinkOpen(false)}
                className="min-h-11 rounded-lg px-4 py-2 text-sm text-white/50 hover:text-white/70"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!linkLeadId || linkSaving || leads.length === 0}
                onClick={() => void handleLinkConfirm()}
                className="min-h-11 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                {linkSaving ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ProposalsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-full p-6 text-sm text-white/40" style={{ background: "var(--content-bg)" }}>
          Loading…
        </div>
      }
    >
      <ProposalsPageInner />
    </Suspense>
  );
}
