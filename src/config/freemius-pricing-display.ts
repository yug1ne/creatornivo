/**
 * Public Freemius pricing display copy (when PUBLIC_CHECKOUT_ENABLED === "true").
 * Does not grant Pro, sync coupon redemptions, or invent live seat counters.
 * Founding CTA auto-applies FOUNDING20 server-side; regular monthly/annual do not.
 */

export const freemiusPricingDisplay = {
  monthlyPrice: "$9.90",
  monthlyPeriodLabel: "per month",
  annualPrice: "$99",
  annualPeriodLabel: "per year",
  foundingMonthlyPrice: "$4.90",
  /** Server coupon id auto-applied only by the Founding CTA (not manual entry UX). */
  foundingCouponCode: "FOUNDING20",
  /** Honest founding offer — no live seat counter. */
  foundingOfferCopy: "First 20 customers. Discount applied automatically.",
  foundingCtaLabel: "Founding Pro — $4.90/month",
  monthlyCtaLabel: "Get Pro Monthly — $9.90",
  annualCtaLabel: "Get Pro Annual — $99",
  checkoutDisabledMessage:
    "Self-serve checkout is currently unavailable. Please try again later or contact support.",
  activationNote:
    "After payment, Pro access is activated when payment is confirmed (usually within a minute).",
} as const;
