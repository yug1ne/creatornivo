export const earlyAccessConfig = {
  price: "$4.90",
  priceLabel: "$4.90",
  regularPrice: "$9.90",
  discountPercent: 50,
  limitLabel:
    "Early Access founding price — available for a limited time.",
  bannerText: "Early Access founding price",
  badgeLabel: "Early Access",
} as const;

export type EarlyAccessStatus = {
  isAvailable: boolean;
  price: string;
  regularPrice: string;
  discountPercent: number;
  limitLabel: string;
};
