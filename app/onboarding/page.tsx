"use client";

import { FormEvent, useMemo, useState } from "react";

type Offer = {
  offer: string;
  audience: string;
  pricing: string;
  positioning: string;
  headline: string;
};

type Message = {
  role: "assistant" | "user";
  text: string;
};

const firstMessage =
  "Hi! Tell me what you sell, who your clients are, and how much you want to earn per month. One paragraph is enough.";

export default function OnboardingPage() {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: firstMessage }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);

  const canSubmit = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setOffer(null);
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/generate-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput: trimmed })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to generate offer.");
      }

      setOffer(data.offer);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Your offer is ready. Review it below." }
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "I couldn't generate your offer. Please try again." }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#05070d] text-slate-100">
      <div className="mx-auto flex h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-6">
        <div className="mb-4 border-b border-slate-800 pb-4">
          <h1 className="text-xl font-semibold text-white">LACORE Onboarding</h1>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          {messages.map((message, idx) => (
            <div
              key={`${message.role}-${idx}`}
              className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:text-base ${
                message.role === "assistant"
                  ? "bg-slate-800 text-slate-100"
                  : "ml-auto bg-cyan-500 text-slate-950"
              }`}
            >
              {message.text}
            </div>
          ))}

          {loading && (
            <div className="max-w-[90%] rounded-2xl bg-slate-800 px-4 py-3 text-sm text-slate-200 sm:text-base">
              LACORE is building your offer...
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          {offer && (
            <section className="mt-6 rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-5 shadow-[0_0_0_1px_rgba(6,182,212,0.12)]">
              <h2 className="text-lg font-semibold text-cyan-400">Your Offer</h2>
              <div className="mt-4 space-y-3 text-sm sm:text-base">
                <p>
                  <span className="font-medium text-slate-300">Offer:</span> {offer.offer}
                </p>
                <p>
                  <span className="font-medium text-slate-300">Audience:</span> {offer.audience}
                </p>
                <p>
                  <span className="font-medium text-slate-300">Pricing:</span> {offer.pricing}
                </p>
                <p>
                  <span className="font-medium text-slate-300">Positioning:</span> {offer.positioning}
                </p>
                <p>
                  <span className="font-medium text-slate-300">Headline:</span> {offer.headline}
                </p>
              </div>

              <button
                type="button"
                disabled
                className="mt-6 inline-flex cursor-not-allowed items-center rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-500"
              >
                Continue →
              </button>
            </section>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type your business in one paragraph..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}
