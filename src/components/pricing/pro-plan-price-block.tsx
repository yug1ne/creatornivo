import type { EarlyAccessStatus } from "@/config/early-access";
import { isPublicCheckoutEnabled } from "@/config/freemius";
import { FreemiusProPricing } from "@/components/pricing/freemius-pro-pricing";
import { ProPlanPricing } from "@/components/pricing/pro-plan-pricing";

interface ProPlanPriceBlockProps {
  earlyAccessStatus: EarlyAccessStatus;
  size?: "md" | "lg";
}

/**
 * Pro price block: Freemius regular + founding copy when public checkout is on;
 * otherwise existing Early Access pricing display.
 */
export function ProPlanPriceBlock({
  earlyAccessStatus,
  size = "md",
}: ProPlanPriceBlockProps) {
  if (isPublicCheckoutEnabled()) {
    return <FreemiusProPricing size={size} />;
  }
  return <ProPlanPricing status={earlyAccessStatus} size={size} />;
}
