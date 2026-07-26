/**
 * Early Access public pricing display (while PUBLIC_CHECKOUT_ENABLED is false).
 * $9.90 is the regular Pro price; $4.90 is the founding coupon price (FOUNDING20).
 * Does not invent live seat counters — Freemius enforces the 20-redemption cap.
 */
export const earlyAccessConfig = {
  /** Founding coupon effective monthly price. */
  price: "$4.90",
  priceLabel: "$4.90",
  /** Regular Pro monthly price shown as the main list price. */
  regularPrice: "$9.90",
  discountPercent: 50,
  foundingCouponCode: "FOUNDING20",
  foundingDiscountAmount: "$5",
  /** Primary founding offer line — shows the coupon code. */
  foundingCouponCopy:
    "Use code FOUNDING20 to get $5 off — $4.90/month.",
  /** Secondary limit line — honest, no live remaining seats. */
  limitLabel: "Limited founding offer — first 20 customers only.",
  bannerText: "Early Access founding price",
  badgeLabel: "Early Access",
  foundingBadgeLabel: "Limited founding offer",
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
