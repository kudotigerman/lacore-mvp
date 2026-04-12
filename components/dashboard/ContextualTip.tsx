"use client";

export function ContextualTip({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-indigo-500/15 bg-indigo-500/5 p-4">
      <span className="text-lg">{icon}</span>
      <p className="text-sm leading-relaxed text-white/60">{text}</p>
    </div>
  );
}
