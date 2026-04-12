"use client";

import { useEffect, useState, type ReactNode } from "react";
import OnboardingSlides, { ONBOARDING_KEY } from "@/components/dashboard/OnboardingSlides";

export function DashboardOnboardingGate({ children }: { children: ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const done = localStorage.getItem(ONBOARDING_KEY);
      if (!done) setShowOnboarding(true);
    } catch {
      setShowOnboarding(true);
    }
  }, []);

  return (
    <>
      {children}
      {mounted && showOnboarding ? (
        <OnboardingSlides
          onClose={() => {
            setShowOnboarding(false);
          }}
        />
      ) : null}
    </>
  );
}
