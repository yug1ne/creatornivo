import {
  getGenerationPolicy,
  getPlanLimits,
  type Plan,
} from "@/config/plans";

export function canSavePrompt(plan: Plan, currentCount: number): boolean {
  const { maxSavedPrompts } = getPlanLimits(plan);
  return currentCount < maxSavedPrompts;
}

export function canGenerate(plan: Plan, generationsUsed: number): boolean {
  return generationsUsed < getGenerationPolicy(plan).maxGenerationsPerPeriod;
}

export function canUseTemplate(
  userPlan: Plan,
  templateRequiredPlan: Plan,
): boolean {
  const userLimits = getPlanLimits(userPlan);

  if (templateRequiredPlan === "pro") {
    return userLimits.canUseProTemplates;
  }

  return true;
}
