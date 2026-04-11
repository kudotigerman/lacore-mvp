export const PLANS = {
  free: { maxProjects: 999, maxLandingGenerations: 999, canPost: true },
  pro: { maxProjects: 5, maxLandingGenerations: 20, canPost: true },
  scale: { maxProjects: Infinity, maxLandingGenerations: Infinity, canPost: true },
} as const;

export type PlanName = keyof typeof PLANS;
