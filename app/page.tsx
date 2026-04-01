"use client";

import { FormEvent, useMemo, useState } from "react";

type Offer = {
  offer: string;
  audience: string;
  pricing: string;
  positioning: string;
  headline: string;
};

export default function LandingPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const canSubmit = input.trim().length > 0 && !loading;

  const tickerText = useMemo(
    () =>
      "OFFER GENERATION · LANDING PAGE · LEAD CAPTURE · AUTO CONTENT · DEAL CLOSING · ANALYTICS · ",
    []
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setOffer(null);

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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        @keyframes dot-pulse {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-2px); }
        }
        @keyframes offer-enter {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.45; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
      <main
        style={{
          minHeight: "100vh",
          background: "#09090B",
          color: "#F4F4F5",
          display: "flex",
          flexDirection: "column",
          padding: "0 20px"
        }}
      >
        <section
          style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center"
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#06B6D4"
            }}
          >
            LACORE
          </p>

          <h1
            style={{
              margin: "20px 0 0",
              fontFamily: "var(--font-bebas-neue), sans-serif",
              fontSize: "clamp(72px, 12vw, 160px)",
              lineHeight: 0.95,
              letterSpacing: "0.02em",
              textTransform: "uppercase"
            }}
          >
            <span style={{ display: "block", color: "#F4F4F5" }}>YOU SAY WHAT YOU SELL.</span>
            <span style={{ display: "block", color: "#06B6D4" }}>LACORE DOES THE REST.</span>
          </h1>
          <p
            style={{
              margin: "24px 0 0",
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 12,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#52525B"
            }}
          >
            FROM IDEA TO FIRST CLIENT. AUTOMATICALLY.
          </p>
        </section>

        <section
          style={{
            minHeight: "40vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: "20px"
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              width: "100%",
              maxWidth: 720,
              margin: "0 auto"
            }}
          >
            <div
              style={{
                background: "#0F0F12",
                border: "1px solid #1C1C1F",
                borderRadius: 2,
                padding: 32
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#06B6D4"
                }}
              >
                WHAT DO YOU SELL?
              </p>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="I'm a freelance designer working with brands and creators. I want $5,000/month."
                style={{
                  width: "100%",
                  marginTop: 14,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "#F4F4F5",
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 15,
                  minHeight: 80,
                  resize: "none"
                }}
              />
              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    color: "#3F3F46"
                  }}
                >
                  ↵ ENTER TO START
                </p>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  aria-label="Generate offer"
                  style={{
                    border: "none",
                    background: "transparent",
                    color: canSubmit ? "#06B6D4" : "#3F3F46",
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 28,
                    lineHeight: 1,
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    padding: 0
                  }}
                >
                  →
                </button>
              </div>
            </div>
          </form>

          {loading && (
            <div
              style={{
                width: "100%",
                maxWidth: 720,
                marginTop: 14,
                background: "#0F0F12",
                border: "1px solid #1C1C1F",
                borderRadius: 2,
                padding: "20px 32px",
                display: "flex",
                alignItems: "center",
                gap: 10
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  color: "#06B6D4"
                }}
              >
                ANALYZING YOUR BUSINESS...
              </span>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: "#06B6D4",
                  animation: "dot-pulse 1s ease-in-out infinite"
                }}
              />
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: "#06B6D4",
                  animation: "dot-pulse 1s ease-in-out 0.15s infinite"
                }}
              />
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: "#06B6D4",
                  animation: "dot-pulse 1s ease-in-out 0.3s infinite"
                }}
              />
            </div>
          )}

          {error && (
            <p
              style={{
                width: "100%",
                maxWidth: 720,
                margin: "12px auto 0",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 12,
                color: "#f87171"
              }}
            >
              {error}
            </p>
          )}

          {offer && (
            <section
              style={{
                width: "100%",
                maxWidth: 720,
                marginTop: 14,
                border: "1px solid #06B6D4",
                background: "#0C0C0E",
                padding: 20,
                animation: "offer-enter 400ms ease"
              }}
            >
              <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-bebas-neue), sans-serif",
                    fontSize: 38,
                    lineHeight: 1,
                    letterSpacing: "0.04em",
                    color: "#06B6D4"
                  }}
                >
                  YOUR OFFER
                </h2>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: "#06B6D4",
                    animation: "pulse-dot 1s ease-in-out infinite"
                  }}
                />
              </div>
              {[
                { label: "OFFER", value: offer.offer },
                { label: "AUDIENCE", value: offer.audience },
                { label: "PRICING", value: offer.pricing },
                { label: "POSITIONING", value: offer.positioning },
                { label: "HEADLINE", value: offer.headline }
              ].map((item, idx) => (
                <div
                  key={item.label}
                  style={{
                    borderBottom: idx === 4 ? "none" : "1px solid #27272A",
                    padding: "14px 0"
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-space-mono), monospace",
                      fontSize: 10,
                      letterSpacing: "0.2em",
                      color: "#06B6D4"
                    }}
                  >
                    {item.label}
                  </p>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontFamily: "var(--font-space-mono), monospace",
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "#F4F4F5"
                    }}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </section>
          )}

          <div
            style={{
              marginTop: 18,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 8
            }}
          >
            {[
              "< 60 SEC SETUP",
              "FIRST LEAD IN 24H",
              "NO MARKETING SKILLS NEEDED"
            ].map((item) => (
              <div
                key={item}
                style={{
                  border: "1px solid #1C1C1F",
                  padding: "6px 14px",
                  color: "#52525B",
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 10,
                  letterSpacing: "0.12em"
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <div
          style={{
            marginTop: "auto",
            width: "100%",
            overflow: "hidden",
            borderTop: "1px solid rgba(6,182,212,0.2)",
            borderBottom: "1px solid rgba(6,182,212,0.2)",
            padding: "10px 0"
          }}
        >
          <div
            style={{
              width: "max-content",
              display: "inline-flex",
              whiteSpace: "nowrap",
              animation: "ticker-scroll 24s linear infinite",
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 11,
              color: "#52525B",
              letterSpacing: "0.12em"
            }}
          >
            <span>{tickerText.repeat(2)}</span>
            <span>{tickerText.repeat(2)}</span>
          </div>
        </div>
      </main>
    </>
  );
}
