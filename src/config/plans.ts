export const PLANS = {
  FREE: "free",
  PRO: "pro",
} as const;

export type Plan = (typeof PLANS)[keyof typeof PLANS];

export const planLimits = {
  [PLANS.FREE]: {
    maxSavedPrompts: 10,
    maxGenerationsPerDay: 20,
    canUseProTemplates: false,
    canExport: false,
    maxTokensPerGeneration: 2000,
  },
  [PLANS.PRO]: {
    maxSavedPrompts: Infinity,
    maxGenerationsPerDay: Infinity,
    canUseProTemplates: true,
    canExport: true,
    maxTokensPerGeneration: 8000,
  },
} as const;

export type PlanLimits = (typeof planLimits)[Plan];

export function getPlanLimits(plan: Plan): PlanLimits {
  return planLimits[plan];
}

export function isProPlan(plan: Plan): boolean {
  return plan === PLANS.PRO;
}