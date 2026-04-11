"use client";

import Link from "next/link";
import type { ReactNode } from "react";

function progressEncouragement(completedCount: number): string {
  if (completedCount <= 0) return "Start with Step 1";
  if (completedCount === 1) return "1 step done · 2 to go";
  if (completedCount === 2) return "Halfway there!";
  return "All done! 🎉";
}

export function DashboardStepShell({
  stepNum,
  completedCount,
  title,
  subtitle,
  isStepDone,
  nextStepLabel,
  nextStepHref,
  right,
  children
}: {
  stepNum: 1 | 2 | 3 | 4;
  completedCount: number;
  title: string;
  subtitle: string;
  isStepDone?: boolean;
  nextStepLabel?: string;
  nextStepHref?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-widest text-indigo-400/90">
            Step {stepNum}
          </span>
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] text-white/30">{progressEncouragement(completedCount)}</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 text-2xl font-semibold text-white">{title}</h1>
            <p className="text-sm text-white/45">{subtitle}</p>
          </div>
          {right}
        </div>
      </div>

      {isStepDone && nextStepLabel && nextStepHref ? (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-indigo-500/20 bg-indigo-500/8 p-4">
          <div>
            <p className="text-sm font-medium text-indigo-300">Step {stepNum} complete!</p>
            <p className="mt-0.5 text-xs text-white/45">Next: {nextStepLabel}</p>
          </div>
          <Link
            href={nextStepHref}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-indigo-500"
          >
            Continue →
          </Link>
        </div>
      ) : null}

      {children}
    </>
  );
}
