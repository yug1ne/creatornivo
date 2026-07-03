import type { Prisma, SubscriptionStatus } from "@prisma/client";

import { PLANS, type Plan } from "@/config/plans";
import {
  getPaddleServerCheckoutConfig,
  isAllowedPaddlePriceId,
  type PaddleServerCheckoutConfig,
} from "@/config/paddle";
import { prisma } from "@/lib/db";

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

export const PADDLE_TRANSACTION_EVENT_TYPES = ["transaction.completed"] as const;

export type PaddleSubscriptionEventType =
  (typeof PADDLE_SUBSCRIPTION_EVENT_TYPES)[number];
export type PaddleTransactionEventType =
  (typeof PADDLE_TRANSACTION_EVENT_TYPES)[number];

interface PaddleItem {
  quantity?: number;
  price_id?: string;
  price?: {
    id?: string;
  };
}

interface PaddleCustomData {
  checkoutIntentId?: string;
  userId?: string;
}

export interface PaddleSubscriptionPayload {
  id: string;
  status: string;
  customer_id: string;
  transaction_id?: string | null;
  custom_data?: PaddleCustomData | null;
  current_billing_period?: {
    ends_at?: string;
  } | null;
  scheduled_change?: {
    action?: string;
  } | null;
  items?: PaddleItem[];
}

export interface PaddleTransactionPayload {
  id: string;
  status?: string;
  subscription_id?: string | null;
  custom_data?: PaddleCustomData | null;
  items?: PaddleItem[];
}

export interface PaddleWebhookEventInput {
  eventId: string;
  eventType: string;
  occurredAt: Date;
  data:
    | PaddleSubscriptionPayload
    | PaddleTransactionPayload
    | Record<string, unknown>;
}

export type PaddleWebhookProcessingResult =
  | "processed"
  | "duplicate"
  | "stale"
  | "ignored";

interface CheckoutIntentRecord {
  id: string;
  userId: string;
  priceId: string;
  paddleTransactionId: string | null;
  paddleSubscriptionId: string | null;
  status: string;
  expiresAt: Date;
  completedAt: Date | null;
}

class DuplicatePaddleWebhookEventError extends Error {}
class RetryablePaddleWebhookError extends Error {}

const INTENT_STATUS_RANK: Record<string, number> = {
  pending: 0,
  expired: 0,
  transaction_created: 1,
  transaction_completed: 2,
  subscription_bound: 3,
  completed: 4,
};

export function isPaddleSubscriptionEventType(
  eventType: string,
): eventType is PaddleSubscriptionEventType {
  return PADDLE_SUBSCRIPTION_EVENT_TYPES.some((type) => type === eventType);
}

export function isPaddleTransactionEventType(
  eventType: string,
): eventType is PaddleTransactionEventType {
  return PADDLE_TRANSACTION_EVENT_TYPES.some((type) => type === eventType);
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

export function isPaddleSubscriptionId(value: unknown): value is string {
  return typeof value === "string" && /^sub_[a-z0-9]+$/i.test(value);
}

export function isPaddleCustomerId(value: unknown): value is string {
  return typeof value === "string" && /^ctm_[a-z0-9]+$/i.test(value);
}

export function isPaddleTransactionId(value: unknown): value is string {
  return typeof value === "string" && /^txn_[a-z0-9]+$/i.test(value);
}

function getPriceAndQuantity(payload: {
  items?: PaddleItem[];
}): { priceId: string | null; quantity: number | null } {
  if (!payload.items || payload.items.length !== 1) {
    return { priceId: null, quantity: null };
  }

  const item = payload.items[0];
  const priceId = item.price?.id ?? item.price_id;

  return {
    priceId:
      typeof priceId === "string" && priceId.length > 0 ? priceId : null,
    quantity: typeof item.quantity === "number" ? item.quantity : null,
  };
}

function getPeriodEnd(subscription: PaddleSubscriptionPayload): Date | null {
  const endsAt = subscription.current_billing_period?.ends_at;
  return endsAt ? new Date(endsAt) : null;
}

function logIgnored(eventType: string, reason: string) {
  console.warn(`Ignored Paddle ${eventType}: ${reason}`);
}

function validateIntent(
  intent: CheckoutIntentRecord | null,
  event: PaddleWebhookEventInput,
  transactionId: string,
  checkoutIntentId: string | undefined,
  priceId: string | null,
  quantity: number | null,
  subscriptionId: string | null,
  config: PaddleServerCheckoutConfig,
): intent is CheckoutIntentRecord {
  if (!intent) {
    logIgnored(event.eventType, "checkout intent not found");
    return false;
  }
  if (
    intent.paddleTransactionId !== transactionId ||
    (checkoutIntentId && checkoutIntentId !== intent.id)
  ) {
    logIgnored(event.eventType, "checkout intent identity mismatch");
    return false;
  }
  if (
    !isAllowedPaddlePriceId(intent.priceId, config) ||
    priceId !== intent.priceId ||
    quantity !== 1
  ) {
    logIgnored(event.eventType, "price or quantity mismatch");
    return false;
  }
  if (!isPaddleTransactionId(intent.paddleTransactionId)) {
    logIgnored(event.eventType, "checkout intent has no server transaction");
    return false;
  }
  if (
    subscriptionId &&
    intent.paddleSubscriptionId &&
    intent.paddleSubscriptionId !== subscriptionId
  ) {
    logIgnored(event.eventType, "checkout intent belongs to another subscription");
    return false;
  }
  return true;
}

async function findIntentByTransaction(
  transaction: Prisma.TransactionClient,
  transactionId: string,
): Promise<CheckoutIntentRecord | null> {
  return transaction.paddleCheckoutIntent.findUnique({
    where: { paddleTransactionId: transactionId },
  });
}

async function findIntentById(
  transaction: Prisma.TransactionClient,
  intentId: string,
): Promise<CheckoutIntentRecord | null> {
  return transaction.paddleCheckoutIntent.findUnique({
    where: { id: intentId },
  });
}

async function advanceIntent(
  transaction: Prisma.TransactionClient,
  intent: CheckoutIntentRecord,
  targetStatus: "transaction_completed" | "subscription_bound" | "completed",
  options: {
    subscriptionId?: string;
    completedAt?: Date;
  } = {},
) {
  if (
    options.subscriptionId &&
    intent.paddleSubscriptionId &&
    intent.paddleSubscriptionId !== options.subscriptionId
  ) {
    throw new Error("Paddle checkout intent subscription mismatch");
  }

  if (
    (INTENT_STATUS_RANK[intent.status] ?? -1) >=
    INTENT_STATUS_RANK[targetStatus]
  ) {
    return;
  }

  await transaction.paddleCheckoutIntent.update({
    where: { id: intent.id },
    data: {
      status: targetStatus,
      ...(options.subscriptionId
        ? { paddleSubscriptionId: options.subscriptionId }
        : {}),
      ...(targetStatus === "completed" && options.completedAt
        ? { completedAt: options.completedAt }
        : {}),
    },
  });
}

async function applyTransactionCompleted(
  transaction: Prisma.TransactionClient,
  event: PaddleWebhookEventInput,
  config: PaddleServerCheckoutConfig,
): Promise<PaddleWebhookProcessingResult> {
  const payload = event.data as PaddleTransactionPayload;
  if (!isPaddleTransactionId(payload.id)) {
    logIgnored(event.eventType, "invalid transaction ID");
    return "ignored";
  }

  const { priceId, quantity } = getPriceAndQuantity(payload);
  const intent =
    (await findIntentByTransaction(transaction, payload.id)) ??
    (payload.custom_data?.checkoutIntentId
      ? await findIntentById(
          transaction,
          payload.custom_data.checkoutIntentId,
        )
      : null);
  if (
    intent &&
    !intent.paddleTransactionId &&
    payload.custom_data?.checkoutIntentId === intent.id
  ) {
    throw new RetryablePaddleWebhookError(
      "Paddle transaction is not attached to checkout intent yet",
    );
  }
  if (
    !validateIntent(
      intent,
      event,
      payload.id,
      payload.custom_data?.checkoutIntentId,
      priceId,
      quantity,
      null,
      config,
    )
  ) {
    return "ignored";
  }

  await advanceIntent(transaction, intent, "transaction_completed");

  return "processed";
}

async function resolveSubscriptionOwner(
  transaction: Prisma.TransactionClient,
  event: PaddleWebhookEventInput,
  subscription: PaddleSubscriptionPayload,
  priceId: string | null,
  quantity: number | null,
  config: PaddleServerCheckoutConfig,
) {
  const existing = await transaction.subscription.findUnique({
    where: { paddleSubscriptionId: subscription.id },
  });

  if (existing) {
    const effectivePriceId = priceId ?? existing.paddlePriceId;
    if (
      !effectivePriceId ||
      !isAllowedPaddlePriceId(effectivePriceId, config) ||
      (quantity !== null && quantity !== 1)
    ) {
      logIgnored(event.eventType, "subscription price is not allowed");
      return null;
    }

    const user = await transaction.user.findUnique({
      where: { id: existing.userId },
      select: { id: true, plan: true },
    });
    if (!user) {
      logIgnored(event.eventType, "subscription user not found");
      return null;
    }

    let intent: CheckoutIntentRecord | null = null;
    const checkoutIntentId = subscription.custom_data?.checkoutIntentId;
    if (isPaddleTransactionId(subscription.transaction_id) || checkoutIntentId) {
      const candidate = isPaddleTransactionId(subscription.transaction_id)
        ? await findIntentByTransaction(
            transaction,
            subscription.transaction_id,
          )
        : await findIntentById(transaction, checkoutIntentId!);
      const transactionId = isPaddleTransactionId(subscription.transaction_id)
        ? subscription.transaction_id
        : candidate?.paddleTransactionId;
      if (
        candidate &&
        isPaddleTransactionId(transactionId) &&
        validateIntent(
          candidate,
          event,
          transactionId,
          checkoutIntentId,
          priceId,
          quantity,
          subscription.id,
          config,
        )
      ) {
        intent = candidate;
      }
    }

    return { existing, intent, user, priceId: effectivePriceId };
  }

  if (!priceId || quantity !== 1) {
    logIgnored(event.eventType, "first subscription has no valid transaction");
    return null;
  }

  const checkoutIntentId = subscription.custom_data?.checkoutIntentId;
  const intent = isPaddleTransactionId(subscription.transaction_id)
    ? await findIntentByTransaction(transaction, subscription.transaction_id)
    : checkoutIntentId
      ? await findIntentById(transaction, checkoutIntentId)
      : null;

  if (
    !intent &&
    event.eventType === "subscription.activated" &&
    subscription.status === "active" &&
    (subscription.transaction_id || checkoutIntentId)
  ) {
    throw new RetryablePaddleWebhookError(
      "Paddle checkout intent is not available yet",
    );
  }

  const transactionId = isPaddleTransactionId(subscription.transaction_id)
    ? subscription.transaction_id
    : intent?.paddleTransactionId;
  if (
    intent &&
    !isPaddleTransactionId(transactionId) &&
    event.eventType === "subscription.activated" &&
    subscription.status === "active"
  ) {
    throw new RetryablePaddleWebhookError(
      "Paddle transaction is not attached to checkout intent yet",
    );
  }
  if (
    !isPaddleTransactionId(transactionId) ||
    !validateIntent(
      intent,
      event,
      transactionId,
      checkoutIntentId,
      priceId,
      quantity,
      subscription.id,
      config,
    )
  ) {
    return null;
  }

  const user = await transaction.user.findUnique({
    where: { id: intent.userId },
    select: { id: true, plan: true },
  });
  if (!user) {
    logIgnored(event.eventType, "checkout intent user not found");
    return null;
  }

  return { existing: null, intent, user, priceId };
}

function nextPlan(
  eventType: PaddleSubscriptionEventType,
  status: SubscriptionStatus,
  currentPlan: Plan,
): Plan {
  if (eventType === "subscription.activated") {
    return status === "active" ? PLANS.PRO : PLANS.FREE;
  }
  if (eventType === "subscription.resumed") {
    return status === "active" ? PLANS.PRO : PLANS.FREE;
  }
  if (eventType === "subscription.updated" && status === "active") {
    return currentPlan;
  }
  return PLANS.FREE;
}

async function applySubscriptionEvent(
  transaction: Prisma.TransactionClient,
  event: PaddleWebhookEventInput,
  config: PaddleServerCheckoutConfig,
): Promise<PaddleWebhookProcessingResult> {
  const subscription = event.data as PaddleSubscriptionPayload;
  if (
    !isPaddleSubscriptionId(subscription.id) ||
    !isPaddleCustomerId(subscription.customer_id)
  ) {
    logIgnored(event.eventType, "invalid subscription or customer ID");
    return "ignored";
  }

  const { priceId, quantity } = getPriceAndQuantity(subscription);
  const owner = await resolveSubscriptionOwner(
    transaction,
    event,
    subscription,
    priceId,
    quantity,
    config,
  );
  if (!owner) return "ignored";

  if (
    owner.existing?.lastPaddleEventAt &&
    event.occurredAt <= owner.existing.lastPaddleEventAt
  ) {
    return "stale";
  }

  const status = mapPaddleStatus(subscription.status);
  const plan = nextPlan(
    event.eventType as PaddleSubscriptionEventType,
    status,
    owner.user.plan,
  );
  const claimEarlyAccess =
    event.eventType === "subscription.activated" &&
    status === "active" &&
    owner.priceId === config.earlyAccessPriceId;
  const sharedData = {
    provider: "paddle" as const,
    paddleCustomerId: subscription.customer_id,
    paddleSubscriptionId: subscription.id,
    paddlePriceId: owner.priceId,
    paddleStatus: subscription.status,
    status,
    currentPeriodEnd: getPeriodEnd(subscription),
    cancelAtPeriodEnd: subscription.scheduled_change?.action === "cancel",
    lastPaddleEventAt: event.occurredAt,
  };

  await transaction.subscription.upsert({
    where: { userId: owner.user.id },
    create: {
      userId: owner.user.id,
      ...sharedData,
      earlyAccessClaimedAt: claimEarlyAccess ? event.occurredAt : null,
    },
    update: {
      ...sharedData,
      ...(claimEarlyAccess && !owner.existing?.earlyAccessClaimedAt
        ? { earlyAccessClaimedAt: event.occurredAt }
        : {}),
    },
  });

  await transaction.user.update({
    where: { id: owner.user.id },
    data: { plan },
  });

  if (owner.intent) {
    await advanceIntent(
      transaction,
      owner.intent,
      event.eventType === "subscription.activated" && status === "active"
        ? "completed"
        : "subscription_bound",
      {
        subscriptionId: subscription.id,
        completedAt: event.occurredAt,
      },
    );
  }

  return "processed";
}

export async function processPaddleWebhookEvent(
  event: PaddleWebhookEventInput,
  database: Pick<typeof prisma, "$transaction"> = prisma,
  config = getPaddleServerCheckoutConfig(),
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

      if (isPaddleTransactionEventType(event.eventType)) {
        return applyTransactionCompleted(transaction, event, config);
      }
      if (isPaddleSubscriptionEventType(event.eventType)) {
        return applySubscriptionEvent(transaction, event, config);
      }
      return "ignored";
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
