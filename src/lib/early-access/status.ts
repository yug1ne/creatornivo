import { earlyAccessConfig, type EarlyAccessStatus } from "@/config/early-access";
import { getActiveBillingProvider } from "@/config/billing";
import { paddleConfig } from "@/config/paddle";
import { stripeConfig } from "@/config/stripe";
import { prisma } from "@/lib/db";

function getEarlyAccessPriceIds(): string[] {
  const provider = getActiveBillingProvider();

  if (provider === "paddle") {
    return paddleConfig.earlyAccessPriceId
      ? [paddleConfig.earlyAccessPriceId]
      : [];
  }

  if (provider === "stripe") {
    return stripeConfig.earlyAccessPriceId
      ? [stripeConfig.earlyAccessPriceId]
      : [];
  }

  return [
    paddleConfig.earlyAccessPriceId,
    stripeConfig.earlyAccessPriceId,
  ].filter(Boolean);
}

export async function countEarlyAccessSpotsTaken(): Promise<number> {
  const priceIds = getEarlyAccessPriceIds();

  if (priceIds.length === 0) {
    return 0;
  }

  return prisma.subscription.count({
    where: {
      OR: [
        { paddlePriceId: { in: priceIds } },
        { stripePriceId: { in: priceIds } },
      ],
    },
  });
}

export async function getEarlyAccessStatus(): Promise<EarlyAccessStatus> {
  const spotsTaken = await countEarlyAccessSpotsTaken();
  const maxSpots = earlyAccessConfig.maxSpots;
  const spotsRemaining = Math.max(0, maxSpots - spotsTaken);
  const hasEarlyAccessPrice = getEarlyAccessPriceIds().length > 0;
  const isAvailable = hasEarlyAccessPrice && spotsRemaining > 0;

  return {
    isAvailable,
    spotsTaken,
    spotsRemaining,
    maxSpots,
    price: earlyAccessConfig.price,
    regularPrice: earlyAccessConfig.regularPrice,
    discountPercent: earlyAccessConfig.discountPercent,
    limitLabel: earlyAccessConfig.limitLabel,
  };
}