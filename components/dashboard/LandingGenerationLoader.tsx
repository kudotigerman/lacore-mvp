"use client";

export function LandingGenerationLoader({ currentStep }: { currentStep: string }) {
  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#07080F]">
      <div className="relative mb-10 h-20 w-20">
        <div
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin"
          aria-hidden
        />
        <div className="relative flex h-full w-full items-center justify-center">
          <div className="flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-indigo-600/20">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600/40">
              <svg
                className="h-6 w-6 text-indigo-400"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path
                  d="M12 2l1.09 3.36L16.5 4.5l-1.86 2.86L18 10l-3.36-.91L12 13l-1.09-3.91L7.5 10l1.86-2.64L4.5 4.5l3.41.86L12 2z"
                  fill="currentColor"
                  opacity="0.9"
                />
                <path
                  d="M5 19l.84-2.58L8.5 15.5l-1.43 2.2L10 20l-2.58-.7L5 22l-.7-2.58L1.5 20l2.2-1.43L2.5 15.5l2.58.84L5 19z"
                  fill="currentColor"
                  opacity="0.55"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <h2 className="mb-2 text-xl font-semibold text-white">Building your landing page</h2>
      <p className="mb-8 max-w-xs text-center text-sm text-white/40">
        AI is crafting a high-converting page based on your offer
      </p>

      <div className="h-1 w-64 overflow-hidden rounded-full bg-white/10">
        <div className="lacore-landing-gen-progress-bar h-full rounded-full bg-indigo-500" />
      </div>

      <p className="mt-4 text-center text-xs text-white/30 transition-all">{currentStep}</p>
    </div>
  );
}
