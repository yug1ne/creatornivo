import type { Prisma } from "@prisma/client";

import { earlyAccessConfig, type EarlyAccessStatus } from "@/config/early-access";
import { paddleConfig } from "@/config/paddle";
import { prisma } from "@/lib/db";

export function buildEarlyAccessClaimWhere(
  priceId: string,
): Prisma.SubscriptionWhereInput {
  return {
    paddlePriceId: priceId,
    earlyAccessClaimedAt: { not: null },
  };
}

export async function countEarlyAccessSpotsTaken(): Promise<number> {
  if (!paddleConfig.earlyAccessPriceId) {
    return 0;
  }

  return prisma.subscription.count({
    where: buildEarlyAccessClaimWhere(paddleConfig.earlyAccessPriceId),
  });
}

export function buildEarlyAccessStatus(
  spotsTaken: number,
  hasEarlyAccessPrice: boolean,
): EarlyAccessStatus {
  const maxSpots = earlyAccessConfig.maxSpots;
  const spotsRemaining = Math.max(0, maxSpots - spotsTaken);
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

export async function getEarlyAccessStatus(): Promise<EarlyAccessStatus> {
  const spotsTaken = await countEarlyAccessSpotsTaken();
  return buildEarlyAccessStatus(
    spotsTaken,
    Boolean(paddleConfig.earlyAccessPriceId),
  );
}
