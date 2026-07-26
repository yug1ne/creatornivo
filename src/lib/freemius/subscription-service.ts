import type { Plan, Prisma, SubscriptionStatus } from "@prisma/client";

import {
  getFreemiusAllowlist,
  isAllowedFreemiusPlanId,
  isAllowedFreemiusPricingId,
  isAllowedFreemiusProductId,
  type FreemiusBillingInterval,
} from "@/config/freemius";
import { PLANS } from "@/config/plans";
import { sendProConfirmationEmail } from "@/lib/email/send-pro-confirmation";
import { prisma } from "@/lib/db";

export const FREEMIUS_HANDLED_EVENT_TYPES = [
  "license.created",
  "license.activated",
  "license.updated",
  "license.extended",
  "license.cancelled",
  "license.expired",
  "license.deleted",
  "subscription.created",
  "subscription.cancelled",
  "subscription.renewal.failed",
  "subscription.renewal.failed.last",
  "subscription.renewal.retry",
  "payment.created",
  "payment.refund",
  "payment.dispute.created",
  "payment.dispute.opened",
] as const;

export type FreemiusHandledEventType =
  (typeof FREEMIUS_HANDLED_EVENT_TYPES)[number];

export type FreemiusWebhookProcessingResult =
  | "processed"
  | "duplicate"
  | "ignored"
  | "stale"
  | "orphan";

export type FreemiusWebhookEventInput = {
  eventId: string;
  eventType: string;
  occurredAt: Date;
  /** Normalized objects extracted from Freemius payload */
  objects: FreemiusWebhookObjects;
  raw: Record<string, unknown>;
};

export type FreemiusWebhookObjects = {
  productId: string | null;
  planId: string | null;
  pricingId: string | null;
  freemiusUserId: string | null;
  freemiusLicenseId: string | null;
  freemiusSubscriptionId: string | null;
  email: string | null;
  emailVerified: boolean;
  billingInterval: FreemiusBillingInterval | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean | null;
  /** Custom metadata from checkout (Phase 3+) */
  creatornivoUserId: string | null;
  checkoutIntentId: string | null;
  isRefund: boolean;
  isDispute: boolean;
};

/** Minimal DB surface for webhook processing (Prisma or in-memory test double). */
export type FreemiusWebhookDatabase = {
  $transaction: <T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    // options accepted by Prisma; ignored by simple test doubles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options?: any,
  ) => Promise<T>;
};

class DuplicateFreemiusWebhookEventError extends Error {
  constructor() {
    super("duplicate_freemius_webhook_event");
    this.name = "DuplicateFreemiusWebhookEventError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asIdString(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return asNonEmptyString(value);
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    // Freemius often uses unix seconds
    const ms = value > 1e12 ? value : value * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string" && value.trim()) {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber) && /^\d+(\.\d+)?$/.test(value.trim())) {
      return parseDate(asNumber);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function firstString(
  ...values: unknown[]
): string | null {
  for (const value of values) {
    const id = asIdString(value);
    if (id) return id;
  }
  return null;
}

function dig(record: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = record;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
}

function collectRecords(
  root: Record<string, unknown>,
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [root];
  for (const key of ["objects", "data", "entity", "entities", "object"]) {
    const value = root[key];
    if (isRecord(value)) {
      out.push(value);
      for (const nested of Object.values(value)) {
        if (isRecord(nested)) out.push(nested);
      }
    }
  }
  return out;
}

function findNested(
  records: Record<string, unknown>[],
  keys: string[],
): Record<string, unknown> | null {
  for (const record of records) {
    for (const key of keys) {
      const value = record[key];
      if (isRecord(value)) return value;
    }
  }
  return null;
}

function parseBillingInterval(value: unknown): FreemiusBillingInterval | null {
  const raw = asNonEmptyString(value)?.toLowerCase();
  if (!raw) return null;
  if (raw === "month" || raw === "monthly" || raw === "1_month") return "month";
  if (raw === "year" || raw === "annual" || raw === "yearly" || raw === "1_year") {
    return "year";
  }
  return null;
}

/**
 * Normalize diverse Freemius-like webhook JSON into a typed event.
 * Accepts a canonical fixture shape used in tests and common Freemius layouts.
 */
export function parseFreemiusWebhookEvent(
  payload: unknown,
): FreemiusWebhookEventInput | null {
  if (!isRecord(payload)) return null;

  const eventId = firstString(
    payload.id,
    payload.event_id,
    payload.eventId,
    dig(payload, ["event", "id"]),
  );
  const eventType = firstString(
    payload.type,
    payload.event_type,
    payload.eventType,
    dig(payload, ["event", "type"]),
  );
  if (!eventId || !eventType) return null;

  const occurredAt =
    parseDate(payload.created) ??
    parseDate(payload.created_at) ??
    parseDate(payload.occurred_at) ??
    parseDate(payload.occurredAt) ??
    parseDate(dig(payload, ["event", "created"])) ??
    new Date();

  const records = collectRecords(payload);
  const license = findNested(records, ["license", "License"]);
  const subscription = findNested(records, ["subscription", "Subscription"]);
  const payment = findNested(records, ["payment", "Payment"]);
  const user = findNested(records, ["user", "User", "buyer", "customer"]);
  const plan = findNested(records, ["plan", "Plan"]);
  const pricing = findNested(records, ["pricing", "Pricing", "price"]);
  const product = findNested(records, ["product", "Product", "plugin"]);

  const custom =
    (isRecord(payload.custom) && payload.custom) ||
    (isRecord(payload.custom_fields) && payload.custom_fields) ||
    (isRecord(payload.metadata) && payload.metadata) ||
    (license && isRecord(license.custom) && license.custom) ||
    (subscription && isRecord(subscription.custom) && subscription.custom) ||
    (payment && isRecord(payment.custom) && payment.custom) ||
    null;

  const productId = firstString(
    product?.id,
    payload.product_id,
    payload.plugin_id,
    license?.plugin_id,
    license?.product_id,
    subscription?.plugin_id,
    payment?.plugin_id,
  );
  const planId = firstString(
    plan?.id,
    payload.plan_id,
    license?.plan_id,
    subscription?.plan_id,
    payment?.plan_id,
  );
  const pricingId = firstString(
    pricing?.id,
    payload.pricing_id,
    license?.pricing_id,
    subscription?.pricing_id,
    payment?.pricing_id,
  );

  const freemiusUserId = firstString(
    user?.id,
    payload.user_id,
    license?.user_id,
    subscription?.user_id,
    payment?.user_id,
  );
  const freemiusLicenseId = firstString(
    license?.id,
    payload.license_id,
    subscription?.license_id,
    payment?.license_id,
  );
  const freemiusSubscriptionId = firstString(
    subscription?.id,
    payload.subscription_id,
    license?.subscription_id,
    payment?.subscription_id,
  );

  const email = firstString(
    user?.email,
    payload.email,
    license?.email,
    payment?.email,
  );
  const emailVerified =
    user?.is_verified === true ||
    user?.email_verified === true ||
    user?.verified === true ||
    payload.email_verified === true;

  const billingInterval =
    parseBillingInterval(pricing?.billing_cycle) ??
    parseBillingInterval(pricing?.period) ??
    parseBillingInterval(subscription?.billing_cycle) ??
    parseBillingInterval(license?.billing_cycle) ??
    parseBillingInterval(payload.billing_interval) ??
    parseBillingInterval(payload.billingInterval);

  const currentPeriodStart =
    parseDate(license?.issued_at) ??
    parseDate(license?.created) ??
    parseDate(license?.created_at) ??
    parseDate(subscription?.created) ??
    parseDate(subscription?.created_at) ??
    parseDate(subscription?.current_period_start) ??
    parseDate(payment?.created) ??
    parseDate(payment?.created_at) ??
    parseDate(payload.current_period_start) ??
    parseDate(payload.currentPeriodStart);

  const currentPeriodEnd =
    parseDate(license?.expiration) ??
    parseDate(license?.expires_at) ??
    parseDate(license?.expiration_date) ??
    parseDate(subscription?.next_payment) ??
    parseDate(subscription?.next_payment_date) ??
    parseDate(subscription?.current_period_end) ??
    parseDate(subscription?.renewal_date) ??
    parseDate(payment?.period_end) ??
    parseDate(payload.current_period_end) ??
    parseDate(payload.currentPeriodEnd);

  const cancelAtPeriodEnd =
    subscription?.cancel_at_period_end === true ||
    subscription?.is_cancelled === true ||
    license?.is_cancelled === true
      ? true
      : subscription?.cancel_at_period_end === false
        ? false
        : null;

  const creatornivoUserId = firstString(
    custom && (custom as Record<string, unknown>).userId,
    custom && (custom as Record<string, unknown>).user_id,
    custom && (custom as Record<string, unknown>).creatornivoUserId,
    payload.userId,
    payload.creatornivo_user_id,
  );
  const checkoutIntentId = firstString(
    custom && (custom as Record<string, unknown>).checkoutIntentId,
    custom && (custom as Record<string, unknown>).intentId,
    custom && (custom as Record<string, unknown>).intent_id,
    payload.checkoutIntentId,
    payload.intent_id,
  );

  const typeLower = eventType.toLowerCase();
  const isRefund =
    typeLower.includes("refund") || payment?.is_refund === true;
  const isDispute = typeLower.includes("dispute");

  return {
    eventId,
    eventType,
    occurredAt,
    objects: {
      productId,
      planId,
      pricingId,
      freemiusUserId,
      freemiusLicenseId,
      freemiusSubscriptionId,
      email,
      emailVerified,
      billingInterval,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      creatornivoUserId,
      checkoutIntentId,
      isRefund,
      isDispute,
    },
    raw: payload,
  };
}

export function isFreemiusHandledEventType(
  eventType: string,
): eventType is FreemiusHandledEventType {
  return (FREEMIUS_HANDLED_EVENT_TYPES as readonly string[]).includes(eventType);
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

function isActivationEvent(eventType: string): boolean {
  return (
    eventType === "license.activated" ||
    eventType === "license.created" ||
    eventType === "license.updated" ||
    eventType === "license.extended" ||
    eventType === "subscription.created" ||
    eventType === "payment.created"
  );
}

function isHardRevokeEvent(eventType: string, objects: FreemiusWebhookObjects): boolean {
  if (
    eventType === "license.expired" ||
    eventType === "license.deleted" ||
    eventType === "payment.dispute.created" ||
    eventType === "payment.dispute.opened"
  ) {
    return true;
  }
  if (eventType === "payment.refund" || objects.isRefund) {
    return true;
  }
  return false;
}

function isSoftCancelEvent(eventType: string): boolean {
  return (
    eventType === "subscription.cancelled" ||
    eventType === "license.cancelled"
  );
}

function isPastDueEvent(eventType: string): boolean {
  return (
    eventType === "subscription.renewal.failed" ||
    eventType === "subscription.renewal.failed.last"
  );
}

function idsAllowlisted(
  objects: FreemiusWebhookObjects,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const allowlist = getFreemiusAllowlist(env);
  if (!allowlist.productId || !allowlist.proPlanId || !allowlist.proPricingId) {
    return false;
  }
  if (!objects.productId || !isAllowedFreemiusProductId(objects.productId, env)) {
    return false;
  }
  if (!objects.planId || !isAllowedFreemiusPlanId(objects.planId, env)) {
    return false;
  }
  // Pricing may be absent on some license-only events; if present must match.
  if (objects.pricingId && !isAllowedFreemiusPricingId(objects.pricingId, env)) {
    return false;
  }
  return true;
}

type MatchedUser = {
  id: string;
  email: string;
  name: string | null;
  plan: Plan;
};

async function resolveUser(
  tx: Prisma.TransactionClient,
  objects: FreemiusWebhookObjects,
): Promise<MatchedUser | null> {
  const userSelect = { id: true, email: true, name: true, plan: true } as const;

  if (objects.checkoutIntentId) {
    const intent = await tx.freemiusCheckoutIntent.findUnique({
      where: { id: objects.checkoutIntentId },
      select: {
        userId: true,
        user: { select: userSelect },
      },
    });
    if (intent?.user) {
      return {
        id: intent.user.id,
        email: intent.user.email,
        name: intent.user.name,
        plan: intent.user.plan,
      };
    }
  }

  if (objects.creatornivoUserId) {
    const user = await tx.user.findUnique({
      where: { id: objects.creatornivoUserId },
      select: userSelect,
    });
    if (user) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
      };
    }
  }

  if (objects.freemiusLicenseId) {
    const byLicense = await tx.subscription.findUnique({
      where: { freemiusLicenseId: objects.freemiusLicenseId },
      select: {
        user: { select: userSelect },
      },
    });
    if (byLicense?.user) {
      return {
        id: byLicense.user.id,
        email: byLicense.user.email,
        name: byLicense.user.name,
        plan: byLicense.user.plan,
      };
    }
  }

  if (objects.freemiusSubscriptionId) {
    const bySub = await tx.subscription.findUnique({
      where: { freemiusSubscriptionId: objects.freemiusSubscriptionId },
      select: {
        user: { select: userSelect },
      },
    });
    if (bySub?.user) {
      return {
        id: bySub.user.id,
        email: bySub.user.email,
        name: bySub.user.name,
        plan: bySub.user.plan,
      };
    }
  }

  if (objects.freemiusUserId) {
    const byFsUser = await tx.subscription.findUnique({
      where: { freemiusUserId: objects.freemiusUserId },
      select: {
        user: { select: userSelect },
      },
    });
    if (byFsUser?.user) {
      return {
        id: byFsUser.user.id,
        email: byFsUser.user.email,
        name: byFsUser.user.name,
        plan: byFsUser.user.plan,
      };
    }
  }

  // Freemius buyer email in the payload is a clear buyer identifier (no user creation).
  if (objects.email) {
    const byEmail = await tx.user.findFirst({
      where: {
        email: { equals: objects.email, mode: "insensitive" },
      },
      select: userSelect,
    });
    if (byEmail) {
      return {
        id: byEmail.id,
        email: byEmail.email,
        name: byEmail.name,
        plan: byEmail.plan,
      };
    }
  }

  return null;
}

function mapStatus(
  eventType: string,
  objects: FreemiusWebhookObjects,
  now: Date,
): SubscriptionStatus {
  if (isHardRevokeEvent(eventType, objects)) return "canceled";
  if (isSoftCancelEvent(eventType)) {
    if (objects.currentPeriodEnd && objects.currentPeriodEnd > now) {
      return "active";
    }
    return "canceled";
  }
  if (isPastDueEvent(eventType)) return "past_due";
  if (eventType === "subscription.renewal.retry") return "past_due";
  if (isActivationEvent(eventType)) return "active";
  return "incomplete";
}

function nextPlan(
  eventType: string,
  objects: FreemiusWebhookObjects,
  status: SubscriptionStatus,
  existingProvider: string | null | undefined,
  now: Date,
): Plan {
  // Never touch non-Freemius paid rows via Freemius events unless already freemius.
  if (
    existingProvider &&
    existingProvider !== "freemius" &&
    existingProvider !== "paddle" &&
    existingProvider !== "stripe"
  ) {
    // defensive no-op path
  }

  if (isHardRevokeEvent(eventType, objects)) {
    return PLANS.FREE;
  }

  if (isSoftCancelEvent(eventType)) {
    if (objects.currentPeriodEnd && objects.currentPeriodEnd > now) {
      return PLANS.PRO;
    }
    return PLANS.FREE;
  }

  if (isPastDueEvent(eventType) || eventType === "subscription.renewal.retry") {
    // Keep access during recovery window if period still open.
    if (objects.currentPeriodEnd && objects.currentPeriodEnd > now) {
      return PLANS.PRO;
    }
    return PLANS.FREE;
  }

  if (isActivationEvent(eventType) && status === "active") {
    return PLANS.PRO;
  }

  if (status === "active" || status === "trialing") {
    return PLANS.PRO;
  }

  return PLANS.FREE;
}

async function applyFreemiusEvent(
  tx: Prisma.TransactionClient,
  event: FreemiusWebhookEventInput,
  env: NodeJS.ProcessEnv,
): Promise<{
  result: FreemiusWebhookProcessingResult;
  proActivation?: { userId: string; email: string; name: string | null };
}> {
  if (!isFreemiusHandledEventType(event.eventType)) {
    return { result: "ignored" };
  }

  if (!idsAllowlisted(event.objects, env)) {
    console.warn("[freemius-webhook] ignored: product/plan/pricing allowlist", {
      eventId: event.eventId,
      eventType: event.eventType,
      productId: event.objects.productId,
      planId: event.objects.planId,
      pricingId: event.objects.pricingId,
    });
    return { result: "ignored" };
  }

  const user = await resolveUser(tx, event.objects);
  if (!user) {
    console.warn("[freemius-webhook] orphan event: no safe user match", {
      eventId: event.eventId,
      eventType: event.eventType,
      freemiusLicenseId: event.objects.freemiusLicenseId,
      freemiusSubscriptionId: event.objects.freemiusSubscriptionId,
      freemiusUserId: event.objects.freemiusUserId,
      hasEmail: Boolean(event.objects.email),
    });
    return { result: "orphan" };
  }

  const existing = await tx.subscription.findUnique({
    where: { userId: user.id },
  });

  // Do not revoke/overwrite non-Freemius subscriptions unless already freemius-linked.
  if (
    existing &&
    existing.provider !== "freemius" &&
    !existing.freemiusLicenseId &&
    !existing.freemiusSubscriptionId &&
    !existing.freemiusUserId
  ) {
    if (isHardRevokeEvent(event.eventType, event.objects) || isSoftCancelEvent(event.eventType)) {
      console.warn(
        "[freemius-webhook] ignored revoke: user has non-Freemius subscription",
        { userId: user.id, provider: existing.provider },
      );
      return { result: "ignored" };
    }
    // Activation on a paddle/stripe row: only claim if free/incomplete side account —
    // safer to ignore upgrade collision.
    if (existing.provider === "paddle" || existing.provider === "stripe") {
      if (
        existing.status === "active" ||
        existing.status === "trialing" ||
        existing.status === "past_due"
      ) {
        console.warn(
          "[freemius-webhook] ignored activation: active non-Freemius subscription exists",
          { userId: user.id, provider: existing.provider },
        );
        return { result: "ignored" };
      }
    }
  }

  if (
    existing?.lastFreemiusEventAt &&
    event.occurredAt < existing.lastFreemiusEventAt
  ) {
    return { result: "stale" };
  }

  const now = new Date();
  const status = mapStatus(event.eventType, event.objects, now);
  const plan = nextPlan(
    event.eventType,
    event.objects,
    status,
    existing?.provider ?? null,
    now,
  );

  const cancelAtPeriodEnd =
    event.objects.cancelAtPeriodEnd === true ||
    (isSoftCancelEvent(event.eventType) &&
      Boolean(event.objects.currentPeriodEnd && event.objects.currentPeriodEnd > now));

  const periodStart =
    event.objects.currentPeriodStart ?? existing?.currentPeriodStart ?? null;
  const periodEnd =
    event.objects.currentPeriodEnd ?? existing?.currentPeriodEnd ?? null;

  const sharedData = {
    provider: "freemius" as const,
    freemiusUserId:
      event.objects.freemiusUserId ?? existing?.freemiusUserId ?? null,
    freemiusLicenseId:
      event.objects.freemiusLicenseId ?? existing?.freemiusLicenseId ?? null,
    freemiusSubscriptionId:
      event.objects.freemiusSubscriptionId ??
      existing?.freemiusSubscriptionId ??
      null,
    freemiusPlanId: event.objects.planId ?? existing?.freemiusPlanId ?? null,
    freemiusPricingId:
      event.objects.pricingId ?? existing?.freemiusPricingId ?? null,
    freemiusProductId:
      event.objects.productId ?? existing?.freemiusProductId ?? null,
    billingInterval:
      event.objects.billingInterval ?? existing?.billingInterval ?? null,
    status,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd,
    lastFreemiusEventAt: event.occurredAt,
  };

  await tx.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      ...sharedData,
    },
    update: sharedData,
  });

  // Only set plan free via Freemius if provider is freemius (or becoming freemius).
  if (plan === PLANS.FREE) {
    const shouldRevoke =
      !existing ||
      existing.provider === "freemius" ||
      Boolean(existing.freemiusLicenseId) ||
      Boolean(existing.freemiusSubscriptionId);
    if (shouldRevoke) {
      await tx.user.update({
        where: { id: user.id },
        data: { plan: PLANS.FREE },
      });
    }
  } else {
    await tx.user.update({
      where: { id: user.id },
      data: { plan: PLANS.PRO },
    });
  }

  if (event.objects.checkoutIntentId && plan === PLANS.PRO) {
    await tx.freemiusCheckoutIntent.updateMany({
      where: {
        id: event.objects.checkoutIntentId,
        userId: user.id,
        status: { not: "completed" },
      },
      data: {
        status: "completed",
        completedAt: event.occurredAt,
      },
    });
  }

  const proActivation =
    user.plan === PLANS.FREE && plan === PLANS.PRO
      ? { userId: user.id, email: user.email, name: user.name }
      : undefined;

  return { result: "processed", proActivation };
}

export async function processFreemiusWebhookEvent(
  event: FreemiusWebhookEventInput,
  options: {
    database?: FreemiusWebhookDatabase;
    env?: NodeJS.ProcessEnv;
  } = {},
): Promise<FreemiusWebhookProcessingResult> {
  // Cast keeps Prisma client + test doubles assignable without overload unions.
  const database = (options.database ?? prisma) as FreemiusWebhookDatabase;
  const env = options.env ?? process.env;

  let work: {
    result: FreemiusWebhookProcessingResult;
    proActivation?: { userId: string; email: string; name: string | null };
  };

  try {
    work = await database.$transaction(async (tx) => {
      try {
        await tx.freemiusWebhookEvent.create({
          data: {
            eventId: event.eventId,
            eventType: event.eventType,
            occurredAt: event.occurredAt,
          },
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new DuplicateFreemiusWebhookEventError();
        }
        throw error;
      }

      return applyFreemiusEvent(tx, event, env);
    });
  } catch (error) {
    if (error instanceof DuplicateFreemiusWebhookEventError) {
      return "duplicate";
    }
    throw error;
  }

  if (work.proActivation) {
    void sendProConfirmationEmail(work.proActivation).catch((error) => {
      console.error("[freemius-webhook] pro confirmation email failed", error);
    });
  }

  return work.result;
}
