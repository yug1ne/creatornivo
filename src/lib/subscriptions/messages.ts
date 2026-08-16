import {
  getGenerationPolicy,
  getPlanLimits,
  type Plan,
} from "@/config/plans";
import { getQuotaExhaustedBannerMessage } from "@/lib/usage/quota-copy";
import type { QuotaBasis } from "@/lib/usage/quota-period";

/** Primary label for usage UI — remaining quota in the current period. */
export function getRemainingGenerationsLabel(
  plan: Plan,
  remaining: number,
  basis?: QuotaBasis,
): string {
  const noun = remaining === 1 ? "generation" : "generations";

  if (basis === "trial") {
    return `${remaining} trial ${noun} left`;
  }

  if (basis === "appsumo_month") {
    return `${remaining} ${noun} left this calendar month`;
  }

  if (plan === "free") {
    return `${remaining} ${noun} left today`;
  }

  if (basis === "provider_billing") {
    return `${remaining} ${noun} left in this billing period`;
  }

  return `${remaining} ${noun} left this calendar month`;
}

export function getGenerationLimitMessage(
  plan: Plan,
  generationsUsed: number,
  resetAt?: string,
  now = new Date(),
  basis?: QuotaBasis,
  limitOverride?: number,
): string | null {
  const policy = getGenerationPolicy(plan);
  const limit = limitOverride ?? policy.maxGenerationsPerPeriod;

  if (generationsUsed >= limit) {
    if (resetAt) {
      return getQuotaExhaustedBannerMessage(plan, resetAt, now, basis);
    }

    if (basis === "trial") {
      return "You've reached the 30-generation trial limit.";
    }

    if (plan === "free") {
      return "You've reached today's free generation limit.";
    }

    return basis === "provider_billing"
      ? "You've reached this billing period's generation limit."
      : "You've reached this calendar month's generation limit.";
  }

  const remaining = limit - generationsUsed;

  if (remaining <= 3) {
    const windowLabel =
      basis === "trial"
        ? "in your trial"
        : policy.period === "day"
        ? "today"
        : basis === "provider_billing"
          ? "in this billing period"
          : "this calendar month";

    return `${remaining} ${remaining === 1 ? "generation" : "generations"} left ${windowLabel}.`;
  }

  return null;
}

export function getSaveLimitMessage(
  plan: Plan,
  savedCount: number,
  maxSavedPrompts = getPlanLimits(plan).maxSavedPrompts,
): string | null {

  if (maxSavedPrompts === Infinity) {
    return null;
  }

  if (savedCount >= maxSavedPrompts) {
    return `Save limit reached (${maxSavedPrompts} prompts on the Free plan). Delete old ones or upgrade to Pro.`;
  }

  return null;
}
