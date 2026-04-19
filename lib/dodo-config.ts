export const DODO_PRODUCT_IDS = {
  starter_monthly: "pdt_0Nd3kY7ITmWkwnhJ6DTon",
  starter_annual: "pdt_0Nd3lhgtbkTcjSmpCMD3N",
  pro_monthly: "pdt_0Nd3ly8Vu4KF618oMiPnr",
  pro_annual: "pdt_0Nd3mF5E8dM8JLidnl5jK",
  scale_monthly: "pdt_0Nd3mT9phm2RyYIl4mGRc",
  scale_annual: "pdt_0Nd3mk29D1fqW0bUL0gKG",
  credits_50: "pdt_0Nd3o3eFpxYUKcGV2LER2",
  credits_150: "pdt_0Nd3oC3p0srF8BfVC3ebp",
  credits_300: "pdt_0Nd3oLbeELWFIrBstyBvF",
  credits_600: "pdt_0Nd3oSUfitYYBEFU159c7",
} as const;

export const PLAN_CREDITS: Record<string, number> = {
  free: 20,
  starter: 100,
  pro: 300,
  scale: 1000,
};

export const CREDIT_COSTS = {
  generate_offer: 5,
  generate_landing: 10,
  edit_landing: 3,
  generate_post: 2,
  generate_image: 5,
  closing_script: 2,
  what_to_say: 1,
  generate_proposal: 3,
  pricing_strategy: 2,
  generate_sequence: 3,
  generate_outreach: 2,
  closing_assistant: 1,
  analytics_insights: 1,
} as const;
export type CreditAction = keyof typeof CREDIT_COSTS;

export const PRODUCT_TO_PLAN: Record<string, string> = {
  pdt_0Nd3kY7ITmWkwnhJ6DTon: "starter",
  pdt_0Nd3lhgtbkTcjSmpCMD3N: "starter",
  pdt_0Nd3ly8Vu4KF618oMiPnr: "pro",
  pdt_0Nd3mF5E8dM8JLidnl5jK: "pro",
  pdt_0Nd3mT9phm2RyYIl4mGRc: "scale",
  pdt_0Nd3mk29D1fqW0bUL0gKG: "scale",
};

export const TOPUP_CREDITS: Record<string, number> = {
  pdt_0Nd3o3eFpxYUKcGV2LER2: 50,
  pdt_0Nd3oC3p0srF8BfVC3ebp: 150,
  pdt_0Nd3oLbeELWFIrBstyBvF: 300,
  pdt_0Nd3oSUfitYYBEFU159c7: 600,
};
