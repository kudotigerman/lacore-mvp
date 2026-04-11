export const PLANS = {
  free: {
    maxProjects: 1,
    maxLandingGenerations: 1,
    canPost: true,
    maxPosts: 5,
    canUseClosingSystem: false,
    canUseCustomDomain: false,
    credits: 20,
    watermark: true
  },
  starter: {
    maxProjects: 1,
    maxLandingGenerations: 999,
    canPost: true,
    maxPosts: 999,
    canUseClosingSystem: true,
    canUseCustomDomain: false,
    credits: 100,
    watermark: false
  },
  pro: {
    maxProjects: 5,
    maxLandingGenerations: 999,
    canPost: true,
    maxPosts: 999,
    canUseClosingSystem: true,
    canUseCustomDomain: true,
    credits: 300,
    watermark: false
  },
  scale: {
    maxProjects: 999,
    maxLandingGenerations: 999,
    canPost: true,
    maxPosts: 999,
    canUseClosingSystem: true,
    canUseCustomDomain: true,
    credits: 1000,
    watermark: false
  }
} as const;

export type PlanName = keyof typeof PLANS;
