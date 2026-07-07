export const earlyAccessConfig = {
  price: "$4.90",
  priceLabel: "$4.90",
  regularPrice: "$9.90",
  discountPercent: 50,
  limitLabel:
    "Early Access founding price — available for a limited time.",
  bannerText: "Early Access founding price",
  badgeLabel: "Early Access",
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
};
