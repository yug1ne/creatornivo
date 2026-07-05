import { getPaddleCheckoutBlock } from "@/app/api/paddle/checkout/route";
import type { Plan } from "@/config/plans";
import type { UserRole } from "@/types/user";

import { ACCOUNT_DELETION_SUBSCRIPTION_MESSAGE } from "./account-deletion-constants";

export { ACCOUNT_DELETION_CONFIRMATION_TEXT } from "./account-deletion-constants";

export type AccountDeletionBlockCode =
  | "subscription_active"
  | "subscription_requires_action"
  | "generation_in_progress"
  | "admin_account";

export interface AccountDeletionUserState {
  id: string;
  email: string;
  plan: Plan;
  role: UserRole;
  subscription: {
    provider: string;
    status: string;
    paddleStatus: string | null;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
  } | null;
}

export interface AccountDeletionBlock {
  code: AccountDeletionBlockCode;
  message: string;
  manageSubscription: boolean;
}

function getStripeDeletionBlock(
  user: AccountDeletionUserState,
  now = new Date(),
): AccountDeletionBlock | null {
  const subscription = user.subscription;
  if (!subscription || subscription.provider !== "stripe") {
    return null;
  }

  if (subscription.status === "past_due" || subscription.status === "unpaid") {
    return {
      code: "subscription_requires_action",
      message:
        "Your existing subscription requires attention. Manage it in the Customer Portal.",
      manageSubscription: true,
    };
  }

  const paidPeriodIsActive =
    subscription.currentPeriodEnd !== null &&
    subscription.currentPeriodEnd > now;

  if (
    subscription.status === "active" ||
    subscription.status === "trialing" ||
    (subscription.cancelAtPeriodEnd && paidPeriodIsActive) ||
    (user.plan === "pro" && paidPeriodIsActive)
  ) {
    return {
      code: "subscription_active",
      message: ACCOUNT_DELETION_SUBSCRIPTION_MESSAGE,
      manageSubscription: true,
    };
  }

  return null;
}

export function getAccountDeletionBlock(
  user: AccountDeletionUserState,
  now = new Date(),
): AccountDeletionBlock | null {
  if (user.role === "admin") {
    return {
      code: "admin_account",
      message: "Admin accounts cannot be deleted through self-service.",
      manageSubscription: false,
    };
  }

  const paddleBlock = getPaddleCheckoutBlock(user, now);
  if (paddleBlock) {
    return {
      code:
        paddleBlock.code === "subscription_requires_action"
          ? "subscription_requires_action"
          : "subscription_active",
      message:
        paddleBlock.code === "subscription_requires_action"
          ? paddleBlock.message
          : ACCOUNT_DELETION_SUBSCRIPTION_MESSAGE,
      manageSubscription: true,
    };
  }

  const stripeBlock = getStripeDeletionBlock(user, now);
  if (stripeBlock) {
    return stripeBlock;
  }

  return null;
}

export function hasActiveGenerationReservations(input: {
  reservations: Array<{ status: string; expiresAt: Date }>;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();

  return input.reservations.some(
    (reservation) =>
      (reservation.status === "reserved" || reservation.status === "started") &&
      reservation.expiresAt > now,
  );
}