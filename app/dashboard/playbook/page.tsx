"use client";

import Link from "next/link";
import { useState } from "react";

type Step = {
  day?: string;
  action: string;
  desc: string;
  link?: string;
  linkLabel?: string;
};

type Guide = {
  id: string;
  title: string;
  icon: string;
  steps: Step[];
};

const guides: Guide[] = [
  {
    id: "first-client",
    title: "Get your first client in 7 days",
    icon: "🚀",
    steps: [
      {
        day: "Day 1",
        action: "Define your offer",
        desc: "AI crafts your positioning in 30 seconds",
        link: "/dashboard/offer",
        linkLabel: "Go to Offer →"
      },
      {
        day: "Day 2",
        action: "Build your landing page",
        desc: "Live sales page ready to share",
        link: "/dashboard/landing",
        linkLabel: "Build landing →"
      },
      {
        day: "Day 3-4",
        action: "Create 5 posts and share them",
        desc: "AI writes posts for Instagram, LinkedIn, Telegram",
        link: "/dashboard/content",
        linkLabel: "Create content →"
      },
      {
        day: "Day 5",
        action: "Send 10 cold outreach messages",
        desc: "Personalized first messages for each prospect",
        link: "/dashboard/outreach",
        linkLabel: "Write outreach →"
      },
      {
        day: "Day 6-7",
        action: "Follow up with sequences",
        desc: "Multi-step follow-up that doesn't feel salesy",
        link: "/dashboard/sequences",
        linkLabel: "Create sequence →"
      }
    ]
  },
  {
    id: "pricing",
    title: "Price yourself confidently",
    icon: "💰",
    steps: [
      {
        action: "Run the pricing analysis",
        desc: "AI compares your rate to market and tells you exactly what to charge",
        link: "/dashboard/pricing-strategy",
        linkLabel: "Get your price →"
      },
      {
        action: "Add 20% buffer",
        desc: "Clients always negotiate. Start higher so you land where you want."
      },
      {
        action: "Present 3 tiers, not 1 price",
        desc: "Starter / Core / Premium. Middle tier gets chosen 60% of the time."
      },
      {
        action: "Never apologize for your price",
        desc: "Silence after stating your price is powerful. Let them respond first."
      }
    ]
  },
  {
    id: "lead-to-client",
    title: "Turn a lead into a paying client",
    icon: "🤝",
    steps: [
      {
        action: "Respond within 1 hour",
        desc: "Speed is your biggest competitive advantage. First to respond wins 86% of the time."
      },
      {
        action: "Ask 3 qualifying questions",
        desc: "What's the problem? What have you tried? What's the cost of not fixing it?"
      },
      {
        action: "Generate a proposal",
        desc: "AI writes a personalized proposal in 30 seconds",
        link: "/dashboard/proposals",
        linkLabel: "Create proposal →"
      },
      {
        action: "Send within 24 hours",
        desc: "Every hour you wait, their enthusiasm drops 10%."
      },
      {
        action: "Follow up after 48h",
        desc: "If no response, send a sequence to re-engage",
        link: "/dashboard/sequences",
        linkLabel: "Write follow-up →"
      }
    ]
  },
  {
    id: "content",
    title: "What to post to get inbound leads",
    icon: "📱",
    steps: [
      {
        action: "Hook post — your biggest result",
        desc: '"I helped a client go from 0 to $10K/month in 60 days. Here\'s exactly what we did."',
        link: "/dashboard/content",
        linkLabel: "Generate this post →"
      },
      {
        action: "Value post — teach something",
        desc: "Share one specific insight from your expertise. Generous content builds trust.",
        link: "/dashboard/content",
        linkLabel: "Generate this post →"
      },
      {
        action: "Story post — before/after",
        desc: "Your own transformation or a client's. Emotion drives action.",
        link: "/dashboard/content",
        linkLabel: "Generate this post →"
      },
      {
        action: "Offer post — direct CTA",
        desc: '"If you want the same results, here\'s how to work with me." + link to your landing page.',
        link: "/dashboard/content",
        linkLabel: "Generate this post →"
      }
    ]
  }
];

export default function PlaybookPage() {
  const [open, setOpen] = useState<string | null>("first-client");

  return (
    <div className="min-h-full" style={{ background: "var(--content-bg)" }}>
      <div className="max-w-2xl">
        <h1 className="mb-1 text-2xl font-bold text-white">Playbook</h1>
        <p className="mb-8 text-sm text-white/40">Proven strategies to get clients with LACORE</p>

        {guides.map((guide) => {
          const isOpen = open === guide.id;
          return (
            <div key={guide.id} className="mb-4">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : guide.id)}
                className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] p-5 transition-colors hover:border-white/15"
              >
                <div className="flex items-center gap-3 text-left">
                  <span className="text-2xl">{guide.icon}</span>
                  <span className="text-base font-semibold text-white">{guide.title}</span>
                </div>
                <span className="text-xs text-white/30">{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen ? (
                <div className="-mt-1 overflow-hidden rounded-b-2xl border border-t-0 border-white/8">
                  {guide.steps.map((step, j) => (
                    <div
                      key={`${guide.id}-${j}`}
                      className="flex gap-4 border-b border-white/5 px-5 py-4 last:border-0 hover:bg-white/[0.02]"
                    >
                      {step.day ? (
                        <span className="mt-0.5 w-12 flex-shrink-0 text-xs text-indigo-400">{step.day}</span>
                      ) : (
                        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] text-indigo-400">
                          {j + 1}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="mb-0.5 text-sm font-medium text-white">{step.action}</p>
                        <p className="text-xs leading-relaxed text-white/50">{step.desc}</p>
                        {step.link && step.linkLabel ? (
                          <Link
                            href={step.link}
                            className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-400 transition-colors hover:text-indigo-300"
                          >
                            {step.linkLabel}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
