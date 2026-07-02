import { getEarlyAccessStatus } from "@/lib/early-access/status";
import { paddleConfig } from "@/config/paddle";
import { stripeConfig } from "@/config/stripe";
import type { BillingProvider } from "@/config/billing";

export async function resolveCheckoutPriceId(
  provider: BillingProvider,
): Promise<string> {
  const status = await getEarlyAccessStatus();

  if (provider === "paddle") {
    if (status.isAvailable && paddleConfig.earlyAccessPriceId) {
      return paddleConfig.earlyAccessPriceId;
    }
    return paddleConfig.proPriceId;
  }

  if (status.isAvailable && stripeConfig.earlyAccessPriceId) {
    return stripeConfig.earlyAccessPriceId;
  }

  return stripeConfig.proPriceId;
}