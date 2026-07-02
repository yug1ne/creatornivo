import type { SubscriptionStatus } from "@prisma/client";

import { PLANS } from "@/config/plans";
import { prisma } from "@/lib/db";

const PRO_STATUSES: SubscriptionStatus[] = ["active", "trialing"];

export interface PaddleSubscriptionPayload {
  id: string;
  status: string;
  customer_id: string;
  custom_data?: Record<string, string> | null;
  current_billing_period?: {
    ends_at?: string;
  } | null;
  scheduled_change?: {
    action?: string;
  } | null;
  items?: Array<{
    price?: {
      id?: string;
    };
  }>;
}

export function mapPaddleStatus(status: string): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: "active",
    canceled: "canceled",
    past_due: "past_due",
    trialing: "trialing",
    paused: "canceled",
  };

  return statusMap[status] ?? "incomplete";
}

async function syncSubscriptionForUser(
  userId: string,
  subscription: PaddleSubscriptionPayload,
) {
  const status = mapPaddleStatus(subscription.status);
  const isPro = PRO_STATUSES.includes(status);
  const priceId = subscription.items?.[0]?.price?.id ?? null;
  const periodEnd = subscription.current_billing_period?.ends_at
    ? new Date(subscription.current_billing_period.ends_at)
    : null;

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      provider: "paddle",
      paddleCustomerId: subscription.customer_id,
      paddleSubscriptionId: subscription.id,
      paddlePriceId: priceId,
      status,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.scheduled_change?.action === "cancel",
    },
    update: {
      provider: "paddle",
      paddleCustomerId: subscription.customer_id,
      paddleSubscriptionId: subscription.id,
      paddlePriceId: priceId,
      status,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.scheduled_change?.action === "cancel",
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { plan: isPro ? PLANS.PRO : PLANS.FREE },
  });

  return { userId, plan: isPro ? PLANS.PRO : PLANS.FREE, status };
}

export async function syncSubscriptionFromPaddle(
  subscription: PaddleSubscriptionPayload,
  userId?: string,
) {
  const resolvedUserId =
    userId ?? subscription.custom_data?.userId ?? undefined;

  if (!resolvedUserId) {
    const record = await prisma.subscription.findUnique({
      where: { paddleCustomerId: subscription.customer_id },
      select: { userId: true },
    });

    if (!record) return null;
    return syncSubscriptionForUser(record.userId, subscription);
  }

  return syncSubscriptionForUser(resolvedUserId, subscription);
}

export async function downgradeUserToFree(userId: string) {
  await prisma.subscription.update({
    where: { userId },
    data: {
      status: "canceled",
      paddleSubscriptionId: null,
      stripeSubscriptionId: null,
      cancelAtPeriodEnd: false,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { plan: PLANS.FREE },
  });
}

