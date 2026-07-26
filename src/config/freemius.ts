/**
 * Freemius billing configuration (Phase 1: config only).
 *
 * Server-only secrets must never be imported into client components.
 * Checkout stays disabled unless PUBLIC_CHECKOUT_ENABLED === "true".
 *
 * Paid Freemius Pro periods are provider-based (currentPeriodStart/End from
 * Freemius payloads in Phase 2+). Do not assume calendar-month resets on the 1st.
 */

export type FreemiusBillingInterval = "month" | "year";

export interface FreemiusEnvSnapshot {
  productId: string;
  proPlanId: string;
  proPricingId: string;
  foundingCouponCode: string;
  publicKey: string;
  secretKey: string;
  apiBearerToken: string;
  webhookSecretToken: string;
  publicCheckoutEnabledRaw: string;
  annualPricingId: string;
  /** Hosted Freemius customer portal / users dashboard base URL (no secrets). */
  customerPortalUrl: string;
  /** Optional override for hosted checkout origin (default checkout.freemius.com). */
  checkoutBaseUrl: string;
}

function readEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

/** Snapshot of Freemius-related env vars (empty string when unset). */
export function getFreemiusEnvSnapshot(
  env: NodeJS.ProcessEnv = process.env,
): FreemiusEnvSnapshot {
  return {
    productId: (env.FREEMIUS_PRODUCT_ID ?? "").trim(),
    proPlanId: (env.FREEMIUS_PRO_PLAN_ID ?? "").trim(),
    proPricingId: (env.FREEMIUS_PRO_PRICING_ID ?? "").trim(),
    foundingCouponCode: (env.FREEMIUS_FOUNDING_COUPON_CODE ?? "").trim(),
    publicKey: (env.FREEMIUS_PUBLIC_KEY ?? "").trim(),
    secretKey: (env.FREEMIUS_SECRET_KEY ?? "").trim(),
    apiBearerToken: (env.FREEMIUS_API_BEARER_TOKEN ?? "").trim(),
    webhookSecretToken: (env.FREEMIUS_WEBHOOK_SECRET_TOKEN ?? "").trim(),
    publicCheckoutEnabledRaw: (env.PUBLIC_CHECKOUT_ENABLED ?? "").trim(),
    annualPricingId: (env.FREEMIUS_PRO_ANNUAL_PRICING_ID ?? "").trim(),
    customerPortalUrl: (env.FREEMIUS_CUSTOMER_PORTAL_URL ?? "").trim(),
    checkoutBaseUrl: (
      env.FREEMIUS_CHECKOUT_BASE_URL ?? "https://checkout.freemius.com"
    ).trim(),
  };
}

/**
 * Public checkout is enabled only when the env is exactly "true".
 * Defaults to disabled when unset, empty, "false", "1", etc.
 */
export function isPublicCheckoutEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return getFreemiusEnvSnapshot(env).publicCheckoutEnabledRaw === "true";
}

/** Product / plan / monthly pricing IDs used for allowlisting (server). */
export function getFreemiusAllowlist(
  env: NodeJS.ProcessEnv = process.env,
): {
  productId: string;
  proPlanId: string;
  proPricingId: string;
  annualPricingId: string;
  foundingCouponCode: string;
} {
  const snap = getFreemiusEnvSnapshot(env);
  return {
    productId: snap.productId,
    proPlanId: snap.proPlanId,
    proPricingId: snap.proPricingId,
    annualPricingId: snap.annualPricingId,
    foundingCouponCode: snap.foundingCouponCode,
  };
}

export function isAllowedFreemiusProductId(
  productId: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const allowed = getFreemiusAllowlist(env).productId;
  return Boolean(allowed) && productId.trim() === allowed;
}

export function isAllowedFreemiusPlanId(
  planId: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const allowed = getFreemiusAllowlist(env).proPlanId;
  return Boolean(allowed) && planId.trim() === allowed;
}

export function isAllowedFreemiusPricingId(
  pricingId: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const { proPricingId, annualPricingId } = getFreemiusAllowlist(env);
  const id = pricingId.trim();
  if (!id) return false;
  if (proPricingId && id === proPricingId) return true;
  if (annualPricingId && id === annualPricingId) return true;
  return false;
}

export function isAllowedFreemiusFoundingCoupon(
  code: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const allowed = getFreemiusAllowlist(env).foundingCouponCode;
  if (!allowed) return false;
  return code.trim().toUpperCase() === allowed.toUpperCase();
}

export type FreemiusConfigStatus = {
  /** Product + plan + monthly pricing ids present */
  allowlistConfigured: boolean;
  /** Secret key present (webhook signature) */
  secretKeyConfigured: boolean;
  /** API bearer present (server REST) */
  apiBearerConfigured: boolean;
  /** Webhook URL secret token present */
  webhookTokenConfigured: boolean;
  /** Public key present (only if client SDK needs it later) */
  publicKeyConfigured: boolean;
  /** Founding coupon code present */
  foundingCouponConfigured: boolean;
  /** PUBLIC_CHECKOUT_ENABLED === "true" */
  publicCheckoutEnabled: boolean;
  /**
   * Server has enough config to verify webhooks later (Phase 2).
   * Does not enable checkout or entitlement application by itself.
   */
  webhookFoundationReady: boolean;
  /**
   * Hosted checkout can be built when product+plan ids exist (no API bearer required).
   * Public use still requires PUBLIC_CHECKOUT_ENABLED === "true".
   */
  checkoutFoundationReady: boolean;
  /** Portal endpoint can return a URL when portal base is configured. */
  portalFoundationReady: boolean;
  missingRequiredForWebhook: string[];
  missingRequiredForCheckoutFoundation: string[];
  missingRequiredForPortal: string[];
};

/**
 * Validates Freemius env readiness without throwing.
 * Secrets are never returned — only booleans and missing key names.
 */
export function getFreemiusConfigStatus(
  env: NodeJS.ProcessEnv = process.env,
): FreemiusConfigStatus {
  const snap = getFreemiusEnvSnapshot(env);

  const missingRequiredForWebhook: string[] = [];
  if (!snap.productId) missingRequiredForWebhook.push("FREEMIUS_PRODUCT_ID");
  if (!snap.proPlanId) missingRequiredForWebhook.push("FREEMIUS_PRO_PLAN_ID");
  if (!snap.proPricingId) {
    missingRequiredForWebhook.push("FREEMIUS_PRO_PRICING_ID");
  }
  if (!snap.secretKey) missingRequiredForWebhook.push("FREEMIUS_SECRET_KEY");
  if (!snap.webhookSecretToken) {
    missingRequiredForWebhook.push("FREEMIUS_WEBHOOK_SECRET_TOKEN");
  }

  // Hosted checkout needs product + plan (and monthly pricing id for allowlist consistency).
  const missingRequiredForCheckoutFoundation: string[] = [];
  if (!snap.productId) {
    missingRequiredForCheckoutFoundation.push("FREEMIUS_PRODUCT_ID");
  }
  if (!snap.proPlanId) {
    missingRequiredForCheckoutFoundation.push("FREEMIUS_PRO_PLAN_ID");
  }
  if (!snap.proPricingId) {
    missingRequiredForCheckoutFoundation.push("FREEMIUS_PRO_PRICING_ID");
  }

  const missingRequiredForPortal: string[] = [];
  if (!snap.customerPortalUrl) {
    missingRequiredForPortal.push("FREEMIUS_CUSTOMER_PORTAL_URL");
  }

  const allowlistConfigured = Boolean(
    snap.productId && snap.proPlanId && snap.proPricingId,
  );
  const secretKeyConfigured = Boolean(snap.secretKey);
  const apiBearerConfigured = Boolean(snap.apiBearerToken);
  const webhookTokenConfigured = Boolean(snap.webhookSecretToken);
  const publicKeyConfigured = Boolean(snap.publicKey);
  const foundingCouponConfigured = Boolean(snap.foundingCouponCode);
  const publicCheckoutEnabled = isPublicCheckoutEnabled(env);

  const webhookFoundationReady = missingRequiredForWebhook.length === 0;
  const checkoutFoundationReady =
    missingRequiredForCheckoutFoundation.length === 0;
  const portalFoundationReady = missingRequiredForPortal.length === 0;

  return {
    allowlistConfigured,
    secretKeyConfigured,
    apiBearerConfigured,
    webhookTokenConfigured,
    publicKeyConfigured,
    foundingCouponConfigured,
    publicCheckoutEnabled,
    webhookFoundationReady,
    checkoutFoundationReady,
    portalFoundationReady,
    missingRequiredForWebhook,
    missingRequiredForCheckoutFoundation,
    missingRequiredForPortal,
  };
}

/**
 * Paid Freemius Pro must use Freemius provider period dates
 * (currentPeriodStart / currentPeriodEnd from Freemius), not UTC calendar months.
 * Phase 1 only documents the rule; Phase 2 webhooks assign the dates.
 */
export const FREEMIUS_PAID_PRO_PERIOD_POLICY = {
  source: "freemius_provider" as const,
  /**
   * true: renewal boundaries come from Freemius (e.g. subscribe on the 5th →
   * period end around the 5th/6th next cycle), never forced to month start.
   */
  usesProviderBillingPeriod: true,
  /**
   * false: paid Freemius Pro must not use calendar-month reset on the 1st.
   * Manual Pro may still use temporary UTC month buckets until paid path is live.
   */
  usesUtcCalendarMonth: false,
  fields: ["currentPeriodStart", "currentPeriodEnd"] as const,
} as const;

/** Safe server config surface: ids only, never secrets. */
export function getFreemiusPublicAllowlistConfig(
  env: NodeJS.ProcessEnv = process.env,
): {
  productId: string;
  proPlanId: string;
  proPricingId: string;
  annualPricingId: string;
  foundingCouponCode: string;
  publicCheckoutEnabled: boolean;
  paidProPeriodPolicy: typeof FREEMIUS_PAID_PRO_PERIOD_POLICY;
} {
  const allowlist = getFreemiusAllowlist(env);
  return {
    ...allowlist,
    publicCheckoutEnabled: isPublicCheckoutEnabled(env),
    paidProPeriodPolicy: FREEMIUS_PAID_PRO_PERIOD_POLICY,
  };
}
