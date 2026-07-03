import { earlyAccessConfig, type EarlyAccessStatus } from "@/config/early-access";
import { paddleConfig } from "@/config/paddle";

export function buildEarlyAccessStatus(
  hasEarlyAccessPrice: boolean,
): EarlyAccessStatus {
  return {
    isAvailable: hasEarlyAccessPrice,
    price: earlyAccessConfig.price,
    regularPrice: earlyAccessConfig.regularPrice,
    discountPercent: earlyAccessConfig.discountPercent,
    limitLabel: earlyAccessConfig.limitLabel,
  };
}

export async function getEarlyAccessStatus(): Promise<EarlyAccessStatus> {
  return buildEarlyAccessStatus(Boolean(paddleConfig.earlyAccessPriceId));
}
