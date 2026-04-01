import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05070d] px-6">
      <section className="mx-auto w-full max-w-3xl text-center">
        <p className="mb-6 inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1 text-xs uppercase tracking-[0.2em] text-cyan-400">
          LACORE
        </p>
        <h1 className="text-balance text-4xl font-semibold leading-tight text-white sm:text-6xl">
          You say what you sell. LACORE does the rest.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300 sm:text-xl">
          From idea to first client. Automatically.
        </p>
        <div className="mt-10">
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-6 py-3 text-base font-medium text-slate-950 transition hover:bg-cyan-400"
          >
            Start for free
          </Link>
        </div>
      </section>
    </main>
  );
}
