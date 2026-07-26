/**
 * Public Freemius pricing display copy (when PUBLIC_CHECKOUT_ENABLED === "true").
 * Split by surface so founding offer wording is not repeated.
 * Does not invent live seat counters. Founding CTA auto-applies FOUNDING20.
 */

/**
 * When true, public Pro CTAs prioritize founding monthly ($4.90, auto coupon)
 * + annual ($99). Regular monthly $9.90 is text-only (no separate buy button).
 * Flip to false later to show Monthly $9.90 + Annual $99 as the two CTAs.
 */
export const freemiusFoundingOfferActive = true;

export const freemiusPricingDisplay = {
  monthlyPrice: "$9.90",
  monthlyPeriodLabel: "per month",
  annualPrice: "$99",
  annualPeriodLabel: "per year",
  foundingMonthlyPrice: "$4.90",
  /** Server coupon id auto-applied only by the Founding CTA. */
  foundingCouponCode: "FOUNDING20",

  /** Top of pricing section only (first-20 audience). */
  sectionTopLine: "Founding offer for the first 20 customers.",
  /** Pro card: short founding price line (no “first 20” if top already says it). */
  foundingPriceLine: "$4.90/month for early customers.",
  /** Pro card: checkout automation note. */
  autoApplyLine: "Discount applied automatically at checkout.",
  /** Pro card: regular list-price label under $9.90. */
  regularMonthlyLabel: "Regular monthly price",
  /** Legacy combined string — prefer surface-specific lines above. */
  foundingOfferCopy: "Founding offer for the first 20 customers.",
  regularMonthlyPriceNote: "Regular monthly price: $9.90/month.",

  foundingCtaLabel: "Get Founding Pro — $4.90/month",
  monthlyCtaLabel: "Get Pro Monthly — $9.90",
  annualCtaLabel: "Get Pro Annual — $99/year",
  checkoutDisabledMessage:
    "Self-serve checkout is currently unavailable. Please try again later or contact support.",
  activationNote:
    "Pro activates after payment confirmation (usually within a minute).",
} as const;
