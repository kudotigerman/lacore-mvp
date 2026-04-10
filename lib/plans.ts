export const PLANS = {
  free: { maxProjects: 1, maxLandingGenerations: 3, canPost: false },
  pro: { maxProjects: 5, maxLandingGenerations: 20, canPost: true },
  scale: { maxProjects: Infinity, maxLandingGenerations: Infinity, canPost: true },
} as const;

export type PlanName = keyof typeof PLANS;
