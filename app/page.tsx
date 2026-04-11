"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

const PLACEHOLDER_EXAMPLES = [
  "I coach founders on building high-performance teams...",
  "I'm a UX designer who helps SaaS startups...",
  "I help e-commerce brands grow with paid ads...",
  "I'm a copywriter specializing in B2B SaaS..."
];

function IconOffer() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M4 4h12v2H4V4zm0 4h12v2H4V8zm0 4h8v2H4v-2z"
        fill="currentColor"
        className="text-indigo-400"
      />
    </svg>
  );
}

function IconLanding() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-sky-400" />
      <path d="M6 8h8M6 11h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-sky-400" />
    </svg>
  );
}

function IconLeads() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400" />
      <circle cx="13" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400" />
      <path
        d="M4 16c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5M12 16c0-1.2 1-2.2 2.3-2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="text-emerald-400"
      />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M6 10l2.5 2.5L14 7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-amber-400"
      />
    </svg>
  );
}

export default function HomePage() {
  const [heroInput, setHeroInput] = useState("");
  const [phIndex, setPhIndex] = useState(0);
  const [phVisible, setPhVisible] = useState(true);

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

  function scrollToId(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleHeroSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!heroInput.trim()) return;
    window.location.assign("/auth");
  }

  const showPlaceholderOverlay = !heroInput.trim();

  return (
    <main className="min-h-screen bg-[#07080F] text-white antialiased" style={{ fontFamily: "var(--font-geist-sans), Inter, system-ui, sans-serif" }}>
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#07080F]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="font-plus-jakarta text-sm font-medium tracking-[0.1em] text-white no-underline"
          >
            LACORE
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <button
              type="button"
              onClick={() => scrollToId("how-it-works")}
              className="text-sm text-white/55 transition hover:text-white/90"
            >
              How it works
            </button>
            <button
              type="button"
              onClick={() => scrollToId("pricing")}
              className="text-sm text-white/55 transition hover:text-white/90"
            >
              Pricing
            </button>
            <Link href="/blog" className="text-sm text-white/55 no-underline transition hover:text-white/90">
              Blog
            </Link>
          </div>
          <Link
            href="/dashboard/offer"
            className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white no-underline transition hover:bg-indigo-500 sm:px-4 sm:text-sm"
          >
            Go to dashboard →
          </Link>
        </div>
      </nav>

      {/* Hero */}
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
        <div className="relative z-[1] mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs text-indigo-300">
            <span aria-hidden>✦</span>
            <span>AI sales system for freelancers &amp; consultants</span>
          </div>
          <h1 className="font-plus-jakarta mt-8 text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="block text-white">You say what you sell.</span>
            <span className="mt-1 block bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
              LACORE does the rest.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-white/50">
            From offer to first client — in 60 minutes.
            <br className="hidden sm:block" />
            <span className="sm:ml-0"> No marketing degree. No design skills. No guesswork.</span>
          </p>

          <form onSubmit={handleHeroSubmit} className="mx-auto mt-10 max-w-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <div className="relative min-w-0 flex-1">
                <input
                  type="text"
                  value={heroInput}
                  onChange={(e) => setHeroInput(e.target.value)}
                  placeholder=" "
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm text-white placeholder:text-white/25 focus:border-indigo-500/50 focus:outline-none"
                  aria-label="Describe what you sell"
                />
                {showPlaceholderOverlay ? (
                  <span
                    className={`pointer-events-none absolute left-5 top-1/2 max-w-[calc(100%-2.5rem)] -translate-y-1/2 truncate text-sm text-white/25 hero-placeholder-layer ${phVisible ? "" : "hero-placeholder-layer--out"}`}
                  >
                    {PLACEHOLDER_EXAMPLES[phIndex]}
                  </span>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={!heroInput.trim()}
                className="whitespace-nowrap rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Build my sales machine →
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-white/30">
              <span className="text-amber-400/90">★★★★★</span>
              {" "}Joined by 2,400+ freelancers · designers · consultants · coaches
            </p>
          </form>
        </div>
      </section>

      {/* Product preview */}
      <section id="product-preview" className="relative z-[1] px-4 sm:px-6">
        <div className="mx-auto mt-8 max-w-5xl rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/5 to-transparent px-3 pb-3 sm:mt-10 sm:px-0 sm:pb-0">
          <div className="overflow-hidden rounded-xl border border-white/[0.08] sm:rounded-2xl">
            <div className="flex items-center gap-2 border-b border-white/[0.06] bg-black/40 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
              <span className="ml-2 truncate rounded-md bg-white/5 px-3 py-1 text-[11px] text-white/35">lacore.ai/dashboard/landing</span>
            </div>
            <div className="flex min-h-[280px] flex-col md:flex-row">
              <aside className="w-full shrink-0 border-white/[0.06] bg-black/30 p-5 md:w-[220px] md:border-r">
                <p className="font-plus-jakarta text-[10px] font-medium tracking-[0.12em] text-white/40">LACORE</p>
                <div className="mt-4 rounded-lg border border-white/[0.08] bg-white/5 px-3 py-2 text-xs text-white/70">
                  Project 1 <span className="text-white/35">▾</span>
                </div>
                <ul className="mt-4 space-y-1 text-[11px] font-medium tracking-wide text-white/80">
                  <li className="flex items-center justify-between rounded-lg px-2 py-2">
                    <span>01 OFFER</span>
                    <span className="text-xs text-emerald-400">✓ done</span>
                  </li>
                  <li className="rounded-lg bg-indigo-500/15 px-2 py-2 text-indigo-300">02 LANDING PAGE</li>
                  <li className="px-2 py-2 text-white/25">03 CONTENT</li>
                  <li className="px-2 py-2 text-white/25">04 LEADS &amp; CLOSING</li>
                </ul>
                <div className="my-4 h-px bg-white/[0.06]" />
                <p className="text-[10px] font-medium tracking-wider text-white/25">ANALYTICS</p>
              </aside>
              <div className="flex-1 p-5 sm:p-8">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-indigo-400">STEP 2 OF 4</p>
                <h3 className="text-[19px] font-semibold text-white sm:text-[21px]">Build your landing page</h3>
                <p className="mb-4 text-[15px] text-white/40">Your offer is ready. Now create the page that converts.</p>
                <div className="mb-4 h-1.5 w-full rounded-full bg-white/[0.08]">
                  <div className="h-full w-[35%] rounded-full bg-indigo-500" />
                </div>
                <div className="mb-4 rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-white/30">OFFER</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-white/80">
                    I help SaaS startups redesign their product UX to reduce churn — in 3 weeks, fixed price.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-[13px] font-medium text-white">Generate landing page →</span>
                  <span className="inline-flex rounded-xl border border-white/15 px-4 py-2 text-[13px] font-medium text-white/55">Edit offer</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos */}
      <div className="mx-auto max-w-5xl border-y border-white/5 py-6 text-center">
        <p className="text-xs text-white/20">Trusted by freelancers and consultants from</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 px-4 text-sm font-medium tracking-wide text-white/35">
          {["Upwork", "Toptal", "Fiverr", "LinkedIn", "99designs", "Clutch"].map((name, i) => (
            <span key={name} className="inline-flex items-center gap-x-2">
              {i > 0 ? (
                <span className="select-none text-white/25" aria-hidden>
                  ·
                </span>
              ) : null}
              <span>{name}</span>
            </span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 px-4 py-10 sm:px-6 sm:py-10">
        <div className="animate-on-scroll mx-auto max-w-5xl text-center">
          <div className="mx-auto inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-white/45">
            How it works
          </div>
          <h2 className="font-plus-jakarta mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">4 steps from idea to paying clients</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-white/45 sm:text-base">
            LACORE turns what you do into a complete sales system — automatically.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: "01",
                title: "Define your offer",
                body: "Tell us what you do. AI writes your positioning, headline, audience and pricing in 30 seconds.",
                Icon: IconOffer,
                box: "bg-indigo-500/15 text-indigo-400"
              },
              {
                n: "02",
                title: "Get a landing page",
                body: "Your public sales page is built and live in 60 seconds. No designer needed.",
                Icon: IconLanding,
                box: "bg-sky-500/15 text-sky-400"
              },
              {
                n: "03",
                title: "Attract leads",
                body: "AI generates posts for Instagram, LinkedIn, X. Share content, drive traffic, capture emails.",
                Icon: IconLeads,
                box: "bg-emerald-500/15 text-emerald-400"
              },
              {
                n: "04",
                title: "Close deals",
                body: "Get AI scripts for every lead — DMs, objections, follow-ups. Close faster, earn more.",
                Icon: IconClose,
                box: "bg-amber-500/15 text-amber-400"
              }
            ].map((card, i, arr) => {
              const Icon = card.Icon;
              return (
                <div
                  key={card.n}
                  className="relative bg-[#0D0F1A] p-7 text-left"
                >
                  <p className="text-xs font-semibold text-white/25">{card.n}</p>
                  <div className={`mt-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.box}`}>
                    <Icon />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-white">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/45">{card.body}</p>
                  {i < arr.length - 1 ? (
                    <span className="pointer-events-none absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-1/2 text-lg text-white/20 lg:block" aria-hidden>
                      →
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <h2 className="mb-6 text-center font-plus-jakarta text-3xl font-bold tracking-tight text-white sm:text-4xl">
          The tools exist. The clients don&apos;t.
        </h2>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-3">
          <div className="bg-[#0D0F1A] p-8 text-center sm:text-left">
            <p className="text-sm text-white/35">ChatGPT gives you</p>
            <p className="mt-3 text-2xl font-bold text-white/50 sm:text-3xl">Text.</p>
            <p className="mt-2 text-sm text-white/35">But not a system.</p>
          </div>
          <div className="bg-[#0D0F1A] p-8 text-center sm:text-left">
            <p className="text-sm text-white/35">Webflow gives you</p>
            <p className="mt-3 text-2xl font-bold text-white/50 sm:text-3xl">A website.</p>
            <p className="mt-2 text-sm text-white/35">But not clients.</p>
          </div>
          <div className="border border-indigo-500/20 bg-indigo-500/10 p-8 text-center sm:text-left">
            <p className="text-sm text-white/45">LACORE gives you</p>
            <p className="mt-3 text-4xl font-bold text-indigo-400 sm:text-5xl">Clients.</p>
            <p className="mt-2 text-sm text-white/45">The whole system. Automated.</p>
          </div>
        </div>
      </section>

      {/* Bento */}
      <section className="animate-on-scroll px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-plus-jakarta text-center text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            Everything you need to go from freelancer to booked.
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2 rounded-2xl border border-white/[0.07] bg-[#13151F] p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-white sm:text-xl">Your landing page — live in 60 seconds</h3>
              <p className="mt-2 text-sm text-white/45">
                AI generates a full sales page from your offer. Share the link, start getting leads.
              </p>
              <div className="mt-6 rounded-xl border border-white/[0.08] bg-black/40 p-5">
                <p className="text-base font-bold text-white sm:text-lg">Stop Losing Clients to Cheaper Designers</p>
                <p className="mt-2 text-sm text-white/50">
                  I help SaaS startups fix UX that kills retention — 3 weeks, guaranteed.
                </p>
                <span className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white">Book a free call →</span>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                {[
                  { k: "347", l: "Page views" },
                  { k: "12", l: "Leads" },
                  { k: "$8,400", l: "Revenue won" }
                ].map((s) => (
                  <div key={s.l} className="flex-1 rounded-xl border border-white/[0.06] bg-black/20 px-5 py-3 text-center sm:text-left">
                    <p className="text-xl font-bold text-white">{s.k}</p>
                    <p className="text-xs text-white/35">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#13151F] p-6">
              <h3 className="text-lg font-semibold text-white">Content that drives traffic</h3>
              <p className="mt-2 text-sm text-white/45">Generate posts for any platform in seconds.</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-white/[0.06] bg-black/30 p-3 text-xs">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-400/90">LinkedIn · Hook post</p>
                  <p className="mt-2 text-white/60">
                    &quot;I redesigned 47 SaaS dashboards. Here&apos;s the mistake that kills retention every time...&quot;
                  </p>
                  <span className="mt-2 inline-block text-indigo-400">Generate →</span>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-black/30 p-3 text-xs">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">X / Twitter · Value post</p>
                  <p className="mt-2 text-white/60">&quot;Your landing page isn&apos;t converting because...&quot;</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#13151F] p-6">
              <h3 className="text-lg font-semibold text-white">Close every lead with AI scripts</h3>
              <p className="mt-2 text-sm text-white/45">
                Personalized DM scripts, objection handlers, and follow-ups for each lead.
              </p>
              <div className="mt-4 rounded-lg border border-white/[0.06] bg-black/30 p-4 text-xs">
                <p className="text-white/70">
                  <span className="font-medium text-white">Maria S.</span>
                  <span className="text-white/35"> · New lead · </span>
                  <span className="text-amber-400/90">&quot;Too expensive&quot;</span>
                </p>
                <div className="my-3 h-px bg-white/[0.08]" />
                <p className="leading-relaxed text-white/50">
                  <span className="text-white/35">AI script: </span>
                  &quot;Maria, I totally understand the concern. Let me show you exactly what you&apos;re getting for that investment — most clients see ROI in month one...&quot;
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-md border border-white/15 px-3 py-1.5 text-[11px] text-white/55">Copy script</span>
                  <span className="rounded-md bg-indigo-600 px-3 py-1.5 text-[11px] font-medium text-white">Reply →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="animate-on-scroll px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              quote: "LACORE helped me land my first $3,000 client in week one.",
              initials: "AK",
              name: "Alex K.",
              role: "Freelance Designer · 🇺🇸",
              bg: "bg-indigo-600"
            },
            {
              quote: "From zero online presence to 5 inbound leads in 2 weeks.",
              initials: "MS",
              name: "Maria S.",
              role: "Business Consultant · 🇪🇸",
              bg: "bg-sky-600"
            },
            {
              quote: "3 Calendly bookings the same day I launched.",
              initials: "JT",
              name: "James T.",
              role: "Executive Coach · 🇬🇧",
              bg: "bg-violet-600"
            }
          ].map((t) => (
            <div key={t.initials} className="rounded-2xl border border-white/[0.12] bg-white/[0.03] p-6">
              <p className="text-amber-400">★★★★★</p>
              <p className="mt-3 text-sm leading-relaxed text-white/60">&quot;{t.quote}&quot;</p>
              <div className="mt-5 flex items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${t.bg}`}>{t.initials}</div>
                <div>
                  <p className="text-sm font-bold text-white">{t.name}</p>
                  <p className="text-xs text-white/35">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section id="pricing" className="scroll-mt-20 px-4 pb-10 pt-8 sm:px-6 sm:pb-10 sm:pt-8">
        <div className="relative z-[1] mx-auto max-w-4xl overflow-hidden rounded-3xl border border-indigo-500/20 bg-indigo-500/[0.08] p-10 text-center sm:p-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.2),transparent_65%)]" />
          <div className="relative z-[2]">
            <h2 className="text-4xl font-bold tracking-tight text-white">Ready to build your sales machine?</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/45">Join 2,400+ freelancers already getting leads on autopilot.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/auth"
                className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-8 py-4 text-base font-medium text-white no-underline transition hover:bg-indigo-500 sm:w-auto"
              >
                Start free — takes 10 min →
              </Link>
              <Link
                href="#product-preview"
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 px-7 py-4 text-base text-white/55 no-underline transition hover:border-white/25 hover:text-white/80 sm:w-auto"
              >
                See examples
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-[1] border-t border-white/5 px-6 py-8 text-xs text-white/25 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-plus-jakarta text-sm font-medium tracking-[0.1em] text-white/80">LACORE</p>
            <p className="mt-2 max-w-xs">Your business. Our sales machine.</p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end sm:text-right">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <Link href="/privacy" className="text-white/25 no-underline transition hover:text-white/50">
                Privacy
              </Link>
              <span aria-hidden className="text-white/15">
                ·
              </span>
              <Link href="/terms" className="text-white/25 no-underline transition hover:text-white/50">
                Terms
              </Link>
              <span aria-hidden className="text-white/15">
                ·
              </span>
              <Link href="/cookies" className="text-white/25 no-underline transition hover:text-white/50">
                Cookies
              </Link>
            </div>
            <p>© 2026 LACORE. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
