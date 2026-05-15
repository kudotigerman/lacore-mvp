/** Landing generation caps — keep in sync with lib/plans.ts maxLandingGenerations */
export const PLANS = {
  free: { maxLandingGenerations: 1 },
  starter: { maxLandingGenerations: 999 },
  pro: { maxLandingGenerations: 999 },
  scale: { maxLandingGenerations: 999 },
} as const;
