import { getPlanLimits, type Plan } from "@/config/plans";

export function getGenerationLimitMessage(
  plan: Plan,
  generationsToday: number,
): string | null {
  const { maxGenerationsPerDay } = getPlanLimits(plan);

  if (maxGenerationsPerDay === Infinity) {
    return null;
  }

  if (generationsToday >= maxGenerationsPerDay) {
    return `You've reached your daily limit (${maxGenerationsPerDay} generations on the Free plan). Upgrade to Pro for unlimited generation.`;
  }

  const remaining = maxGenerationsPerDay - generationsToday;

  if (remaining <= 3) {
    return `${remaining} ${remaining === 1 ? "generation" : "generations"} left today.`;
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