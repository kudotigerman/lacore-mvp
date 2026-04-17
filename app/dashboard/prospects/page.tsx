"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { ContextualTip } from "@/components/dashboard/ContextualTip";
import { getSupabaseClient } from "@/lib/supabase";
import { dashToast } from "@/lib/dash-toast";

type IcpData = {
  role: string;
  companyType: string;
  keyPain: string;
  budgetSignal: string;
  linkedinQuery: string;
  apolloQuery: string;
  twitterHashtags: string[];
  redditCommunities: string[];
  nicheKeyword: string;
};

const EMPTY_ICP: IcpData = {
  role: "",
  companyType: "",
  keyPain: "",
  budgetSignal: "",
  linkedinQuery: "",
  apolloQuery: "",
  twitterHashtags: [],
  redditCommunities: [],
  nicheKeyword: ""
};

function inferNiche(input: { offer: string; audience: string; positioning: string; headline: string }): string {
  const haystack = `${input.offer} ${input.audience} ${input.positioning} ${input.headline}`.toLowerCase();
  if (/(fitness|gym|trainer|workout|nutrition)/.test(haystack)) return "fitness";
  if (/(design|brand|ui|ux|creative)/.test(haystack)) return "designer";
  if (/(developer|software|engineering|code|saas)/.test(haystack)) return "developer";
  if (/(coach|coaching|executive|mindset|leadership)/.test(haystack)) return "coach";
  if (/(consultant|consulting|advisory)/.test(haystack)) return "consultant";
  if (/(agency|marketing agency|creative agency)/.test(haystack)) return "agency";
  if (/(course|cohort|program|training|academy)/.test(haystack)) return "course";
  if (/(local|clinic|restaurant|salon|real estate|law firm|dentist)/.test(haystack)) return "local";
  return "default";
}

export default function ProspectsPage() {
  const d = useDashboardData();
  const [icp, setIcp] = useState<IcpData>(EMPTY_ICP);
  const [icpLoading, setIcpLoading] = useState(false);
  const [icpError, setIcpError] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formSource, setFormSource] = useState("LinkedIn");
  const [submitting, setSubmitting] = useState(false);

  const hasOffer = Boolean(d.offer?.offer?.trim());

  const offerContext = useMemo(
    () => ({
      offer: d.salesBuilderContext.offer,
      audience: d.salesBuilderContext.audience,
      pricing: d.salesBuilderContext.pricing,
      positioning: d.salesBuilderContext.positioning,
      headline: d.salesBuilderContext.headline
    }),
    [d.salesBuilderContext]
  );

  async function loadIcp() {
    if (!hasOffer) return;
    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setIcpError("Sign in required.");
      return;
    }

    setIcpLoading(true);
    setIcpError(null);
    try {
      const res = await fetch("/api/prospects/icp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...offerContext,
          niche: inferNiche(offerContext)
        })
      });
      const json = (await res.json()) as { icp?: IcpData; error?: string };
      if (!res.ok) {
        setIcpError(json.error ?? "Could not generate ICP.");
        return;
      }
      if (!json.icp) {
        setIcpError("No ICP returned.");
        return;
      }
      setIcp(json.icp);
    } catch {
      setIcpError("Network error.");
    } finally {
      setIcpLoading(false);
    }
  }

  useEffect(() => {
    if (!hasOffer) return;
    if (icp.role || icp.companyType || icp.keyPain || icp.budgetSignal) return;
    void loadIcp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasOffer, d.activeProject?.id]);

  async function handleAddProspect() {
    if (!d.activeProject?.id) {
      dashToast("Select a project first.");
      return;
    }
    if (!formName.trim()) {
      dashToast("Name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        dashToast("Sign in required.");
        return;
      }

      const message = [
        `Source: ${formSource}`,
        formCompany.trim() ? `Company: ${formCompany.trim()}` : "",
        formRole.trim() ? `Role: ${formRole.trim()}` : "",
        formNotes.trim() ? `Notes: ${formNotes.trim()}` : ""
      ]
        .filter(Boolean)
        .join("\n");

      const res = await fetch("/api/leads/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          project_id: d.activeProject.id,
          name: formName.trim(),
          email: formEmail.trim() || `${Date.now()}-no-email@prospect.local`,
          message
        })
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        dashToast(json.error ?? "Failed to add prospect.");
        return;
      }

      setFormName("");
      setFormCompany("");
      setFormRole("");
      setFormEmail("");
      setFormNotes("");
      setFormSource("LinkedIn");
      dashToast("Prospect added to pipeline.");
      void d.refreshDashboardStatus();
    } catch {
      dashToast("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  const linkedinSearchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
    icp.linkedinQuery || `${icp.role} ${icp.companyType}`.trim()
  )}`;
  const apolloSearchUrl = `https://app.apollo.io/#/people?page=1&sortAscending=false&sortByField=%5Bnone%5D&q=${encodeURIComponent(
    icp.apolloQuery || `${icp.role} ${icp.companyType}`.trim()
  )}`;
  const twitterHashtagsJoined = (icp.twitterHashtags ?? []).map((x) => `#${x.replace(/^#/, "")}`).join(" ");
  const twitterQuery = [icp.nicheKeyword, icp.role, twitterHashtagsJoined].filter(Boolean).join(" ");
  const twitterSearchUrl = `https://x.com/search?q=${encodeURIComponent(twitterQuery)}&src=typed_query`;
  const redditHint = (icp.redditCommunities ?? []).slice(0, 6).join(", ");
  const redditSearchQuery =
    icp.redditCommunities && icp.redditCommunities.length > 0
      ? icp.redditCommunities.map((x) => `subreddit:${x.replace(/^r\//, "")}`).join(" OR ")
      : icp.nicheKeyword || "entrepreneur";
  const redditUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(redditSearchQuery)}`;
  const productHuntUrl = "https://www.producthunt.com/";
  const hnHiringUrl = "https://news.ycombinator.com/submitted?id=whoishiring";

  const channelCards = [
    {
      icon: "🔗",
      name: "LinkedIn",
      desc: "Best for role + company-fit targeting.",
      hint: icp.linkedinQuery || `"${icp.role}" "${icp.companyType}"`,
      cta: "Search on LinkedIn →",
      href: linkedinSearchUrl
    },
    {
      icon: "🚀",
      name: "Apollo.io",
      desc: "270M+ contacts, free tier",
      hint: icp.apolloQuery || `${icp.role} in ${icp.companyType}`,
      cta: "Search on Apollo →",
      href: apolloSearchUrl
    },
    {
      icon: "🐦",
      name: "Twitter/X",
      desc: "Find founders/operators actively sharing problems.",
      hint: twitterHashtagsJoined || icp.nicheKeyword || "Use niche keywords + role hashtags",
      cta: "Search on X →",
      href: twitterSearchUrl
    },
    {
      icon: "💬",
      name: "Reddit",
      desc: "Join communities where your ICP asks for help.",
      hint: redditHint || "r/entrepreneur, r/smallbusiness",
      cta: "Open communities →",
      href: redditUrl
    },
    {
      icon: "🚀",
      name: "ProductHunt",
      desc: "Find companies that just launched — they need help",
      hint: `Focus on ${icp.nicheKeyword || "your niche"} launches this week`,
      cta: "Browse ProductHunt →",
      href: productHuntUrl
    },
    {
      icon: "💼",
      name: "Hacker News",
      desc: "Find founders in active hiring/growth mode.",
      hint: "Monthly Who is hiring thread",
      cta: "View HN Hiring →",
      href: hnHiringUrl
    }
  ];

  return (
    <div className="min-h-full" style={{ background: "var(--content-bg)" }}>
      <div className="mb-8">
        <span className="text-xs uppercase tracking-wider text-indigo-400">OUTREACH</span>
        <h1 className="mb-1 mt-1 text-2xl font-bold text-white">Find Prospects</h1>
        <p className="text-sm text-white/40">
          Discover who to reach out to — then add them to your pipeline
        </p>
      </div>

      {!hasOffer ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
          <p className="text-sm text-white/45">Add your offer first on the Offer page.</p>
        </div>
      ) : (
        <>
          <ContextualTip
            icon="🧭"
            text="Start with a tight ICP, then use channel shortcuts to discover prospects faster and add the best leads to your pipeline."
          />

          <section className="mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Your ideal client</h2>
              <button
                type="button"
                onClick={() => void loadIcp()}
                disabled={icpLoading}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 transition-colors hover:text-white/80 disabled:opacity-40"
              >
                {icpLoading ? "Refreshing…" : "Refresh ICP"}
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-white/40">Role / Title</label>
                <input
                  value={icp.role}
                  onChange={(e) => setIcp((prev) => ({ ...prev, role: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a12] px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-white/40">Company type</label>
                <input
                  value={icp.companyType}
                  onChange={(e) => setIcp((prev) => ({ ...prev, companyType: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a12] px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-white/40">Key pain</label>
                <input
                  value={icp.keyPain}
                  onChange={(e) => setIcp((prev) => ({ ...prev, keyPain: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a12] px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-white/40">Budget signal</label>
                <input
                  value={icp.budgetSignal}
                  onChange={(e) => setIcp((prev) => ({ ...prev, budgetSignal: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a12] px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                />
              </div>
            </div>
            {icpError ? <p className="mt-3 text-sm text-red-400">{icpError}</p> : null}
          </section>

          <section className="mb-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Where to find them</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {channelCards.map((card) => (
                <div key={card.name} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="mb-2 text-sm font-medium text-white">
                    <span className="mr-2" aria-hidden>
                      {card.icon}
                    </span>
                    {card.name}
                  </p>
                  <p className="mb-2 text-xs text-white/55">{card.desc}</p>
                  <p className="mb-3 rounded-lg border border-white/10 bg-[#0a0a12] px-3 py-2 text-xs text-white/70">
                    {card.hint}
                  </p>
                  <a
                    href={card.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-lg border border-white/10 px-3 py-2 text-xs text-white/75 no-underline transition-colors hover:text-white"
                  >
                    {card.cta}
                  </a>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Add prospect manually</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-white/40">Name</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a12] px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-white/40">Company</label>
                <input
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a12] px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-white/40">Role</label>
                <input
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a12] px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-white/40">Email (optional)</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a12] px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-white/40">Channel where found</label>
                <select
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a12] px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                >
                  {["LinkedIn", "Apollo", "Twitter", "Reddit", "Other"].map((src) => (
                    <option key={src} value={src}>
                      {src}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-white/40">Notes (optional)</label>
                <input
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a12] px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleAddProspect()}
              disabled={submitting || !formName.trim()}
              className="mt-5 w-full rounded-xl bg-indigo-600 py-3 font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"
            >
              {submitting ? "Adding…" : "Add to pipeline →"}
            </button>
          </section>
        </>
      )}
    </div>
  );
}
