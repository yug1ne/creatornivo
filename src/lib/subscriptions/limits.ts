import { getPlanLimits, type Plan } from "@/config/plans";

export function canSavePrompt(plan: Plan, currentCount: number): boolean {
  const { maxSavedPrompts } = getPlanLimits(plan);
  return currentCount < maxSavedPrompts;
}

export function canGenerate(plan: Plan, generationsToday: number): boolean {
  const { maxGenerationsPerDay } = getPlanLimits(plan);
  return generationsToday < maxGenerationsPerDay;
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