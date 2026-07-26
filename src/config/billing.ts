import { isPaddleCheckoutConfigured, isPaddleConfigured } from "@/config/paddle";
import { isStripeCheckoutConfigured, isStripeConfigured } from "@/config/stripe";

/**
 * Providers known to the app.
 * Phase 1 adds `freemius` for Subscription.provider typing only.
 * Active public checkout still prefers Paddle, then Stripe — Freemius checkout
 * is not selected until a later phase + PUBLIC_CHECKOUT_ENABLED.
 */
export type BillingProvider = "paddle" | "stripe" | "freemius";

export function getActiveBillingProvider(): BillingProvider | null {
  // Freemius is intentionally not auto-selected in Phase 1 (no public checkout).
  if (isPaddleCheckoutConfigured()) return "paddle";
  if (isStripeCheckoutConfigured()) return "stripe";
  return null;
}

export function isBillingCheckoutConfigured(): boolean {
  return getActiveBillingProvider() !== null;
}

export function isBillingConfigured(): boolean {
  if (isPaddleConfigured()) return true;
  if (isStripeConfigured()) return true;
  return false;
}