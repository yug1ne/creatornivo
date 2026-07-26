import { earlyAccessConfig, type EarlyAccessStatus } from "@/config/early-access";
import { isPublicCheckoutEnabled } from "@/config/freemius";
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
    foundingCouponCode: earlyAccessConfig.foundingCouponCode,
    foundingCouponCopy: earlyAccessConfig.foundingCouponCopy,
  };
}

/**
 * Public Early Access display while PUBLIC_CHECKOUT_ENABLED !== "true":
 * regular Pro $9.90 + visible FOUNDING20 founding offer ($4.90).
 *
 * Not gated on PADDLE_EARLY_ACCESS_PRICE_ID for UI copy.
 * When public Freemius checkout is on, pricing UI uses Freemius display instead.
 */
export async function getEarlyAccessStatus(
  env: NodeJS.ProcessEnv = process.env,
): Promise<EarlyAccessStatus> {
  if (!isPublicCheckoutEnabled(env)) {
    return buildEarlyAccessStatus(true);
  }

  return buildEarlyAccessStatus(Boolean(paddleConfig.earlyAccessPriceId));
}
