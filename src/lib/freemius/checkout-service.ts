import type { Plan, SubscriptionStatus } from "@prisma/client";

import {
  getFreemiusConfigStatus,
  getFreemiusEnvSnapshot,
  isAllowedFreemiusFoundingCoupon,
  resolveFreemiusCheckoutAccess,
  type FreemiusBillingInterval,
  type FreemiusCheckoutAccessMode,
} from "@/config/freemius";
import { siteConfig } from "@/config/site";
import { prisma } from "@/lib/db";

export const FREEMIUS_CHECKOUT_INTENT_TTL_MS = 30 * 60 * 1000;

export type FreemiusCheckoutIntervalInput = "monthly" | "annual";

export type FreemiusCheckoutRequestBody = {
  interval?: unknown;
  coupon?: unknown;
};

export type FreemiusCheckoutBuildInput = {
  userId: string;
  email: string;
  name: string | null;
  interval: FreemiusCheckoutIntervalInput;
  coupon?: string | null;
  intentId: string;
  successUrl: string;
  cancelUrl: string;
};

export class FreemiusCheckoutError extends Error {
  constructor(
    public readonly code:
      | "checkout_disabled"
      | "billing_not_configured"
      | "invalid_interval"
      | "invalid_coupon"
      | "subscription_already_active"
      | "unauthorized"
      | "user_not_found",
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "FreemiusCheckoutError";
  }
}

const PRO_ACTIVE_STATUSES: SubscriptionStatus[] = [
  "active",
  "trialing",
  "past_due",
];

export function parseFreemiusCheckoutInterval(
  value: unknown,
): FreemiusCheckoutIntervalInput | null {
  if (value === "monthly" || value === "annual") return value;
  return null;
}

export function normalizeOptionalCoupon(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveFreemiusBillingCycle(
  interval: FreemiusCheckoutIntervalInput,
): FreemiusBillingInterval {
  return interval === "annual" ? "year" : "month";
}

/** Hosted checkout uses Freemius billing_cycle query values. */
export function resolveFreemiusCheckoutBillingCycleParam(
  interval: FreemiusCheckoutIntervalInput,
): "monthly" | "annual" {
  return interval === "annual" ? "annual" : "monthly";
}

export function resolveFreemiusPricingIdForInterval(
  interval: FreemiusCheckoutIntervalInput,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const snap = getFreemiusEnvSnapshot(env);
  if (interval === "annual" && snap.annualPricingId) {
    return snap.annualPricingId;
  }
  return snap.proPricingId;
}

/**
 * Blocks checkout when the user already has paid-through Pro access.
 * Manual Pro (plan=pro without a freemius/paddle/stripe active sub) is also blocked
 * with a clear message — they already have Pro access.
 */
export function getFreemiusCheckoutBlock(
  user: {
    plan: Plan;
    subscription: {
      provider: string;
      status: SubscriptionStatus;
      cancelAtPeriodEnd: boolean;
      currentPeriodEnd: Date | null;
    } | null;
  },
  now = new Date(),
): { code: "subscription_already_active"; message: string } | null {
  if (user.plan === "pro") {
    return {
      code: "subscription_already_active",
      message:
        "You already have Pro access. Manage billing from Settings if you have a Freemius subscription.",
    };
  }

  const subscription = user.subscription;
  if (!subscription) return null;

  const paidPeriodIsActive =
    subscription.currentPeriodEnd !== null &&
    subscription.currentPeriodEnd > now;

  if (
    PRO_ACTIVE_STATUSES.includes(subscription.status) ||
    (subscription.cancelAtPeriodEnd && paidPeriodIsActive)
  ) {
    return {
      code: "subscription_already_active",
      message: "You already have an active Pro subscription.",
    };
  }

  return null;
}

export function getFreemiusCheckoutUrls(baseUrl?: string): {
  successUrl: string;
  cancelUrl: string;
} {
  const root = (baseUrl ?? siteConfig.url).replace(/\/$/, "");
  return {
    successUrl: `${root}/settings/billing?checkout=success`,
    cancelUrl: `${root}/settings/billing?checkout=cancelled`,
  };
}

/**
 * Builds a Freemius hosted checkout URL from allowlisted ids only.
 * Path format (Hosted Checkout / dashboard):
 *   https://checkout.freemius.com/product/{product_id}/plan/{plan_id}/licenses/1/
 * Never embeds secret keys. Does not assign subscription periods or grant Pro.
 *
 * @see https://freemius.com/help/documentation/saas/saas-integration/
 */
export function buildFreemiusHostedCheckoutUrl(
  input: FreemiusCheckoutBuildInput,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const snap = getFreemiusEnvSnapshot(env);
  if (!snap.productId || !snap.proPlanId) {
    throw new FreemiusCheckoutError(
      "billing_not_configured",
      503,
      "Freemius checkout is not configured.",
    );
  }

  const pricingId = resolveFreemiusPricingIdForInterval(input.interval, env);
  if (!pricingId) {
    throw new FreemiusCheckoutError(
      "billing_not_configured",
      503,
      "Freemius pricing is not configured for this interval.",
    );
  }

  // Official Hosted Checkout path (matches Freemius dashboard link shape):
  // https://checkout.freemius.com/product/{product_id}/plan/{plan_id}/licenses/1/
  const origin = snap.checkoutBaseUrl.replace(/\/$/, "");
  const path = `${origin}/product/${encodeURIComponent(snap.productId)}/plan/${encodeURIComponent(snap.proPlanId)}/licenses/1/`;

  const params = new URLSearchParams();
  params.set(
    "billing_cycle",
    resolveFreemiusCheckoutBillingCycleParam(input.interval),
  );
  params.set("pricing_id", pricingId);

  // Bind CreatorNivo user for Phase 2 webhook matching.
  params.set("user_email", input.email);
  params.set("readonly_user", "true");
  if (input.name?.trim()) {
    params.set("user_firstname", input.name.trim().slice(0, 80));
  }

  // Custom metadata for webhook user matching (Freemius passes through as custom fields when supported).
  params.set("userId", input.userId);
  params.set("checkoutIntentId", input.intentId);
  params.set("creatornivo_user_id", input.userId);
  params.set("creatornivo_intent_id", input.intentId);

  params.set("success_url", input.successUrl);
  params.set("cancel_url", input.cancelUrl);

  if (input.coupon) {
    if (!isAllowedFreemiusFoundingCoupon(input.coupon, env)) {
      throw new FreemiusCheckoutError(
        "invalid_coupon",
        400,
        "This coupon code is not valid for checkout.",
      );
    }
    params.set("coupon", input.coupon.trim().toUpperCase());
  }

  return `${path}?${params.toString()}`;
}

export type FreemiusCheckoutIntentStore = {
  create(input: {
    userId: string;
    pricingId: string;
    now: Date;
    expiresAt: Date;
  }): Promise<{ id: string }>;
};

export const prismaFreemiusCheckoutIntentStore: FreemiusCheckoutIntentStore = {
  async create(input) {
    const intent = await prisma.freemiusCheckoutIntent.create({
      data: {
        userId: input.userId,
        pricingId: input.pricingId,
        status: "pending",
        expiresAt: input.expiresAt,
      },
      select: { id: true },
    });
    return intent;
  },
};

/**
 * Creates checkout intent + hosted URL when public checkout or restricted
 * allowlist access is granted. When disabled, throws checkout_disabled without
 * creating intent or calling external services. Never grants Pro or sets periods.
 */
export async function createFreemiusCheckoutSession(input: {
  userId: string;
  email: string;
  name: string | null;
  plan: Plan;
  subscription: {
    provider: string;
    status: SubscriptionStatus;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
  } | null;
  interval: FreemiusCheckoutIntervalInput;
  coupon?: string | null;
  /** Optional admin flag for FREEMIUS_RESTRICTED_CHECKOUT_ADMIN_ONLY */
  isAdmin?: boolean;
  env?: NodeJS.ProcessEnv;
  intentStore?: FreemiusCheckoutIntentStore;
  now?: Date;
  appBaseUrl?: string;
}): Promise<{
  checkoutUrl: string;
  intentId: string;
  interval: FreemiusCheckoutIntervalInput;
  pricingId: string;
  billingCycle: "monthly" | "annual";
  mode: FreemiusCheckoutAccessMode;
}> {
  const env = input.env ?? process.env;

  const accessMode = resolveFreemiusCheckoutAccess(
    { email: input.email, isAdmin: input.isAdmin },
    env,
  );
  if (!accessMode) {
    throw new FreemiusCheckoutError(
      "checkout_disabled",
      403,
      "Public Freemius checkout is disabled.",
    );
  }

  const status = getFreemiusConfigStatus(env);
  if (!status.checkoutFoundationReady) {
    throw new FreemiusCheckoutError(
      "billing_not_configured",
      503,
      "Freemius checkout is not configured.",
    );
  }

  const block = getFreemiusCheckoutBlock({
    plan: input.plan,
    subscription: input.subscription,
  });
  if (block) {
    throw new FreemiusCheckoutError(block.code, 409, block.message);
  }

  // Validate coupon before creating intent (no orphan intents on reject).
  if (input.coupon) {
    if (!isAllowedFreemiusFoundingCoupon(input.coupon, env)) {
      throw new FreemiusCheckoutError(
        "invalid_coupon",
        400,
        "This coupon code is not valid for checkout.",
      );
    }
  }

  const pricingId = resolveFreemiusPricingIdForInterval(input.interval, env);
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + FREEMIUS_CHECKOUT_INTENT_TTL_MS);
  const store = input.intentStore ?? prismaFreemiusCheckoutIntentStore;

  const intent = await store.create({
    userId: input.userId,
    pricingId,
    now,
    expiresAt,
  });

  const urls = getFreemiusCheckoutUrls(input.appBaseUrl);
  const checkoutUrl = buildFreemiusHostedCheckoutUrl(
    {
      userId: input.userId,
      email: input.email,
      name: input.name,
      interval: input.interval,
      coupon: input.coupon,
      intentId: intent.id,
      successUrl: urls.successUrl,
      cancelUrl: urls.cancelUrl,
    },
    env,
  );

  // Never include secrets in the returned object.
  return {
    checkoutUrl,
    intentId: intent.id,
    interval: input.interval,
    pricingId,
    billingCycle: resolveFreemiusCheckoutBillingCycleParam(input.interval),
    mode: accessMode,
  };
}

export function buildFreemiusCustomerPortalUrl(
  input: {
    email?: string | null;
    freemiusUserId?: string | null;
  },
  env: NodeJS.ProcessEnv = process.env,
): string {
  const snap = getFreemiusEnvSnapshot(env);
  const base = snap.customerPortalUrl.replace(/\/$/, "");
  if (!base) {
    throw new FreemiusCheckoutError(
      "billing_not_configured",
      503,
      "Freemius customer portal is not configured.",
    );
  }

  try {
    const url = new URL(base);
    if (input.email?.trim()) {
      url.searchParams.set("email", input.email.trim());
    }
    if (input.freemiusUserId?.trim()) {
      url.searchParams.set("user_id", input.freemiusUserId.trim());
    }
    return url.toString();
  } catch {
    // If env is a bare path or invalid URL, return as-is after strip.
    return base;
  }
}
