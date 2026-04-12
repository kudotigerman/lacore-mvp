const guides = [
  {
    title: "How to get your first client in 7 days",
    steps: [
      "Day 1: Define your offer (30 min)",
      "Day 2: Generate your landing page",
      "Day 3-4: Create 5 posts and share them",
      "Day 5: Send 10 cold DMs using Outreach tool",
      "Day 6-7: Follow up with sequences"
    ]
  },
  {
    title: "How to price yourself confidently",
    steps: [
      "Use Pricing Strategy tool to get your number",
      "Add 20% — you'll negotiate down anyway",
      "Present 3 tiers, not 1 price",
      "Never apologize for your price"
    ]
  },
  {
    title: "How to turn a lead into a client",
    steps: [
      "Respond within 1 hour of lead coming in",
      "Ask 3 qualifying questions",
      "Generate a proposal (Proposals tool)",
      "Send it within 24h",
      "Follow up after 48h of no response"
    ]
  },
  {
    title: "What to post to get inbound leads",
    steps: [
      "Hook post: your biggest client result",
      "Value post: teach something from your expertise",
      "Story post: before/after transformation",
      "Offer post: direct CTA to your landing page",
      "Repeat weekly on 2-3 platforms"
    ]
  }
];

export default function PlaybookPage() {
  return (
    <div className="min-h-full" style={{ background: "var(--content-bg)" }}>
      <div className="max-w-2xl">
        <h1 className="mb-1 text-2xl font-bold text-white">Playbook</h1>
        <p className="mb-8 text-sm text-white/40">Proven strategies to get clients with LACORE</p>

        {guides.map((guide, i) => (
          <div key={i} className="mb-6 rounded-2xl border border-white/8 bg-white/[0.03] p-6">
            <h3 className="mb-4 text-base font-semibold text-white">{guide.title}</h3>
            <div className="space-y-2">
              {guide.steps.map((step, j) => (
                <div key={j} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] text-indigo-400">
                    {j + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-white/65">{step}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
