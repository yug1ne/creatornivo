/**
 * Public Freemius pricing display copy (Phase 5-pre).
 * Shown only when PUBLIC_CHECKOUT_ENABLED === "true".
 * Does not grant Pro, sync coupon redemptions, or invent live seat counters.
 */

export const freemiusPricingDisplay = {
  monthlyPrice: "$9.90",
  monthlyPeriodLabel: "per month",
  annualPrice: "$99",
  annualPeriodLabel: "per year",
  foundingMonthlyPrice: "$4.90",
  foundingCouponCode: "FOUNDING20",
  /** Honest founding offer — no live seat counter. */
  foundingOfferCopy:
    "First 20 customers can use code FOUNDING20 for $4.90/month.",
  foundingCtaLabel: "Founding offer — $4.90/mo with FOUNDING20",
  monthlyCtaLabel: "Get Pro Monthly — $9.90",
  annualCtaLabel: "Get Pro Annual — $99",
  checkoutDisabledMessage:
    "Self-serve checkout is currently unavailable. Please try again later or contact support.",
  activationNote:
    "After payment, Pro access is activated when payment is confirmed (usually within a minute).",
} as const;
