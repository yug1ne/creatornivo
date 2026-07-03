export const PLANS = {
  FREE: "free",
  PRO: "pro",
} as const;

export type Plan = (typeof PLANS)[keyof typeof PLANS];

export type GenerationPeriod = "day" | "month";

export const generationPolicies = {
  [PLANS.FREE]: {
    model: "gpt-4o-mini",
    maxGenerationsPerPeriod: 5,
    period: "day" as const,
    maxOutputTokens: 1000,
    maxInputChars: 8000,
    requestsPerMinute: 1,
    maxConcurrentGenerations: 1,
  },
  [PLANS.PRO]: {
    model: "gpt-4o",
    maxGenerationsPerPeriod: 100,
    period: "month" as const,
    maxOutputTokens: 2000,
    maxInputChars: 12000,
    requestsPerMinute: 5,
    maxConcurrentGenerations: 1,
  },
} as const;

export const planLimits = {
  [PLANS.FREE]: {
    maxSavedPrompts: 10,
    maxGenerationsPerPeriod:
      generationPolicies[PLANS.FREE].maxGenerationsPerPeriod,
    generationPeriod: generationPolicies[PLANS.FREE].period,
    canUseProTemplates: false,
    canExport: false,
  },
  [PLANS.PRO]: {
    maxSavedPrompts: Infinity,
    maxGenerationsPerPeriod:
      generationPolicies[PLANS.PRO].maxGenerationsPerPeriod,
    generationPeriod: generationPolicies[PLANS.PRO].period,
    canUseProTemplates: true,
    canExport: true,
  },
} as const;

export type PlanLimits = (typeof planLimits)[Plan];

export function getPlanLimits(plan: Plan): PlanLimits {
  return planLimits[plan];
}

export function getGenerationPolicy(plan: Plan) {
  return generationPolicies[plan];
}

export function isProPlan(plan: Plan): boolean {
  return plan === PLANS.PRO;
}
