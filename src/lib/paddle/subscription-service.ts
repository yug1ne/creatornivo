import { Prisma, type SubscriptionStatus } from "@prisma/client";

import { PLANS, type Plan } from "@/config/plans";
import {
  getPaddleServerCheckoutConfig,
  isAllowedPaddlePriceId,
  type PaddleServerCheckoutConfig,
} from "@/config/paddle";
import { prisma } from "@/lib/db";
import {
  cancelPaddleSubscriptionImmediately,
  type PaddleCancellationResult,
} from "@/lib/paddle/subscription-cancel";

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

export const PADDLE_ADJUSTMENT_EVENT_TYPES = [
  "adjustment.created",
  "adjustment.updated",
] as const;

export type PaddleSubscriptionEventType =
  (typeof PADDLE_SUBSCRIPTION_EVENT_TYPES)[number];
export type PaddleTransactionEventType =
  (typeof PADDLE_TRANSACTION_EVENT_TYPES)[number];
export type PaddleAdjustmentEventType =
  (typeof PADDLE_ADJUSTMENT_EVENT_TYPES)[number];

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

export interface PaddleAdjustmentPayload {
  id: string;
  action: string;
  type?: string | null;
  status: string;
  transaction_id: string;
  subscription_id?: string | null;
  customer_id: string;
  currency_code?: string | null;
  totals?: {
    total?: string;
    currency_code?: string;
  } | null;
  created_at?: string;
  updated_at?: string;
}

export interface PaddleWebhookEventInput {
  eventId: string;
  eventType: string;
  occurredAt: Date;
  data:
    | PaddleSubscriptionPayload
    | PaddleTransactionPayload
    | PaddleAdjustmentPayload
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

interface PaddleAdjustmentRecord {
  id: string;
  paddleAdjustmentId: string;
  paddleTransactionId: string;
  paddleSubscriptionId: string | null;
  userId: string | null;
  occurredAt: Date;
  accessRevokedAt: Date | null;
  cancellationRequired: boolean;
  cancellationAttemptedAt: Date | null;
  cancellationCompletedAt: Date | null;
}

interface PaddleCancellationRequest {
  adjustmentId: string;
  paddleAdjustmentId: string;
  paddleSubscriptionId: string;
}

interface PaddleWebhookWorkResult {
  result: PaddleWebhookProcessingResult;
  cancellation: PaddleCancellationRequest | null;
}

export type CancelPaddleSubscription = (
  subscriptionId: string,
) => Promise<PaddleCancellationResult>;

class DuplicatePaddleWebhookEventError extends Error {}
export class RetryablePaddleWebhookError extends Error {}

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

export function isPaddleAdjustmentEventType(
  eventType: string,
): eventType is PaddleAdjustmentEventType {
  return PADDLE_ADJUSTMENT_EVENT_TYPES.some((type) => type === eventType);
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function getPrismaErrorCode(error: unknown): string | null {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : null;
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

export function isPaddleAdjustmentId(value: unknown): value is string {
  return typeof value === "string" && /^adj_[a-z0-9]+$/i.test(value);
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

interface AdjustmentDecision {
  accessAction: string;
  revokeAccess: boolean;
  revokeReason: string | null;
}

export function getAdjustmentDecision(
  adjustment: Pick<PaddleAdjustmentPayload, "action" | "status" | "type">,
): AdjustmentDecision {
  if (adjustment.action === "refund") {
    if (adjustment.status === "pending_approval") {
      return {
        accessAction: "refund_pending",
        revokeAccess: false,
        revokeReason: null,
      };
    }
    if (adjustment.status === "rejected") {
      return {
        accessAction: "refund_rejected",
        revokeAccess: false,
        revokeReason: null,
      };
    }
    if (adjustment.status === "approved" && adjustment.type === "full") {
      return {
        accessAction: "revoked_full_refund",
        revokeAccess: true,
        revokeReason: "full_refund",
      };
    }
    if (adjustment.status === "approved" && adjustment.type === "partial") {
      return {
        accessAction: "partial_refund_kept",
        revokeAccess: false,
        revokeReason: null,
      };
    }
  }

  if (adjustment.action === "chargeback") {
    return {
      accessAction: "revoked_chargeback",
      revokeAccess: true,
      revokeReason: "chargeback",
    };
  }

  if (adjustment.action === "chargeback_warning") {
    return {
      accessAction: "chargeback_warning",
      revokeAccess: false,
      revokeReason: null,
    };
  }

  if (
    adjustment.action === "chargeback_reverse" ||
    adjustment.action === "chargeback_warning_reverse" ||
    adjustment.action === "credit_reverse"
  ) {
    return {
      accessAction: "manual_review_reversal",
      revokeAccess: false,
      revokeReason: null,
    };
  }

  if (adjustment.action === "credit") {
    return {
      accessAction: "credit_no_access_change",
      revokeAccess: false,
      revokeReason: null,
    };
  }

  return {
    accessAction: "ignored_unsupported_adjustment",
    revokeAccess: false,
    revokeReason: null,
  };
}

async function resolveAdjustmentOwner(
  transaction: Prisma.TransactionClient,
  adjustment: PaddleAdjustmentPayload,
): Promise<{
  userId: string | null;
  paddleSubscriptionId: string | null;
  conflict: boolean;
}> {
  const subscription = isPaddleSubscriptionId(adjustment.subscription_id)
    ? await transaction.subscription.findUnique({
        where: { paddleSubscriptionId: adjustment.subscription_id },
      })
    : null;
  const intent = await findIntentByTransaction(
    transaction,
    adjustment.transaction_id,
  );

  if (
    subscription &&
    intent &&
    (subscription.userId !== intent.userId ||
      (intent.paddleSubscriptionId &&
        adjustment.subscription_id &&
        intent.paddleSubscriptionId !== adjustment.subscription_id))
  ) {
    return {
      userId: null,
      paddleSubscriptionId: adjustment.subscription_id ?? null,
      conflict: true,
    };
  }

  if (
    !subscription &&
    intent?.paddleSubscriptionId &&
    adjustment.subscription_id &&
    intent.paddleSubscriptionId !== adjustment.subscription_id
  ) {
    return {
      userId: null,
      paddleSubscriptionId: adjustment.subscription_id,
      conflict: true,
    };
  }

  const userId = subscription?.userId ?? intent?.userId ?? null;
  if (userId) {
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return {
        userId: null,
        paddleSubscriptionId:
          adjustment.subscription_id ??
          intent?.paddleSubscriptionId ??
          null,
        conflict: false,
      };
    }
  }

  return {
    userId,
    paddleSubscriptionId:
      adjustment.subscription_id ?? intent?.paddleSubscriptionId ?? null,
    conflict: false,
  };
}

function pendingCancellation(
  adjustment: PaddleAdjustmentRecord,
): PaddleCancellationRequest | null {
  return adjustment.cancellationRequired &&
    !adjustment.cancellationCompletedAt &&
    isPaddleSubscriptionId(adjustment.paddleSubscriptionId)
    ? {
        adjustmentId: adjustment.id,
        paddleAdjustmentId: adjustment.paddleAdjustmentId,
        paddleSubscriptionId: adjustment.paddleSubscriptionId,
      }
    : null;
}

async function applyAdjustmentEvent(
  transaction: Prisma.TransactionClient,
  event: PaddleWebhookEventInput,
): Promise<PaddleWebhookWorkResult> {
  const adjustment = event.data as PaddleAdjustmentPayload;
  if (
    !isPaddleAdjustmentId(adjustment.id) ||
    !isPaddleTransactionId(adjustment.transaction_id) ||
    (adjustment.subscription_id !== undefined &&
      adjustment.subscription_id !== null &&
      !isPaddleSubscriptionId(adjustment.subscription_id))
  ) {
    logIgnored(event.eventType, "invalid adjustment identity");
    return { result: "ignored", cancellation: null };
  }

  const existing = await transaction.paddleAdjustment.findUnique({
    where: { paddleAdjustmentId: adjustment.id },
  });

  if (
    existing &&
    (existing.paddleTransactionId !== adjustment.transaction_id ||
      (existing.paddleSubscriptionId &&
        adjustment.subscription_id &&
        existing.paddleSubscriptionId !== adjustment.subscription_id))
  ) {
    logIgnored(event.eventType, "adjustment identity changed");
    return { result: "ignored", cancellation: null };
  }

  if (existing && event.occurredAt <= existing.occurredAt) {
    return {
      result: "stale",
      cancellation: pendingCancellation(existing),
    };
  }

  const owner = await resolveAdjustmentOwner(transaction, adjustment);
  if (
    existing?.userId &&
    owner.userId &&
    existing.userId !== owner.userId
  ) {
    logIgnored(event.eventType, "adjustment owner changed");
    return { result: "ignored", cancellation: null };
  }

  const userId = existing?.userId ?? owner.userId;
  const paddleSubscriptionId =
    existing?.paddleSubscriptionId ?? owner.paddleSubscriptionId;
  const decision = getAdjustmentDecision(adjustment);
  const canApplyAccessDecision = Boolean(userId) && !owner.conflict;
  const currentSubscription = userId
    ? await transaction.subscription.findUnique({ where: { userId } })
    : null;
  const recordAccessRevocation =
    canApplyAccessDecision && decision.revokeAccess;
  const revokeCurrentAccess =
    recordAccessRevocation &&
    (!currentSubscription?.paddleSubscriptionId ||
      !paddleSubscriptionId ||
      currentSubscription.paddleSubscriptionId === paddleSubscriptionId);
  const accessAction = owner.conflict
    ? "ignored_owner_conflict"
    : userId
      ? decision.accessAction
      : "ignored_unresolved_owner";
  const cancellationRequired =
    !existing?.cancellationCompletedAt &&
    ((existing?.cancellationRequired ?? false) || recordAccessRevocation);
  const processedAt = new Date();

  const saved = await transaction.paddleAdjustment.upsert({
    where: { paddleAdjustmentId: adjustment.id },
    create: {
      paddleAdjustmentId: adjustment.id,
      paddleTransactionId: adjustment.transaction_id,
      paddleSubscriptionId,
      userId: owner.conflict ? null : userId,
      action: adjustment.action,
      type: adjustment.type ?? null,
      status: adjustment.status,
      currencyCode:
        adjustment.currency_code ??
        adjustment.totals?.currency_code ??
        null,
      total: adjustment.totals?.total ?? null,
      occurredAt: event.occurredAt,
      processedAt,
      accessAction,
      accessRevokedAt: recordAccessRevocation ? event.occurredAt : null,
      accessRevokedReason: recordAccessRevocation
        ? decision.revokeReason
        : null,
      cancellationRequired,
      lastEventId: event.eventId,
    },
    update: {
      paddleSubscriptionId,
      userId: owner.conflict ? existing?.userId : userId,
      action: adjustment.action,
      type: adjustment.type ?? null,
      status: adjustment.status,
      currencyCode:
        adjustment.currency_code ??
        adjustment.totals?.currency_code ??
        null,
      total: adjustment.totals?.total ?? null,
      occurredAt: event.occurredAt,
      processedAt,
      accessAction,
      ...(recordAccessRevocation && !existing?.accessRevokedAt
        ? {
            accessRevokedAt: event.occurredAt,
            accessRevokedReason: decision.revokeReason,
          }
        : {}),
      cancellationRequired,
      lastEventId: event.eventId,
    },
  });

  if (revokeCurrentAccess && userId) {
    await transaction.user.update({
      where: { id: userId },
      data: { plan: PLANS.FREE },
    });
  }

  return {
    result: owner.conflict || !userId ? "ignored" : "processed",
    cancellation: pendingCancellation(saved),
  };
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

  const currentSubscription = await transaction.subscription.findUnique({
    where: { userId: intent.userId },
  });
  if (
    currentSubscription?.paddleSubscriptionId &&
    currentSubscription.paddleSubscriptionId !== subscription.id
  ) {
    const incomingRevocation = await transaction.paddleAdjustment.findFirst({
      where: {
        paddleSubscriptionId: subscription.id,
        accessRevokedAt: { not: null },
      },
      select: { id: true },
    });
    if (incomingRevocation) {
      logIgnored(event.eventType, "refunded subscription is no longer current");
      return null;
    }
  }

  return { existing: null, intent, user, priceId };
}

function nextPlan(
  eventType: PaddleSubscriptionEventType,
  status: SubscriptionStatus,
  currentPlan: Plan,
): Plan {
  if (eventType === "subscription.created") {
    return currentPlan;
  }
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

function shouldPreserveExistingAtSameTimestamp(
  existingStatus: string | null,
  eventType: PaddleSubscriptionEventType,
  incomingStatus: string,
): boolean {
  const statusRank: Record<string, number> = {
    trialing: 0,
    active: 1,
    past_due: 2,
    paused: 3,
    canceled: 4,
  };

  if (
    eventType === "subscription.resumed" &&
    incomingStatus === "active" &&
    (existingStatus === "paused" || existingStatus === "past_due")
  ) {
    return false;
  }
  if (
    eventType === "subscription.activated" &&
    incomingStatus === "active" &&
    (existingStatus === "trialing" || existingStatus === "past_due")
  ) {
    return false;
  }
  if (existingStatus === "active" && incomingStatus === "trialing") {
    return true;
  }

  return (
    (statusRank[incomingStatus] ?? -1) < (statusRank[existingStatus ?? ""] ?? -1)
  );
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
    event.occurredAt < owner.existing.lastPaddleEventAt
  ) {
    return "stale";
  }

  const sameTimestamp =
    owner.existing?.lastPaddleEventAt?.getTime() === event.occurredAt.getTime();
  const preserveExisting =
    Boolean(owner.existing) &&
    (event.eventType === "subscription.created" ||
      (sameTimestamp &&
        shouldPreserveExistingAtSameTimestamp(
          owner.existing?.paddleStatus ?? null,
          event.eventType as PaddleSubscriptionEventType,
          subscription.status,
        )));
  if (preserveExisting) {
    if (owner.intent && event.eventType === "subscription.created") {
      await advanceIntent(
        transaction,
        owner.intent,
        "subscription_bound",
        { subscriptionId: subscription.id },
      );
    }
    return "processed";
  }

  const accessRevocation = await transaction.paddleAdjustment.findFirst({
    where: {
      paddleSubscriptionId: subscription.id,
      accessRevokedAt: { not: null },
    },
    select: { id: true },
  });
  const status = mapPaddleStatus(subscription.status);
  const plan = accessRevocation
    ? PLANS.FREE
    : nextPlan(
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

type PaddleWebhookDatabase = Pick<typeof prisma, "$transaction">;

async function runSerializableWithRetry<T>(
  database: PaddleWebhookDatabase,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await database.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (error instanceof DuplicatePaddleWebhookEventError) throw error;

      const code = getPrismaErrorCode(error);
      if ((code === "P2002" || code === "P2034") && attempt < 3) {
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new Error("Paddle webhook transaction retry exhausted");
}

async function processWebhookTransaction(
  event: PaddleWebhookEventInput,
  database: PaddleWebhookDatabase,
  config: PaddleServerCheckoutConfig,
): Promise<PaddleWebhookWorkResult> {
  return runSerializableWithRetry(database, async (transaction) => {
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
      return {
        result: await applyTransactionCompleted(transaction, event, config),
        cancellation: null,
      };
    }
    if (isPaddleSubscriptionEventType(event.eventType)) {
      return {
        result: await applySubscriptionEvent(transaction, event, config),
        cancellation: null,
      };
    }
    if (isPaddleAdjustmentEventType(event.eventType)) {
      return applyAdjustmentEvent(transaction, event);
    }
    return { result: "ignored", cancellation: null };
  });
}

async function findPendingCancellationForEvent(
  event: PaddleWebhookEventInput,
  database: PaddleWebhookDatabase,
): Promise<PaddleCancellationRequest | null> {
  if (
    !isPaddleAdjustmentEventType(event.eventType) ||
    !isPaddleAdjustmentId((event.data as PaddleAdjustmentPayload).id)
  ) {
    return null;
  }

  return runSerializableWithRetry(database, async (transaction) => {
    const adjustment = await transaction.paddleAdjustment.findUnique({
      where: {
        paddleAdjustmentId: (event.data as PaddleAdjustmentPayload).id,
      },
    });
    return adjustment ? pendingCancellation(adjustment) : null;
  });
}

async function completePaddleCancellation(
  request: PaddleCancellationRequest,
  database: PaddleWebhookDatabase,
  cancelSubscription: CancelPaddleSubscription,
): Promise<void> {
  const attemptedAt = new Date();
  const staleBefore = new Date(attemptedAt.getTime() - 5 * 60 * 1000);
  const claim = await runSerializableWithRetry(
    database,
    async (transaction) => {
      const claimed = await transaction.paddleAdjustment.updateMany({
        where: {
          id: request.adjustmentId,
          paddleAdjustmentId: request.paddleAdjustmentId,
          paddleSubscriptionId: request.paddleSubscriptionId,
          cancellationRequired: true,
          cancellationCompletedAt: null,
          OR: [
            { cancellationAttemptedAt: null },
            { cancellationAttemptedAt: { lt: staleBefore } },
          ],
        },
        data: { cancellationAttemptedAt: attemptedAt },
      });
      if (claimed.count === 1) return "claimed" as const;

      const current = await transaction.paddleAdjustment.findUnique({
        where: { paddleAdjustmentId: request.paddleAdjustmentId },
      });
      return current?.cancellationCompletedAt
        ? ("completed" as const)
        : ("in_progress" as const);
    },
  );

  if (claim === "completed") return;
  if (claim === "in_progress") {
    throw new RetryablePaddleWebhookError(
      "Paddle subscription cancellation is already in progress",
    );
  }

  try {
    await cancelSubscription(request.paddleSubscriptionId);
  } catch (error) {
    await runSerializableWithRetry(database, async (transaction) => {
      await transaction.paddleAdjustment.updateMany({
        where: {
          id: request.adjustmentId,
          cancellationAttemptedAt: attemptedAt,
          cancellationCompletedAt: null,
        },
        data: { cancellationAttemptedAt: null },
      });
    });
    throw error;
  }

  await runSerializableWithRetry(database, async (transaction) => {
    const completed = await transaction.paddleAdjustment.updateMany({
      where: {
        id: request.adjustmentId,
        paddleAdjustmentId: request.paddleAdjustmentId,
        paddleSubscriptionId: request.paddleSubscriptionId,
        cancellationAttemptedAt: attemptedAt,
        cancellationCompletedAt: null,
      },
      data: {
        cancellationRequired: false,
        cancellationCompletedAt: new Date(),
      },
    });
    if (completed.count !== 1) {
      throw new RetryablePaddleWebhookError(
        "Paddle cancellation result could not be persisted",
      );
    }
  });
}

export async function processPaddleWebhookEvent(
  event: PaddleWebhookEventInput,
  database: PaddleWebhookDatabase = prisma,
  config = getPaddleServerCheckoutConfig(),
  cancelSubscription: CancelPaddleSubscription =
    cancelPaddleSubscriptionImmediately,
): Promise<PaddleWebhookProcessingResult> {
  let work: PaddleWebhookWorkResult;

  try {
    work = await processWebhookTransaction(event, database, config);
  } catch (error) {
    if (!(error instanceof DuplicatePaddleWebhookEventError)) throw error;

    work = {
      result: "duplicate",
      cancellation: await findPendingCancellationForEvent(event, database),
    };
  }

  if (work.cancellation) {
    await completePaddleCancellation(
      work.cancellation,
      database,
      cancelSubscription,
    );
  }

  return work.result;
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
