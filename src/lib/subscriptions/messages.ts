import {
  getGenerationPolicy,
  getPlanLimits,
  type Plan,
} from "@/config/plans";

/** Primary label for usage UI — remaining quota in the current period. */
export function getRemainingGenerationsLabel(
  plan: Plan,
  remaining: number,
): string {
  const noun = remaining === 1 ? "generation" : "generations";

  return plan === "free"
    ? `${remaining} ${noun} left today`
    : `${remaining} ${noun} left this month`;
}

export function getGenerationLimitMessage(
  plan: Plan,
  generationsUsed: number,
): string | null {
  const policy = getGenerationPolicy(plan);

  if (generationsUsed >= policy.maxGenerationsPerPeriod) {
    return plan === "free"
      ? "You’ve reached today’s free generation limit."
      : "You’ve reached your monthly generation limit.";
  }

  const remaining = policy.maxGenerationsPerPeriod - generationsUsed;

  if (remaining <= 3) {
    return `${remaining} ${remaining === 1 ? "generation" : "generations"} left ${
      policy.period === "day" ? "today" : "this month"
    }.`;
  }

  return null;
}

export function getSaveLimitMessage(
  plan: Plan,
  savedCount: number,
): string | null {
  const { maxSavedPrompts } = getPlanLimits(plan);

  if (maxSavedPrompts === Infinity) {
    return null;
  }

  if (savedCount >= maxSavedPrompts) {
    return `Save limit reached (${maxSavedPrompts} prompts on the Free plan). Delete old ones or upgrade to Pro.`;
  }

  return null;
}
