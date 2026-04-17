"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, Layout, PenLine, Users, FileText, DollarSign, Mail, Search, Send, ChevronDown } from "lucide-react";
import { HomePricingSection } from "@/components/home/HomePricingSection";
import { Logo } from "@/components/Logo";

const PLACEHOLDER_EXAMPLES = [
  "I coach founders on building high-performance teams...",
  "I'm a UX designer who helps SaaS startups...",
  "I help e-commerce brands grow with paid ads...",
  "I'm a copywriter specializing in B2B SaaS..."
];

type DemoResult = {
  headline: string;
  personas: Array<{ title: string; pain: string }>;
  linkedinQuery: string;
};

const FAQ_ITEMS = [
  {
    q: "Is LACORE really free to start?",
    a: "Yes. You get 20 credits on signup — enough to generate your offer, one landing page, and your first proposal. No credit card required."
  },
  {
    q: "What are credits?",
    a: "Credits are how LACORE meters AI generations. Landing page: 10 credits. Proposal: 3. Sequence: 3. Content post: 3. Credits roll forward and never expire."
  },
  {
    q: "Do I need to be technical?",
    a: "No. LACORE is built for non-technical service businesses. If you can describe what you sell, you can run LACORE."
  },
  {
    q: "How does e-signature work on proposals?",
    a: "Every proposal has a public link. Your client opens it, clicks 'Accept and sign', types their name — done. You get a Telegram alert the moment they sign."
  },
  {
    q: "Which AI powers LACORE?",
    a: "LACORE AI is powered by state-of-the-art language models with prompt caching for speed. We never share your data or train on your inputs."
  },
  {
    q: "When will paid plans launch?",
    a: "Paid plans are launching in the coming weeks. Sign up free now — founders who join early lock in founder pricing permanently."
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, always. No contracts, no lock-in. Cancel from your dashboard in one click. If you're on a paid plan, you keep access until the end of your billing period. Credits you've purchased never expire."
  },
  {
    q: "How is LACORE different from HighLevel or ClickFunnels?",
    a: "HighLevel and ClickFunnels are built for marketing agencies running ads at scale — they're complex, expensive ($97–$297/month), and designed for teams. LACORE is built for individual service sellers: one person, one offer, one sales machine. You describe what you sell — LACORE writes your positioning, builds your landing page, finds your prospects, writes your proposals, and automates your follow-up. No funnels to build, no campaigns to manage, no tech skills required."
  }
] as const;

export function HomePageClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [heroInput, setHeroInput] = useState("");
  const [phIndex, setPhIndex] = useState(0);
  const [phVisible, setPhVisible] = useState(true);
  const [demoState, setDemoState] = useState<"idle" | "loading" | "result" | "error">("idle");
  const [demoResult, setDemoResult] = useState<DemoResult | null>(null);
  const [demoError, setDemoError] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".animate-on-scroll").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (heroInput.trim()) return;
    const id = setInterval(() => {
      setPhVisible(false);
      window.setTimeout(() => {
        setPhIndex((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length);
        setPhVisible(true);
      }, 450);
    }, 3000);
    return () => clearInterval(id);
  }, [heroInput]);

  useEffect(
    () => () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    },
    []
  );

  const scrollToId = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  async function runDemo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const offer = heroInput.trim();
    if (!offer) return;
    setDemoState("loading");
    setDemoError("");
    setDemoResult(null);
    try {
      const res = await fetch("/api/home-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer })
      });
      const json = (await res.json()) as { headline?: string; personas?: DemoResult["personas"]; linkedinQuery?: string; error?: string };
      if (!res.ok) {
        setDemoError(json.error ?? "Something went wrong. Please try again.");
        setDemoState("error");
        return;
      }
      if (!json.headline || !Array.isArray(json.personas) || !json.linkedinQuery) {
        setDemoError("Could not build the preview this time.");
        setDemoState("error");
        return;
      }
      setDemoResult({
        headline: json.headline,
        personas: json.personas.slice(0, 3),
        linkedinQuery: json.linkedinQuery
      });
      setDemoState("result");
    } catch {
      setDemoError("Network issue. Please try again.");
      setDemoState("error");
    }
  }

  async function copyQuery() {
    if (!demoResult?.linkedinQuery) return;
    await navigator.clipboard.writeText(demoResult.linkedinQuery);
    setCopyStatus("copied");
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setCopyStatus("idle"), 1600);
  }

  const showPlaceholderOverlay = !heroInput.trim();

  return (
    <main className="min-h-screen bg-[#07080F] text-white antialiased" style={{ fontFamily: "var(--font-geist-sans), Inter, system-ui, sans-serif" }}>
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#07080F]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo size="md" variant="dark" href="/" />
          <div className="hidden items-center gap-6 md:flex">
            <button type="button" onClick={() => scrollToId("product")} className="text-sm text-white/55 transition hover:text-white/90">
              Product
            </button>
            <button type="button" onClick={() => scrollToId("pricing")} className="text-sm text-white/55 transition hover:text-white/90">
              Pricing
            </button>
            <Link href="/blog" className="text-sm text-white/55 no-underline transition hover:text-white/90">
              Blog
            </Link>
          </div>
          {isLoggedIn ? (
            <Link href="/dashboard/offer" className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white no-underline transition hover:bg-indigo-500">
              Go to dashboard →
            </Link>
          ) : (
            <div className="flex shrink-0 items-center gap-2">
              <Link href="/auth" className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white/70 no-underline transition-colors hover:text-white">
                Sign in
              </Link>
              <Link href="/auth" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white no-underline transition-colors hover:bg-indigo-500">
                Start free →
              </Link>
            </div>
          )}
        </div>
      </nav>

      <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pt-16 md:pt-20">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse 900px 600px at 50% -150px, rgba(99,102,241,0.22), transparent)",
              animation: "lacore-float-slow 8s ease-in-out infinite"
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse 600px 400px at 15% 60%, rgba(56,189,248,0.10), transparent)",
              animation: "lacore-float-slow 10s ease-in-out infinite 2s"
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse 500px 350px at 85% 40%, rgba(52,211,153,0.07), transparent)",
              animation: "lacore-float-slow 12s ease-in-out infinite 4s"
            }}
          />
        </div>

        <div className="relative z-[1] mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs text-indigo-300">
            LACORE AI · v1.0
          </div>
          <h1
            className="font-plus-jakarta mt-8 leading-[1.03] tracking-[-0.03em] text-white"
            style={{ fontWeight: 800, fontSize: "clamp(48px, 6vw, 80px)" }}
          >
            <span className="block">Your entire sales team.</span>
            <span className="block text-indigo-400">In one tab.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[580px] text-base leading-relaxed text-white/65 sm:text-lg">
            LACORE is the AI sales OS for consultants, coaches, freelancers and agencies. Find prospects, launch landing pages, close with proposals, and get paid — without switching tools.
          </p>

          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-white/[0.08] bg-[#0D0F1A] p-4 sm:p-6">
            <form onSubmit={runDemo}>
              <div className="relative">
                <textarea
                  rows={3}
                  value={heroInput}
                  onChange={(e) => setHeroInput(e.target.value)}
                  placeholder=" "
                  className="w-full resize-none rounded-2xl border border-white/10 bg-[#07080F] px-4 py-3 text-sm text-white/85 placeholder:text-white/25 focus:border-indigo-500/50 focus:outline-none"
                  aria-label="Describe your offer for a free preview"
                />
                {showPlaceholderOverlay ? (
                  <span
                    className={`pointer-events-none absolute left-4 top-6 max-w-[calc(100%-2.5rem)] -translate-y-1/2 truncate text-sm text-white/25 hero-placeholder-layer ${phVisible ? "" : "hero-placeholder-layer--out"}`}
                  >
                    {PLACEHOLDER_EXAMPLES[phIndex]}
                  </span>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={!heroInput.trim() || demoState === "loading"}
                className="mt-3 min-h-11 w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                See what LACORE can do for your business →
              </button>
              <p className="mt-2 text-xs text-white/35">Free preview. No signup needed.</p>
            </form>

            {demoState === "loading" ? (
              <div role="status" aria-live="polite" className="mt-5 space-y-2 rounded-xl border border-white/[0.08] bg-[#07080F] p-4 text-left">
                {[
                  "Analysing your offer...",
                  "Building your ICP...",
                  "Writing LinkedIn search query..."
                ].map((line, idx) => (
                  <p key={line} className="text-sm text-white/65 home-demo-line" style={{ animationDelay: `${idx * 600}ms` }}>
                    {line}
                  </p>
                ))}
              </div>
            ) : null}

            {demoState === "result" && demoResult ? (
              <div className="mt-5 space-y-3 text-left">
                <div className="rounded-2xl border border-white/[0.08] border-t-indigo-500 bg-[#07080F] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">Your landing page headline</p>
                  <h3 className="mt-2 text-2xl font-bold text-white">{demoResult.headline}</h3>
                  <p className="mt-2 text-xs text-white/45">This headline would go on your landing page — generated in 3 seconds.</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-[#07080F] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">Your 3 buyer personas</p>
                  <div className="mt-2 space-y-2">
                    {demoResult.personas.slice(0, 3).map((p, idx) => (
                      <div key={`${p.title}-${idx}`} className="rounded-xl border border-white/[0.08] bg-[#0D0F1A] p-3">
                        <p className="text-sm font-semibold text-white">{p.title}</p>
                        <p className="mt-1 text-sm text-white/65">{p.pain}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-[#07080F] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">Ready-to-use LinkedIn search</p>
                  <pre className="mt-2 overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0D0F1A] p-3 text-xs text-white/65">
                    {demoResult.linkedinQuery}
                  </pre>
                  <button
                    type="button"
                    onClick={() => void copyQuery()}
                    className="mt-2 rounded-xl border border-white/10 px-3 py-1.5 text-xs text-white/65 transition-colors hover:text-white"
                  >
                    {copyStatus === "copied" ? "Copied!" : "Copy query"}
                  </button>
                </div>
                <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4">
                  <p className="text-sm text-white/85">
                    This is 5% of what LACORE does. Sign up free to unlock proposals, sequences, landing pages, and more.
                  </p>
                  <Link
                    href="/auth"
                    className="mt-3 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white no-underline transition hover:bg-indigo-500"
                  >
                    Start building my sales team free →
                  </Link>
                </div>
              </div>
            ) : null}

            {demoState === "error" ? (
              <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-left">
                <p className="text-sm text-red-300">{demoError || "Could not generate the preview right now."}</p>
                <button
                  type="button"
                  onClick={() => setDemoState("idle")}
                  className="mt-3 rounded-xl border border-white/10 px-3 py-1.5 text-xs text-white/75"
                >
                  Try again
                </button>
              </div>
            ) : null}
          </div>

          <p className="mt-4 text-xs text-white/35">
            <span className="text-amber-400/90">★★★★★</span> Used by consultants · coaches · freelancers · agencies · real estate agents
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0D0F1A]">
          <div className="flex items-center gap-2 border-b border-white/[0.08] bg-black/30 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
            <span className="ml-2 truncate rounded-md bg-white/5 px-3 py-1 text-[11px] text-white/35">lacore.ai/dashboard/leads</span>
          </div>
          <div className="flex flex-col md:flex-row">
            <aside className="w-full border-b border-white/[0.08] bg-[#07080F] p-4 md:w-[245px] md:border-b-0 md:border-r">
              <Logo size="sm" variant="dark" href={false} />
              <div className="mt-4 space-y-1 text-[11px]">
                {[
                  "01 Offer",
                  "02 Landing page",
                  "03 Content",
                  "04 Leads & closing",
                  "05 Proposals",
                  "06 Pricing",
                  "07 Sequences",
                  "08 Prospects",
                  "09 Outreach"
                ].map((item) => (
                  <div
                    key={item}
                    className={`rounded-lg px-2 py-2 ${item.startsWith("04") ? "bg-indigo-500/20 text-indigo-300" : "text-white/45"}`}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </aside>
            <div className="flex-1 p-4 sm:p-6">
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  { title: "New Lead", card: "Maria S. · UX project · $4,200" },
                  { title: "Proposal Sent", card: "James T. · Coaching package · $1,800 · ✍️ awaiting sign" },
                  { title: "Won 🎉", card: "Sarah K. · Agency retainer · $6,000/mo · ✓ paid" }
                ].map((col) => (
                  <div key={col.title} className="rounded-xl border border-white/[0.08] bg-[#07080F] p-3">
                    <p className="mb-2 text-xs font-semibold text-white/65">{col.title}</p>
                    <div className="rounded-xl border border-white/[0.08] bg-[#0D0F1A] p-3 text-xs text-white/85">{col.card}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-sm text-white/45">Built for service businesses</p>
          <div className="mt-3 flex gap-3 overflow-x-auto whitespace-nowrap text-xs text-white/25">
            {["Consultants", "Coaches", "Freelancers", "Agencies", "Real Estate", "Advisors", "Designers", "Developers"].map((n, i) => (
              <span key={n}>
                {i > 0 ? <span className="mr-3">·</span> : null}
                {n}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="product" className="animate-on-scroll scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[1120px]">
          <div className="text-center">
            <h2 className="font-plus-jakarta text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Follow a lead from stranger to paying client
            </h2>
            <p className="mt-3 text-white/45">One product, four moments. Every step automated.</p>
          </div>

          <div className="mt-8 space-y-4">
            {[
              {
                badge: "01 · PROSPECTS",
                title: "LACORE finds Sarah for you",
                body: "Paste your offer. AI builds your Ideal Client Profile: role, company type, budget signal, and key pain. Click LinkedIn — the Boolean search is pre-filled.",
                mockup: (
                  <div className="rounded-2xl border border-white/[0.08] bg-[#07080F] p-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      {["Role: Marketing Director", "Company: B2B SaaS (10-200)", "Pain: churn + low conversion", "Budget: growth-stage funded"].map((x) => (
                        <span key={x} className="rounded-lg border border-white/[0.08] bg-[#0D0F1A] px-2 py-1 text-white/65">{x}</span>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-[10px]">
                      <span className="rounded-md bg-blue-500/20 px-2 py-1 text-blue-300">in</span>
                      <span className="rounded-md bg-purple-500/20 px-2 py-1 text-purple-300">Apollo</span>
                      <span className="rounded-md bg-orange-500/20 px-2 py-1 text-orange-300">Reddit</span>
                      <span className="rounded-md bg-emerald-500/20 px-2 py-1 text-emerald-300">PH</span>
                    </div>
                  </div>
                )
              },
              {
                badge: "02 · LEADS & CLOSING",
                title: "Sarah fills your form. You get a Telegram ping.",
                body: "Every lead captured on your landing page lands in your Kanban. Live status, lead value, notes, and one-click actions: write a proposal or fire off a sequence.",
                mockup: (
                  <div className="space-y-2">
                    <div className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-300">
                      🔥 New lead: Sarah K. — $4,200
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-[#07080F] p-3 text-xs">
                      <p className="text-white/85">Sarah K. · New Lead</p>
                      <p className="mt-1 text-white/45">$4,200 · UX project</p>
                      <div className="mt-2 flex gap-2">
                        <span className="rounded-lg border border-white/15 px-2 py-1 text-white/65">Proposal</span>
                        <span className="rounded-lg border border-white/15 px-2 py-1 text-white/65">Sequence</span>
                      </div>
                    </div>
                  </div>
                )
              },
              {
                badge: "03 · PROPOSALS",
                title: "One click. AI writes a proposal Sarah signs.",
                body: "LACORE AI pulls your offer context, Sarah's message, and writes a full proposal with sections. Share a public link. She e-signs in 30 seconds. Status auto-updates.",
                mockup: (
                  <div className="rounded-2xl border border-white/[0.08] bg-[#07080F] p-3 text-xs">
                    <div className="space-y-2 text-white/65">
                      <div className="rounded-lg border border-white/[0.08] bg-[#0D0F1A] px-2 py-1">The Problem</div>
                      <div className="rounded-lg border border-white/[0.08] bg-[#0D0F1A] px-2 py-1">Our Approach</div>
                      <div className="rounded-lg border border-white/[0.08] bg-[#0D0F1A] px-2 py-1">Your Investment</div>
                    </div>
                    <div className="mt-2 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300">
                      ✍️ Signed by Sarah K.
                    </div>
                  </div>
                )
              },
              {
                badge: "04 · RETAIN",
                title: "Paid. Follow-up sequences start automatically.",
                body: "Stripe invoice sent from your dashboard. Client pays. LACORE triggers your onboarding sequence: welcome email, testimonial request, referral nudge — all written by AI, sent via Resend.",
                mockup: (
                  <div className="rounded-2xl border border-white/[0.08] bg-[#07080F] p-3 text-xs">
                    {[
                      { d: "Day 0", t: "Welcome email", s: "✓ Sent" },
                      { d: "Day 3", t: "Testimonial request", s: "✓ Sent" },
                      { d: "Day 14", t: "Referral nudge", s: "Pending" }
                    ].map((m) => (
                      <div key={m.t} className="mb-2 flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#0D0F1A] px-2 py-1">
                        <span className="text-white/65">{m.d}</span>
                        <span className="text-white/85">{m.t}</span>
                        <span className={m.s === "Pending" ? "text-white/45" : "text-emerald-300"}>{m.s}</span>
                      </div>
                    ))}
                  </div>
                )
              }
            ].map((item) => (
              <div key={item.badge} className="grid gap-4 rounded-2xl border border-white/[0.08] bg-[#0D0F1A] p-5 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-indigo-400">{item.badge}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{item.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-white/65">{item.body}</p>
                <div>{item.mockup}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="animate-on-scroll px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="font-plus-jakarta text-3xl font-bold tracking-tight text-white sm:text-4xl">9 modules. One sales OS.</h2>
            <p className="mt-3 text-white/45">Every tool you need. Built to work together.</p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { Icon: Sparkles, n: "Offer", d: "AI-generated positioning, headline, audience and pricing." },
              { Icon: Layout, n: "Landing page", d: "13 styles. Live page in 60 seconds. Custom domain." },
              { Icon: PenLine, n: "Content", d: "Posts for LinkedIn, IG, X, Threads — tailored to you." },
              { Icon: Users, n: "Leads & closing", d: "Kanban + AI closing scripts for every objection." },
              { Icon: FileText, n: "Proposals", d: "AI-written. E-signature. Shared public link." },
              { Icon: DollarSign, n: "Pricing strategy", d: "Optimal price points for your niche." },
              { Icon: Mail, n: "Sequences", d: "5 channels · Email, IG, LinkedIn, WhatsApp, Telegram." },
              { Icon: Search, n: "Prospects", d: "AI ICP + LinkedIn, Apollo, Reddit shortcuts." },
              { Icon: Send, n: "Outreach", d: "Cold DM and email scripts for every channel." }
            ].map((m) => (
              <div key={m.n} className="rounded-2xl border border-white/[0.08] bg-[#0D0F1A] p-6 transition-colors hover:border-indigo-500/30">
                <m.Icon size={18} className="text-indigo-400" />
                <p className="mt-3 text-lg font-semibold text-white">{m.n}</p>
                <p className="mt-1 text-sm text-white/65">{m.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="animate-on-scroll px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="mb-6 text-center font-plus-jakarta text-3xl font-bold tracking-tight text-white sm:text-4xl">
          The tools exist. The system doesn&apos;t.
        </h2>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-3">
          <div className="bg-[#0D0F1A] p-8 text-center sm:text-left">
            <p className="text-sm text-white/35">ChatGPT gives you</p>
            <p className="mt-3 text-3xl font-bold text-white/50">Text.</p>
            <p className="mt-2 text-sm text-white/35">But no pipeline.</p>
          </div>
          <div className="bg-[#0D0F1A] p-8 text-center sm:text-left">
            <p className="text-sm text-white/35">Notion + Calendly + Mailchimp</p>
            <p className="mt-3 text-3xl font-bold text-white/50">Busywork.</p>
            <p className="mt-2 text-sm text-white/35">But no system.</p>
          </div>
          <div className="border border-indigo-500/20 bg-indigo-500/10 p-8 text-center sm:text-left">
            <p className="text-sm text-white/45">LACORE gives you</p>
            <p className="mt-3 text-4xl font-bold text-indigo-400">Clients.</p>
            <p className="mt-2 text-sm text-white/45">The whole machine. One tab.</p>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-3 text-center text-xs font-medium uppercase tracking-widest text-indigo-400">
            Early results
          </div>
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            What happens when you use LACORE
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                metric: "$3,200",
                label: "first client deal",
                context: "Closed within 6 days of launching a landing page. Proposal written and signed in the same session.",
                who: "UX Designer · Berlin"
              },
              {
                metric: "4 leads",
                label: "in the first week",
                context: "Landing page live in 60 seconds. Shared on LinkedIn twice. All 4 leads came through the contact form.",
                who: "Business Coach · London"
              },
              {
                metric: "3× faster",
                label: "proposal turnaround",
                context: "From lead to sent proposal in under 2 minutes. Client said it was the most professional proposal they'd seen.",
                who: "Marketing Consultant · Dubai"
              }
            ].map((t) => (
              <div
                key={t.metric}
                className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#0D0F1A] p-7"
              >
                <div className="mb-4 text-5xl font-bold tracking-tight text-white">
                  {t.metric}
                </div>
                <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-indigo-400">
                  {t.label}
                </div>
                <p className="flex-1 text-sm leading-relaxed text-white/50">
                  {t.context}
                </p>
                <div className="mt-6 border-t border-white/[0.06] pt-4 text-xs text-white/25">
                  {t.who}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-white/20">
            Results from early users. Individual outcomes vary.
          </p>
        </div>
      </section>

      <HomePricingSection isLoggedIn={isLoggedIn} />

      <section className="animate-on-scroll px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center font-plus-jakarta text-3xl font-bold tracking-tight text-white sm:text-4xl">Common questions</h2>
          <div className="mt-6 space-y-2">
            {FAQ_ITEMS.map((item, idx) => {
              const open = openFaqIndex === idx;
              return (
                <div key={item.q} className="rounded-2xl border border-white/[0.08] bg-[#0D0F1A]">
                  <button
                    type="button"
                    role="button"
                    aria-expanded={open}
                    onClick={() => setOpenFaqIndex((prev) => (prev === idx ? null : idx))}
                    className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left"
                  >
                    <span className="text-sm font-medium text-white/85">{item.q}</span>
                    <ChevronDown size={16} className={`text-white/45 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open ? <p className="px-4 pb-4 text-sm leading-relaxed text-white/65">{item.a}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="cta-band" className="scroll-mt-20 px-4 pb-10 pt-8 sm:px-6 sm:pb-10 sm:pt-8">
        <div className="relative z-[1] mx-auto max-w-4xl overflow-hidden rounded-3xl border border-indigo-500/20 bg-indigo-500/[0.08] p-10 text-center sm:p-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.2),transparent_65%)]" />
          <div className="relative z-[2]">
            <h2 className="text-4xl font-bold tracking-tight text-white">Your AI sales team is ready.</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/45">Start free. Close your first client this week.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link href="/auth" className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-8 py-4 text-base font-medium text-white no-underline transition hover:bg-indigo-500 sm:w-auto">
                Start building free →
              </Link>
              <button
                type="button"
                onClick={() => scrollToId("product")}
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 px-7 py-4 text-base text-white/55 no-underline transition hover:border-white/25 hover:text-white/80 sm:w-auto"
              >
                See the product
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-[1] border-t border-white/5 px-6 py-8 text-xs text-white/25 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Logo size="md" variant="dark" href="/" />
            <p className="mt-3 max-w-xs text-white/25">Your business. Our sales machine.</p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end sm:text-right">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <Link href="/privacy" className="text-white/25 no-underline transition hover:text-white/50">
                Privacy
              </Link>
              <span aria-hidden className="text-white/15">·</span>
              <Link href="/terms" className="text-white/25 no-underline transition hover:text-white/50">
                Terms
              </Link>
              <span aria-hidden className="text-white/15">·</span>
              <Link href="/cookies" className="text-white/25 no-underline transition hover:text-white/50">
                Cookies
              </Link>
            </div>
            <p>© 2026 Relova AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
      <style jsx>{`
        .home-demo-line {
          opacity: 0;
          animation: lineFadeIn 0.6s ease forwards;
        }
        @keyframes lineFadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
