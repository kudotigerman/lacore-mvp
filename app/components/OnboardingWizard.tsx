"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataContext";

export const ONBOARDING_INPUT_KEY = "onboarding_input";
const DISMISS_OFFER_KEY = "lacore_onboarding_dismissed";
const DISMISS_LANDING_KEY = "lacore_onboarding_landing_dismissed";
export const ONBOARDING_GENERATING_KEY = "lacore_onboarding_generating";

const font = "var(--font-geist-sans), system-ui, sans-serif";

const TAGS = ["Designer", "Developer", "Coach", "Consultant", "Copywriter", "Agency"] as const;

export default function OnboardingWizard() {
  const d = useDashboardData();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [dismissOffer, setDismissOffer] = useState(false);
  const [dismissLanding, setDismissLanding] = useState(false);
  const [step, setStep] = useState(1);
  const [whatYouDo, setWhatYouDo] = useState("");

  useEffect(() => {
    setHydrated(true);
    try {
      if (localStorage.getItem(DISMISS_OFFER_KEY) === "1") setDismissOffer(true);
      if (localStorage.getItem(DISMISS_LANDING_KEY) === "1") setDismissLanding(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (d.offer) {
      try {
        sessionStorage.removeItem(ONBOARDING_GENERATING_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [d.offer]);

  const showOfferFlow =
    hydrated &&
    !d.loading &&
    !d.buildingLanding &&
    !d.offer &&
    !dismissOffer &&
    sessionStorage.getItem(ONBOARDING_GENERATING_KEY) !== "1";

  const showLandingFlow =
    hydrated &&
    !d.loading &&
    !d.buildingLanding &&
    Boolean(d.offer) &&
    !d.landingSlug &&
    !dismissLanding;

  if (!showOfferFlow && !showLandingFlow) return null;

  const mode = showOfferFlow ? "offer" : "landing";
  const activeStep = mode === "landing" ? 3 : step;

  function dismissOfferWizard() {
    try {
      localStorage.setItem(DISMISS_OFFER_KEY, "1");
      localStorage.removeItem(ONBOARDING_INPUT_KEY);
      sessionStorage.removeItem(ONBOARDING_GENERATING_KEY);
    } catch {
      /* ignore */
    }
    setDismissOffer(true);
  }

  function dismissLandingWizard() {
    try {
      localStorage.setItem(DISMISS_LANDING_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissLanding(true);
  }

  function skip() {
    if (mode === "offer") dismissOfferWizard();
    else dismissLandingWizard();
  }

  function appendTag(tag: string) {
    setWhatYouDo((prev) => (prev.trim() ? `${prev.trim()} ${tag}` : `I'm a ${tag.toLowerCase()} `));
  }

  function goToOfferGenerate() {
    const trimmed = whatYouDo.trim();
    if (!trimmed) return;
    try {
      localStorage.setItem(ONBOARDING_INPUT_KEY, trimmed);
      sessionStorage.setItem(ONBOARDING_GENERATING_KEY, "1");
    } catch {
      /* ignore */
    }
    router.push("/dashboard/offer");
  }

  function goToLanding() {
    router.push("/dashboard/landing");
  }

  const btnPrimary: CSSProperties = {
    width: "100%",
    marginTop: 24,
    padding: "14px 24px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    fontFamily: font,
    fontWeight: 800,
    fontSize: 15,
    letterSpacing: "0.04em",
    background: "linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)",
    color: "#0A0A0D",
    boxShadow: "0 8px 24px rgba(6, 182, 212, 0.25)"
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-wizard-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10050,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        boxSizing: "border-box"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: "#111116",
          border: "1px solid #1C1C22",
          borderRadius: 16,
          padding: 40,
          boxSizing: "border-box",
          boxShadow: "0 24px 80px rgba(0,0,0,0.55)"
        }}
      >
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {[1, 2, 3].map((n) => {
            const done = activeStep > n;
            const active = activeStep === n;
            return (
              <div
                key={n}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: done || active ? "#06B6D4" : "#1C1C22",
                  opacity: active ? 1 : done ? 0.85 : 1,
                  transition: "background 0.2s ease"
                }}
              />
            );
          })}
        </div>

        {mode === "offer" && step === 1 ? (
          <>
            <h1
              id="onboarding-wizard-title"
              style={{
                margin: 0,
                fontFamily: font,
                fontWeight: 800,
                fontSize: 32,
                lineHeight: 1.15,
                color: "#FAFAFA"
              }}
            >
              Welcome to LACORE 👋
            </h1>
            <p
              style={{
                margin: "12px 0 0",
                fontFamily: font,
                fontSize: 16,
                lineHeight: 1.5,
                color: "rgba(250,250,250,0.72)"
              }}
            >
              Let&apos;s set up your AI sales machine in 2 minutes
            </p>
            <ul
              style={{
                margin: "28px 0 0",
                padding: 0,
                listStyle: "none",
                fontFamily: font,
                fontSize: 15,
                lineHeight: 1.8,
                color: "#FAFAFA"
              }}
            >
              <li style={{ marginBottom: 10 }}>✦ Your offer in 60 seconds</li>
              <li style={{ marginBottom: 10 }}>✦ Landing page that converts</li>
              <li>✦ Leads straight to your inbox</li>
            </ul>
            <button type="button" style={btnPrimary} onClick={() => setStep(2)}>
              Let&apos;s go →
            </button>
          </>
        ) : null}

        {mode === "offer" && step === 2 ? (
          <>
            <h1
              id="onboarding-wizard-title"
              style={{
                margin: 0,
                fontFamily: font,
                fontWeight: 800,
                fontSize: 28,
                lineHeight: 1.2,
                color: "#FAFAFA"
              }}
            >
              What do you do?
            </h1>
            <p
              style={{
                margin: "10px 0 0",
                fontFamily: font,
                fontSize: 15,
                color: "rgba(250,250,250,0.65)"
              }}
            >
              Tell us briefly — AI will craft your offer
            </p>
            <textarea
              value={whatYouDo}
              onChange={(e) => setWhatYouDo(e.target.value)}
              placeholder="e.g. I'm a freelance designer helping startups build brands that attract investors..."
              rows={6}
              style={{
                width: "100%",
                marginTop: 20,
                padding: 16,
                borderRadius: 12,
                border: "1px solid #1C1C22",
                background: "#0A0A0D",
                color: "#FAFAFA",
                fontFamily: font,
                fontSize: 14,
                lineHeight: 1.55,
                resize: "vertical",
                boxSizing: "border-box",
                outline: "none"
              }}
            />
            <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => appendTag(tag)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #1C1C22",
                    background: "rgba(6,182,212,0.08)",
                    color: "#06B6D4",
                    fontFamily: font,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
            <button
              type="button"
              style={{ ...btnPrimary, opacity: whatYouDo.trim() ? 1 : 0.45, cursor: whatYouDo.trim() ? "pointer" : "not-allowed" }}
              disabled={!whatYouDo.trim()}
              onClick={() => goToOfferGenerate()}
            >
              Generate my offer →
            </button>
          </>
        ) : null}

        {mode === "landing" ? (
          <>
            <h1
              id="onboarding-wizard-title"
              style={{
                margin: 0,
                fontFamily: font,
                fontWeight: 800,
                fontSize: 28,
                lineHeight: 1.2,
                color: "#FAFAFA"
              }}
            >
              Now let&apos;s build your landing page
            </h1>
            <p
              style={{
                margin: "10px 0 0",
                fontFamily: font,
                fontSize: 15,
                color: "rgba(250,250,250,0.65)"
              }}
            >
              One click — your page is live in 30 seconds
            </p>
            <button type="button" style={btnPrimary} onClick={() => goToLanding()}>
              Build my landing page →
            </button>
          </>
        ) : null}

        <button
          type="button"
          onClick={skip}
          style={{
            display: "block",
            width: "100%",
            marginTop: 20,
            padding: 10,
            border: "none",
            background: "transparent",
            fontFamily: font,
            fontSize: 13,
            color: "rgba(250,250,250,0.4)",
            cursor: "pointer"
          }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
