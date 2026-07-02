import type { SubscriptionStatus } from "@prisma/client";

const PRO_STATUSES: SubscriptionStatus[] = ["active", "trialing"];

export function isProSubscriptionStatus(status: SubscriptionStatus): boolean {
  return PRO_STATUSES.includes(status);
}