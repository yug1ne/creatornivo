import {
  getGenerationPolicy,
  getPlanLimits,
  type Plan,
} from "@/config/plans";
import { getQuotaExhaustedBannerMessage } from "@/lib/usage/quota-copy";

/** Primary label for usage UI — remaining quota in the current period. */
export function getRemainingGenerationsLabel(
  plan: Plan,
  remaining: number,
): string {
  const noun = remaining === 1 ? "generation" : "generations";

  return plan === "free"
    ? `${remaining} ${noun} left today`
    : `${remaining} ${noun} left this calendar month`;
}

export function getGenerationLimitMessage(
  plan: Plan,
  generationsUsed: number,
  resetAt?: string,
  now = new Date(),
): string | null {
  const policy = getGenerationPolicy(plan);

  if (generationsUsed >= policy.maxGenerationsPerPeriod) {
    if (resetAt) {
      return getQuotaExhaustedBannerMessage(plan, resetAt, now);
    }

    return plan === "free"
      ? "You've reached today's free generation limit."
      : "You've reached this calendar month's generation limit.";
  }

  const remaining = policy.maxGenerationsPerPeriod - generationsUsed;

  if (remaining <= 3) {
    return `${remaining} ${remaining === 1 ? "generation" : "generations"} left ${
      policy.period === "day" ? "today" : "this calendar month"
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
