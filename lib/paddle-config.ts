export const PADDLE_PRICE_IDS = {
  starter_monthly: "pri_01knxxe2d9815w9xbb857bg8p4",
  starter_annual: "pri_01knxxx0yrj8ghjtr4463mp8s7",
  pro_monthly: "pri_01knxy1zm5gvye6tswr94b0a8e",
  pro_annual: "pri_01knxy8jezrh0stv15gya9mqc6",
  scale_monthly: "pri_01knxycb8m7cj7vfzqf7weq1j3",
  scale_annual: "pri_01knxyfzyhdrbp6t9e37j6f22d",
  credits_50: "pri_01knxys5gx5qptkdjw1psnddsv",
  credits_150: "pri_01knxyxp88bsqbj1pw41we7j3c",
  credits_300: "pri_01knxz1rk47ne0xxr940q5kcf6",
  credits_600: "pri_01knxz5t2bzv0jg9tc4xse8sya"
} as const;

export const PLAN_CREDITS: Record<string, number> = {
  free: 20,
  starter: 100,
  pro: 300,
  scale: 1000
};

export const CREDIT_COSTS = {
  generate_offer: 5,
  generate_landing: 10,
  edit_landing: 3,
  generate_post: 2,
  generate_image: 5,
  closing_script: 2,
  what_to_say: 1
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

export const PRICE_TO_PLAN: Record<string, string> = {
  pri_01knxxe2d9815w9xbb857bg8p4: "starter",
  pri_01knxxx0yrj8ghjtr4463mp8s7: "starter",
  pri_01knxy1zm5gvye6tswr94b0a8e: "pro",
  pri_01knxy8jezrh0stv15gya9mqc6: "pro",
  pri_01knxycb8m7cj7vfzqf7weq1j3: "scale",
  pri_01knxyfzyhdrbp6t9e37j6f22d: "scale"
};

export const TOPUP_CREDITS: Record<string, number> = {
  pri_01knxys5gx5qptkdjw1psnddsv: 50,
  pri_01knxyxp88bsqbj1pw41we7j3c: 150,
  pri_01knxz1rk47ne0xxr940q5kcf6: 300,
  pri_01knxz5t2bzv0jg9tc4xse8sya: 600
};
