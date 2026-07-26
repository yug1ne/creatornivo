/**
 * Early Access public pricing display (while PUBLIC_CHECKOUT_ENABLED is false).
 * $9.90 is the regular Pro price; $4.90 is the founding offer price.
 * Founding discount is applied automatically at checkout (not a manual code entry UX).
 * Does not invent live seat counters — Freemius enforces the 20-redemption cap.
 */
export const earlyAccessConfig = {
  /** Founding offer effective monthly price. */
  price: "$4.90",
  priceLabel: "$4.90",
  /** Regular Pro monthly price shown as the main list price. */
  regularPrice: "$9.90",
  discountPercent: 50,
  /**
   * Server-side Freemius coupon id (auto-applied by Founding CTA when checkout is on).
   * Not shown as a manual “use code” instruction on public disabled-checkout UI.
   */
  foundingCouponCode: "FOUNDING20",
  foundingDiscountAmount: "$5",
  /** Top of pricing section only (audience). */
  sectionTopLine: "Founding offer for the first 20 customers.",
  /** Pro card founding price line (no “first 20” if top already says it). */
  foundingCouponCopy: "$4.90/month for early customers.",
  /** Pro card automation line. */
  limitLabel: "Discount applied automatically at checkout.",
  bannerText: "Early Access founding price",
  badgeLabel: "Early Access",
  foundingBadgeLabel: "Founding offer",
  /** Short status line for app-wide Early Access banner (pre-launch). */
  statusBannerMessage:
    "Features and limits may change while we actively improve the product.",
} as const;

export type EarlyAccessStatus = {
  isAvailable: boolean;
  price: string;
  regularPrice: string;
  discountPercent: number;
  limitLabel: string;
  foundingCouponCode: string;
  foundingCouponCopy: string;
};
