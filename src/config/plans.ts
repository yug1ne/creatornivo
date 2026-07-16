export const PLANS = {
  FREE: "free",
  PRO: "pro",
} as const;

export type Plan = (typeof PLANS)[keyof typeof PLANS];

export type GenerationPeriod = "day" | "month";

/**
 * Default OpenAI generation models (server-side).
 * Optional overrides (non-empty string only):
 *   OPENAI_MODEL_FREE — Free plan model id
 *   OPENAI_MODEL_PRO  — Pro plan model id
 * Do not put model secrets in NEXT_PUBLIC_* vars.
 */
export const DEFAULT_GENERATION_MODELS = {
  free: "gpt-5.6-luna",
  pro: "gpt-5.6-terra",
} as const;

export const generationPolicies = {
  [PLANS.FREE]: {
    model: DEFAULT_GENERATION_MODELS.free,
    maxGenerationsPerPeriod: 5,
    period: "day" as const,
    maxOutputTokens: 1000,
    maxInputChars: 8000,
    requestsPerMinute: 1,
    maxConcurrentGenerations: 1,
  },
  [PLANS.PRO]: {
    model: DEFAULT_GENERATION_MODELS.pro,
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

function resolveEnvModel(
  envValue: string | undefined,
  fallback: string,
): string {
  const trimmed = envValue?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

/**
 * Server-owned generation policy for a plan, with optional env model override.
 */
export function getGenerationPolicy(plan: Plan) {
  const base = generationPolicies[plan];
  const model =
    plan === PLANS.PRO
      ? resolveEnvModel(process.env.OPENAI_MODEL_PRO, base.model)
      : resolveEnvModel(process.env.OPENAI_MODEL_FREE, base.model);

  return {
    ...base,
    model,
  };
}

export function isProPlan(plan: Plan): boolean {
  return plan === PLANS.PRO;
}
