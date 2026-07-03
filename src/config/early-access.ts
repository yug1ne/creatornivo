export const earlyAccessConfig = {
  price: "$4.90",
  priceLabel: "$4.90",
  regularPrice: "$9.90",
  maxSpots: 50,
  discountPercent: 90,
  limitLabel: "Only for first 50 users",
  bannerText: "Early Access — Founding price for first users",
  badgeLabel: "Early Access",
} as const;

export type EarlyAccessStatus = {
  isAvailable: boolean;
  spotsTaken: number;
  spotsRemaining: number;
  maxSpots: number;
  price: string;
  regularPrice: string;
  discountPercent: number;
  limitLabel: string;
};
