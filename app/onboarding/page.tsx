"use client";

import { FormEvent, useMemo, useState } from "react";

type Offer = {
  offer: string;
  audience: string;
  pricing: string;
  positioning: string;
  headline: string;
};

type ApiVariant = Offer & { variant?: string };

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

      if (!Array.isArray(data.variants) || data.variants.length < 1) {
        throw new Error("Invalid response from server.");
      }
      const list = data.variants as ApiVariant[];
      const picked = list.find((x) => x.variant === "A") ?? list[0];
      setOffer({
        offer: picked.offer,
        audience: picked.audience,
        pricing: picked.pricing,
        positioning: picked.positioning,
        headline: picked.headline
      });
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
    <main className="min-h-screen bg-[#09090B] text-[#F4F4F5]">
      <div className="mx-auto flex h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6">
        <div className="mb-5">
          <p className="font-mono text-xs uppercase tracking-[0.34em] text-cyan-400">LACORE</p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-2">
          {messages.map((message, idx) => (
            <div
              key={`${message.role}-${idx}`}
              className={`text-sm leading-relaxed sm:text-base ${
                message.role === "assistant"
                  ? "w-full border-l-2 border-cyan-400 pl-5 pr-2 py-2 text-[#F4F4F5]"
                  : "ml-auto max-w-[80%] bg-[#18181B] px-4 py-3 font-mono text-[#F4F4F5]"
              }`}
            >
              {message.role === "assistant" ? (
                <p className="font-mono text-sm leading-relaxed text-[#F4F4F5]">{message.text}</p>
              ) : (
                message.text
              )}
            </div>
          ))}

          {loading && (
            <div className="flex w-full items-center gap-2 border-l-2 border-cyan-400 pl-5 py-3">
              <span className="signal-dot" />
              <span className="signal-dot" />
              <span className="signal-dot" />
            </div>
          )}

          {error && <p className="font-mono text-sm text-red-400">{error}</p>}

          {offer && (
            <section className="offer-card-enter mt-6 w-full border border-cyan-500 bg-[#0C0C0E] p-5">
              <div className="mb-4 flex items-center gap-2">
                <h2 className="font-heading text-4xl uppercase leading-none tracking-[0.04em] text-cyan-400">
                  YOUR OFFER
                </h2>
                <span className="pulse-dot" />
              </div>
              <div className="space-y-0">
                {[
                  { label: "Offer", value: offer.offer },
                  { label: "Audience", value: offer.audience },
                  { label: "Pricing", value: offer.pricing },
                  { label: "Positioning", value: offer.positioning },
                  { label: "Headline", value: offer.headline }
                ].map((item) => (
                  <div key={item.label} className="border-b border-[#27272A] py-4 last:border-b-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400">
                      {item.label.toUpperCase()}
                    </p>
                    <p className="font-mono mt-2 text-sm text-[#F4F4F5] sm:text-base">{item.value}</p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled
                className="font-mono mt-6 inline-flex cursor-not-allowed items-center border border-cyan-500/30 px-4 py-2 text-xs uppercase tracking-[0.16em] text-[#52525B]"
              >
                Continue →
              </button>
            </section>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-3 border-t border-cyan-500/20 pt-4">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type your business in one paragraph..."
            className="font-mono flex-1 border-0 border-b border-transparent bg-transparent px-1 py-3 text-sm text-[#F4F4F5] outline-none transition placeholder:text-[#52525B] focus:border-cyan-400"
          />
          <button
            type="submit"
            disabled={!canSubmit}
            aria-label="Send"
            className="font-mono px-1 py-2 text-2xl text-cyan-400 transition hover:text-cyan-300 disabled:cursor-not-allowed disabled:text-[#52525B]"
          >
            →
          </button>
        </form>
      </div>
    </main>
  );
}
