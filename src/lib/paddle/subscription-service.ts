import type { Prisma, SubscriptionStatus } from "@prisma/client";

import { PLANS } from "@/config/plans";
import { paddleConfig } from "@/config/paddle";
import { prisma } from "@/lib/db";

const PRO_STATUSES: SubscriptionStatus[] = ["active", "trialing"];

export const PADDLE_SUBSCRIPTION_EVENT_TYPES = [
  "subscription.created",
  "subscription.activated",
  "subscription.updated",
  "subscription.trialing",
  "subscription.past_due",
  "subscription.resumed",
  "subscription.canceled",
  "subscription.paused",
] as const;

export type PaddleSubscriptionEventType =
  (typeof PADDLE_SUBSCRIPTION_EVENT_TYPES)[number];

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

export interface PaddleWebhookEventInput {
  eventId: string;
  eventType: string;
  occurredAt: Date;
  data: PaddleSubscriptionPayload | Record<string, unknown>;
}

export type PaddleWebhookProcessingResult =
  | "processed"
  | "duplicate"
  | "stale"
  | "ignored";

class DuplicatePaddleWebhookEventError extends Error {}

export function isPaddleSubscriptionEventType(
  eventType: string,
): eventType is PaddleSubscriptionEventType {
  return PADDLE_SUBSCRIPTION_EVENT_TYPES.some((type) => type === eventType);
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
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

function getPriceId(subscription: PaddleSubscriptionPayload): string | null {
  const priceId = subscription.items?.[0]?.price?.id;
  return typeof priceId === "string" && priceId.length > 0 ? priceId : null;
}

function getPeriodEnd(subscription: PaddleSubscriptionPayload): Date | null {
  const endsAt = subscription.current_billing_period?.ends_at;
  return endsAt ? new Date(endsAt) : null;
}

function shouldClaimEarlyAccess(
  event: PaddleWebhookEventInput,
  subscription: PaddleSubscriptionPayload,
  priceId: string | null,
  earlyAccessPriceId: string,
): boolean {
  return (
    event.eventType === "subscription.activated" &&
    subscription.status === "active" &&
    Boolean(earlyAccessPriceId) &&
    priceId === earlyAccessPriceId
  );
}

async function findExistingSubscription(
  transaction: Prisma.TransactionClient,
  subscription: PaddleSubscriptionPayload,
) {
  const bySubscriptionId = await transaction.subscription.findUnique({
    where: { paddleSubscriptionId: subscription.id },
  });

  if (bySubscriptionId) {
    return bySubscriptionId;
  }

  const userId = subscription.custom_data?.userId;

  if (userId) {
    const byUser = await transaction.subscription.findUnique({
      where: { userId },
    });

    if (byUser) {
      return byUser;
    }
  }

  return transaction.subscription.findUnique({
    where: { paddleCustomerId: subscription.customer_id },
  });
}

async function applySubscriptionEvent(
  transaction: Prisma.TransactionClient,
  event: PaddleWebhookEventInput,
  earlyAccessPriceId: string,
): Promise<PaddleWebhookProcessingResult> {
  if (!isPaddleSubscriptionEventType(event.eventType)) {
    return "ignored";
  }

  const subscription = event.data as PaddleSubscriptionPayload;
  const existing = await findExistingSubscription(transaction, subscription);

  if (
    existing?.lastPaddleEventAt &&
    event.occurredAt <= existing.lastPaddleEventAt
  ) {
    return "stale";
  }

  const userId = existing?.userId ?? subscription.custom_data?.userId;

  if (!userId) {
    return "ignored";
  }

  const status = mapPaddleStatus(subscription.status);
  const isPro = PRO_STATUSES.includes(status);
  const priceId = getPriceId(subscription);
  const periodEnd = getPeriodEnd(subscription);
  const claimEarlyAccess = shouldClaimEarlyAccess(
    event,
    subscription,
    priceId,
    earlyAccessPriceId,
  );
  const sharedData = {
    provider: "paddle" as const,
    paddleCustomerId: subscription.customer_id,
    paddleSubscriptionId: subscription.id,
    status,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: subscription.scheduled_change?.action === "cancel",
    lastPaddleEventAt: event.occurredAt,
  };

  if (existing) {
    await transaction.subscription.update({
      where: { id: existing.id },
      data: {
        ...sharedData,
        ...(priceId ? { paddlePriceId: priceId } : {}),
        ...(claimEarlyAccess && !existing.earlyAccessClaimedAt
          ? { earlyAccessClaimedAt: event.occurredAt }
          : {}),
      },
    });
  } else {
    const saved = await transaction.subscription.upsert({
      where: { userId },
      create: {
        userId,
        ...sharedData,
        paddlePriceId: priceId,
        earlyAccessClaimedAt: claimEarlyAccess ? event.occurredAt : null,
      },
      update: {
        ...sharedData,
        ...(priceId ? { paddlePriceId: priceId } : {}),
      },
      select: {
        id: true,
        earlyAccessClaimedAt: true,
      },
    });

    if (claimEarlyAccess && !saved.earlyAccessClaimedAt) {
      await transaction.subscription.update({
        where: { id: saved.id },
        data: { earlyAccessClaimedAt: event.occurredAt },
      });
    }
  }

  await transaction.user.update({
    where: { id: userId },
    data: { plan: isPro ? PLANS.PRO : PLANS.FREE },
  });

  return "processed";
}

export async function processPaddleWebhookEvent(
  event: PaddleWebhookEventInput,
  database: Pick<typeof prisma, "$transaction"> = prisma,
  earlyAccessPriceId = paddleConfig.earlyAccessPriceId,
): Promise<PaddleWebhookProcessingResult> {
  try {
    return await database.$transaction(async (transaction) => {
      try {
        await transaction.paddleWebhookEvent.create({
          data: {
            eventId: event.eventId,
            eventType: event.eventType,
            occurredAt: event.occurredAt,
          },
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new DuplicatePaddleWebhookEventError();
        }

        throw error;
      }

      return applySubscriptionEvent(
        transaction,
        event,
        earlyAccessPriceId,
      );
    });
  } catch (error) {
    if (error instanceof DuplicatePaddleWebhookEventError) {
      return "duplicate";
    }

    throw error;
  }
}

export async function downgradeUserToFree(userId: string) {
  await prisma.$transaction([
    prisma.subscription.update({
      where: { userId },
      data: {
        status: "canceled",
        cancelAtPeriodEnd: false,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { plan: PLANS.FREE },
    }),
  ]);
}
