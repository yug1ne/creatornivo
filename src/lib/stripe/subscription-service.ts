import type { SubscriptionStatus } from "@prisma/client";
import type Stripe from "stripe";

import { PLANS } from "@/config/plans";
import { prisma } from "@/lib/db";

import { getStripe } from "./client";

const PRO_STATUSES: SubscriptionStatus[] = ["active", "trialing"];

export function mapStripeStatus(
  status: Stripe.Subscription.Status,
): SubscriptionStatus {
  const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
    active: "active",
    canceled: "canceled",
    past_due: "past_due",
    incomplete: "incomplete",
    incomplete_expired: "canceled",
    trialing: "trialing",
    unpaid: "unpaid",
    paused: "canceled",
  };

  return statusMap[status] ?? "incomplete";
}

export function isProSubscriptionStatus(status: SubscriptionStatus): boolean {
  return PRO_STATUSES.includes(status);
}

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string | null,
): Promise<string> {
  const existing = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (existing?.stripeCustomerId) {
    return existing.stripeCustomerId;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { userId },
  });

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customer.id,
      status: "incomplete",
    },
    update: {
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
}

export async function syncSubscriptionFromStripe(
  subscription: Stripe.Subscription,
  userId?: string,
) {
  const resolvedUserId =
    userId ?? subscription.metadata.userId ?? undefined;

  if (!resolvedUserId) {
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

    const record = await prisma.subscription.findUnique({
      where: { stripeCustomerId: customerId },
      select: { userId: true },
    });

    if (!record) return null;
    return syncSubscriptionForUser(record.userId, subscription);
  }

  return syncSubscriptionForUser(resolvedUserId, subscription);
}

async function syncSubscriptionForUser(
  userId: string,
  subscription: Stripe.Subscription,
) {
  const status = mapStripeStatus(subscription.status);
  const isPro = isProSubscriptionStatus(status);
  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price.id ?? null;
  const periodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000)
    : null;

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { plan: isPro ? PLANS.PRO : PLANS.FREE },
  });

  return { userId, plan: isPro ? PLANS.PRO : PLANS.FREE, status };
}

export async function downgradeUserToFree(userId: string) {
  await prisma.subscription.update({
    where: { userId },
    data: {
      status: "canceled",
      stripeSubscriptionId: null,
      cancelAtPeriodEnd: false,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { plan: PLANS.FREE },
  });
}