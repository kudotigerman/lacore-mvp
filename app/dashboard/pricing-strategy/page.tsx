"use client";

import { useEffect, useState } from "react";
import { ContextualTip } from "@/components/dashboard/ContextualTip";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { getSupabaseClient } from "@/lib/supabase";
import { fetchLatestSavedResult, upsertSavedResult } from "@/lib/saved-results";
import type { PricingStrategyResult } from "@/types/dashboard-ai";

export default function PricingStrategyPage() {
  const d = useDashboardData();
  const { activeProject } = d;
  const [businessType, setBusinessType] = useState("");
  const [niche, setNiche] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [experience, setExperience] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PricingStrategyResult | null>(null);

  useEffect(() => {
    const userId = d.userId;
    const projectId = activeProject?.id;
    if (!userId || !projectId) return;

    async function load(uid: string, pid: string) {
      const supabase = getSupabaseClient();
      const { input, result: saved } = await fetchLatestSavedResult(supabase, {
        userId: uid,
        projectId: pid,
        type: "pricing"
      });
      if (input) {
        setBusinessType(typeof input.businessType === "string" ? input.businessType : "");
        setNiche(typeof input.niche === "string" ? input.niche : "");
        setCurrentPrice(typeof input.currentPrice === "string" ? input.currentPrice : "");
        setExperience(typeof input.experience === "string" ? input.experience : "");
      }
      if (
        saved &&
        typeof saved === "object" &&
        saved !== null &&
        "recommendedPrice" in saved &&
        Array.isArray((saved as PricingStrategyResult).tiers)
      ) {
        setResult(saved as PricingStrategyResult);
      }
    }
    void load(userId, projectId);
  }, [d.userId, activeProject?.id]);

  async function handleGenerate() {
    setError(null);
    setResult(null);
    const supabase = getSupabaseClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("Sign in required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/pricing-strategy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          businessType,
          niche,
          currentPrice,
          experience,
          offer: d.offer?.offer,
          audience: d.offer?.audience,
          pricing: d.offer?.pricing,
          positioning: d.offer?.positioning,
          headline: d.offer?.headline
        })
      });
      const json = (await res.json()) as { result?: PricingStrategyResult; error?: string; message?: string };
      if (res.status === 402) {
        setError(json.message ?? json.error ?? "Not enough credits.");
        return;
      }
      if (!res.ok) {
        setError(json.error ?? "Request failed.");
        return;
      }
      if (!json.result) {
        setError("No result returned.");
        return;
      }
      setResult(json.result);
      if (d.userId && activeProject?.id) {
        const { error: saveErr } = await upsertSavedResult(supabase, {
          userId: d.userId,
          projectId: activeProject.id,
          type: "pricing",
          input: { businessType, niche, currentPrice, experience },
          result: json.result
        });
        if (saveErr) {
          console.warn("saved_results pricing:", saveErr.message);
        }
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = businessType && niche.trim() && experience.trim();

  return (
    <div className="min-h-full" style={{ background: "var(--content-bg)" }}>
      <div className="mb-8">
        <span className="text-xs uppercase tracking-wider text-indigo-400">Revenue</span>
        <h1 className="mb-1 mt-1 text-2xl font-bold text-white">Pricing strategy</h1>
        <p className="text-sm text-white/40">
          AI analyzes your niche and experience — concrete prices, tiers, and how to present them.
        </p>
      </div>

      <ContextualTip
        icon="📊"
        text="Most service providers undercharge by 40-60%. Be honest about your current price — AI will tell you if you're leaving money on the table."
      />

      <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">Business type</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0a0a12] px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none"
            >
              <option value="">Select business type</option>
              <option value="freelancer">Freelancer / Solopreneur</option>
              <option value="agency">Agency / Small team</option>
              <option value="coach">Coach / Trainer</option>
              <option value="consultant">Consultant / Advisor</option>
              <option value="real_estate">Real Estate Agent</option>
              <option value="sales_agent">Sales Agent / Rep</option>
              <option value="other">Other service business</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">Niche</label>
            <input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. UX design for SaaS"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-indigo-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">Current price</label>
            <input
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              placeholder="What you charge now, or 0 / not sure"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-indigo-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-white/40">Experience</label>
            <input
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="e.g. 3 years, 10+ years"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-indigo-500/50 focus:outline-none"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={loading || !canSubmit}
          onClick={() => void handleGenerate()}
          className="w-full rounded-xl bg-indigo-600 py-3 font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"
        >
          {loading ? "Analyzing…" : "Get pricing strategy → (2 credits)"}
        </button>
        {error ? <p className="mt-3 text-center text-sm text-red-400">{error}</p> : null}
      </div>

      {result ? (
        <>
          <div className="mb-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-6">
            <p className="mb-3 text-xs uppercase tracking-wider text-indigo-400">Your optimal price</p>
            <p className="mb-2 text-4xl font-bold text-white">{result.recommendedPrice}</p>
            <p className="text-sm text-white/60">{result.priceRationale}</p>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {result.tiers.map((tier) => (
              <div
                key={tier.name}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
              >
                <p className="mb-1 text-xs uppercase tracking-wider text-white/40">{tier.name}</p>
                <p className="mb-3 text-lg font-semibold text-white">{tier.price}</p>
                <ul className="space-y-2 text-sm text-white/65">
                  {tier.includes.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="text-indigo-400">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mb-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <p className="mb-3 text-xs uppercase tracking-wider text-indigo-400">How to present your price</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/75">{result.presentationScript}</p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <p className="mb-3 text-xs uppercase tracking-wider text-amber-400/90">If they say &quot;too expensive&quot;</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/75">{result.objectionResponse}</p>
          </div>
        </>
      ) : null}
    </div>
  );
}
