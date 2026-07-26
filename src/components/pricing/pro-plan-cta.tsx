import { isPublicCheckoutEnabled } from "@/config/freemius";
import { FreemiusCheckoutCta } from "@/components/pricing/freemius-checkout-cta";
import { RequestEarlyAccessCta } from "@/components/pricing/request-early-access-cta";

interface ProPlanCtaProps {
  size?: "md" | "lg";
}

/**
 * Pro card CTA switch:
 * - PUBLIC_CHECKOUT_ENABLED !== "true" → Request Early Access (mailto)
 * - PUBLIC_CHECKOUT_ENABLED === "true" → Freemius monthly/annual/founding CTAs
 *
 * Restricted checkout is never exposed on the public pricing UI.
 */
export function ProPlanCta({ size = "md" }: ProPlanCtaProps) {
  if (isPublicCheckoutEnabled()) {
    return <FreemiusCheckoutCta size={size} showFoundingOffer />;
  }
  return <RequestEarlyAccessCta size={size} />;
}
