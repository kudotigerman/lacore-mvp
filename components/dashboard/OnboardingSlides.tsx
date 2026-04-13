"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { getSupabaseClient } from "@/lib/supabase";

const ONBOARDING_KEY = "lacore_onboarding_done";

const ROLE_OPTIONS = [
  "Designer",
  "Consultant",
  "Coach",
  "Developer",
  "Agency",
  "Real Estate Agent"
] as const;

export default function OnboardingSlides({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [roleSaved, setRoleSaved] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  function finishAndDismiss() {
    try {
      localStorage.setItem(ONBOARDING_KEY, "true");
    } catch {
      /* ignore */
    }
    onClose();
  }

  function handleSkip() {
    finishAndDismiss();
  }

  function handleStartBuilding() {
    finishAndDismiss();
    router.push("/dashboard/offer");
  }

  async function handleSelectRole(role: string) {
    setRoleError(null);
    setRoleSaving(true);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setRoleError("Sign in required.");
        return;
      }
      const { error } = await supabase.from("profiles").update({ role }).eq("user_id", session.user.id);
      if (error) {
        setRoleError(error.message);
        return;
      }
      setRoleSaved(true);
    } catch {
      setRoleError("Could not save. Try again.");
    } finally {
      setRoleSaving(false);
    }
  }

  const steps = [
    { icon: "✦", title: "Define your offer", desc: "AI crafts your positioning in 30 seconds" },
    { icon: "⬡", title: "Build your sales page", desc: "Live landing page ready to share" },
    { icon: "◈", title: "Get leads & close deals", desc: "Content, proposals, DM scripts — all automated" }
  ];

  const slides = [
    <div key="1" className="text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20">
        <Logo size="md" href={false} variant="dark" />
      </div>
      <h2 className="mb-3 text-2xl font-bold text-white">Welcome to LACORE</h2>
      <p className="mx-auto max-w-sm text-base text-white/50">
        Your AI sales system. From offer to first client — in under 60 minutes.
      </p>
    </div>,

    <div key="2" className="w-full px-1">
      <h2 className="mb-6 text-center text-lg font-semibold text-white">How it works</h2>
      <div className="space-y-5">
        {steps.map((s) => (
          <div key={s.title} className="flex gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-lg text-indigo-300">
              {s.icon}
            </span>
            <div>
              <p className="font-medium text-white">{s.title}</p>
              <p className="mt-1 text-sm text-white/45">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>,

    <div key="3" className="text-center">
      <p className="mb-2 text-5xl font-bold text-indigo-400">20</p>
      <p className="mb-4 text-lg text-white">Free credits to start</p>
      <div className="mx-auto max-w-xs space-y-2 text-left">
        {[
          "5 credits — Generate offer",
          "3 credits — Generate proposal",
          "2 credits — Pricing strategy",
          "3 credits — Write post sequence",
          "2 credits — Cold outreach message"
        ].map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm text-white/60">
            <span className="text-indigo-400">✓</span>
            {item}
          </div>
        ))}
      </div>
    </div>,

    <div key="4" className="w-full px-0">
      <h2 className="mb-4 text-center text-lg font-semibold text-white">What best describes you?</h2>
      <div className="grid grid-cols-2 gap-2">
        {ROLE_OPTIONS.map((label) => (
          <button
            key={label}
            type="button"
            disabled={roleSaving || roleSaved}
            onClick={() => void handleSelectRole(label)}
            className={`rounded-xl border px-2 py-2.5 text-center text-xs font-medium transition-colors disabled:cursor-default ${
              roleSaved
                ? "border-white/10 bg-white/[0.04] text-white/35"
                : "border-white/15 bg-white/[0.04] text-white/80 hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {roleError ? <p className="mt-3 text-center text-xs text-red-400">{roleError}</p> : null}
      {roleSaving ? <p className="mt-3 text-center text-xs text-white/40">Saving…</p> : null}
      {roleSaved ? (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleStartBuilding}
            className="rounded-xl bg-indigo-600 px-10 py-4 text-base font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Start building →
          </button>
        </div>
      ) : null}
    </div>,

    <div key="5" className="text-center">
      <h2 className="mb-3 text-2xl font-bold text-white">Ready to get your first client?</h2>
      <p className="mb-8 text-white/50">Start by defining what you sell. Takes 2 minutes.</p>
      <button
        type="button"
        onClick={handleStartBuilding}
        className="rounded-xl bg-indigo-600 px-10 py-4 text-base font-medium text-white transition-colors hover:bg-indigo-500"
      >
        Start building →
      </button>
    </div>
  ];

  const dotIndices = slides.map((_, i) => i);

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0D0F1A] p-8">
        <div className="mb-8 flex justify-center gap-2">
          {dotIndices.map((i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === currentSlide ? "w-8 bg-indigo-500" : "w-2 bg-white/15"
              }`}
            />
          ))}
        </div>

        <div className="flex min-h-[240px] items-center justify-center">{slides[currentSlide]}</div>

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-white/30 transition-colors hover:text-white/60"
          >
            Skip
          </button>
          {currentSlide === 3 && !roleSaved ? (
            <span className="text-xs text-white/30">Choose a role to continue</span>
          ) : null}
          {currentSlide <= 2 ? (
            <button
              type="button"
              onClick={() => setCurrentSlide((s) => s + 1)}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Continue →
            </button>
          ) : null}
          {currentSlide === 3 && roleSaved ? (
            <button
              type="button"
              onClick={() => setCurrentSlide(4)}
              className="text-sm text-white/40 transition-colors hover:text-white/65"
            >
              One more tip →
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export { ONBOARDING_KEY };
