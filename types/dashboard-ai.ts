export type PricingTier = { name: string; price: string; includes: string[] };

export type PricingStrategyResult = {
  recommendedPrice: string;
  priceRationale: string;
  tiers: PricingTier[];
  presentationScript: string;
  objectionResponse: string;
};

export type SequenceMessage = { timing: string; subject: string | null; content: string };

export type OutreachResult = {
  primary: string;
  alternative: string;
  followUp: string;
};
