import {
  earlyAccessConfig,
  type EarlyAccessStatus,
} from "@/config/early-access";
import { isPublicCheckoutEnabled } from "@/config/freemius";
import { FreemiusProPricing } from "@/components/pricing/freemius-pro-pricing";
import { ProPlanPricing } from "@/components/pricing/pro-plan-pricing";

interface ProPlanPriceBlockProps {
  earlyAccessStatus: EarlyAccessStatus;
  size?: "md" | "lg";
}

/**
 * Pro price block:
 * - PUBLIC_CHECKOUT_ENABLED === "true" → Freemius monthly/annual + FOUNDING20
 * - otherwise → regular $9.90 + visible FOUNDING20 founding offer ($4.90)
 */
export function ProPlanPriceBlock({
  earlyAccessStatus,
  size = "md",
}: ProPlanPriceBlockProps) {
  if (isPublicCheckoutEnabled()) {
    return <FreemiusProPricing size={size} />;
  }

  // Checkout disabled: always show coupon-visible Early Access founding offer.
  // Not gated on PADDLE_EARLY_ACCESS_PRICE_ID.
  const foundingStatus: EarlyAccessStatus = {
    ...earlyAccessStatus,
    isAvailable: true,
    price: earlyAccessConfig.price,
    regularPrice: earlyAccessConfig.regularPrice,
    limitLabel: earlyAccessConfig.limitLabel,
    foundingCouponCode: earlyAccessConfig.foundingCouponCode,
    foundingCouponCopy: earlyAccessConfig.foundingCouponCopy,
  };

  return <ProPlanPricing status={foundingStatus} size={size} />;
}
