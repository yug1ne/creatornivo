import { ONBOARDING_STORAGE_KEY } from "@/config/onboarding";
import { prisma } from "@/lib/db";

export async function isOnboardingCompleted(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardingCompletedAt: true },
  });

  return Boolean(user?.onboardingCompletedAt);
}

export async function completeOnboarding(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { onboardingCompletedAt: new Date() },
  });
}

export function getLocalOnboardingKey(userId: string): string {
  return `${ONBOARDING_STORAGE_KEY}:${userId}`;
}

export function isOnboardingCompletedLocally(userId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(getLocalOnboardingKey(userId)) === "true";
}

export function markOnboardingCompletedLocally(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getLocalOnboardingKey(userId), "true");
}