import { isPaddleCheckoutConfigured, isPaddleConfigured } from "@/config/paddle";
import { isStripeCheckoutConfigured, isStripeConfigured } from "@/config/stripe";

export type BillingProvider = "paddle" | "stripe";

export function getActiveBillingProvider(): BillingProvider | null {
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