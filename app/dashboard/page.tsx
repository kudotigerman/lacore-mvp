"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

type Offer = {
  offer: string;
  audience: string;
  pricing: string;
  positioning: string;
  headline: string;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [offer, setOffer] = useState<Offer | null>(null);
  const router = useRouter();

  const layers = useMemo(
    () => [
      { name: "LAYER 1", title: "OFFER", status: "completed" as const },
      { name: "LAYER 2", title: "LANDING PAGE + STRIPE", status: "locked" as const },
      { name: "LAYER 3", title: "CONTENT MACHINE", status: "locked" as const },
      { name: "LAYER 4", title: "LEAD CAPTURE", status: "locked" as const },
      { name: "LAYER 5", title: "CLOSING SYSTEM", status: "locked" as const },
      { name: "LAYER 6", title: "ANALYTICS DASHBOARD", status: "locked" as const }
    ],
    []
  );

  useEffect(() => {
    async function init() {
      const supabase = getSupabaseClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace("/auth");
        return;
      }

      setEmail(session.user.email ?? "");
      const { data } = await supabase
        .from("offers")
        .select("offer,audience,pricing,positioning,headline")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) setOffer(data);
      setLoading(false);
    }

    void init();
  }, [router]);

  async function handleSignOut() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#09090B", color: "#F4F4F5", padding: 24 }}>
        <p style={{ fontFamily: "var(--font-space-mono), monospace", color: "#52525B" }}>
          Loading dashboard...
        </p>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#09090B", color: "#F4F4F5", padding: 24 }}>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #1C1C1F",
          paddingBottom: 16
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-bebas-neue), sans-serif",
            fontSize: 28,
            color: "#06B6D4"
          }}
        >
          LACORE
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <p style={{ margin: 0, fontFamily: "var(--font-space-mono), monospace", fontSize: 12, color: "#A1A1AA" }}>
            {email}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            style={{
              border: "1px solid #06B6D4",
              background: "transparent",
              color: "#06B6D4",
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.12em",
              padding: "8px 12px",
              cursor: "pointer"
            }}
          >
            SIGN OUT
          </button>
        </div>
      </nav>

      <section style={{ marginTop: 28 }}>
        {!offer ? (
          <div style={{ border: "1px solid #1C1C1F", background: "#0C0C0E", padding: 24 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--font-bebas-neue), sans-serif",
                fontSize: 54,
                lineHeight: 1,
                color: "#F4F4F5"
              }}
            >
              YOUR OFFER IS WAITING
            </h1>
            <button
              type="button"
              onClick={() => router.push("/")}
              style={{
                marginTop: 16,
                border: "1px solid #06B6D4",
                background: "transparent",
                color: "#06B6D4",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 12,
                letterSpacing: "0.16em",
                padding: "10px 16px",
                cursor: "pointer"
              }}
            >
              GENERATE YOUR OFFER →
            </button>
          </div>
        ) : (
          <section style={{ border: "1px solid #06B6D4", background: "#0C0C0E", padding: 20 }}>
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
                  background: "#06B6D4"
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
      </section>

      <section
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12
        }}
      >
        {layers.map((layer) => (
          <div
            key={layer.name}
            style={{
              border: "1px solid #1C1C1F",
              padding: 16,
              background: "#0F0F12"
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 10,
                letterSpacing: "0.14em",
                color: "#52525B"
              }}
            >
              {layer.name}
            </p>
            <p
              style={{
                margin: "10px 0 0",
                fontFamily: "var(--font-bebas-neue), sans-serif",
                fontSize: 28,
                color: layer.status === "completed" ? "#06B6D4" : "#A1A1AA"
              }}
            >
              {layer.title} {layer.status === "completed" ? "✓" : ""}
            </p>
            <p
              style={{
                margin: "6px 0 0",
                fontFamily: "var(--font-space-mono), monospace",
                fontSize: 11,
                color: layer.status === "completed" ? "#06B6D4" : "#52525B"
              }}
            >
              {layer.status === "completed" ? "COMPLETED" : "COMING SOON"}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
