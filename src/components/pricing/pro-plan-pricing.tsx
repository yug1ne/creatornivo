import type { EarlyAccessStatus } from "@/config/early-access";
import { earlyAccessConfig } from "@/config/early-access";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

interface ProPlanPricingProps {
  status: EarlyAccessStatus;
  size?: "md" | "lg";
}

/**
 * Early Access Pro price block (public checkout disabled):
 * - Main list price: regular $9.90/month
 * - Founding offer with visible FOUNDING20 code → $4.90/month
 * Does not claim live remaining seats.
 */
export function ProPlanPricing({ status, size = "md" }: ProPlanPricingProps) {
  const priceClass = size === "lg" ? "text-4xl" : "text-3xl";

  if (!status.isAvailable) {
    return (
      <div className="mt-4 flex items-baseline gap-1">
        <span className={cn("font-bold text-foreground", priceClass)}>
          {status.regularPrice}
        </span>
        <span className="text-sm text-muted-foreground">/ per month</span>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="pro">{earlyAccessConfig.badgeLabel}</Badge>
        <Badge variant="success">{earlyAccessConfig.foundingBadgeLabel}</Badge>
      </div>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={cn("font-bold text-foreground", priceClass)}>
          {status.regularPrice}
        </span>
        <span className="text-sm text-muted-foreground">/ per month</span>
      </div>
      <p className="text-sm font-medium text-primary">
        {status.foundingCouponCopy ?? earlyAccessConfig.foundingCouponCopy}
      </p>
      <p className="text-xs text-muted-foreground">
        {status.limitLabel}
      </p>
    </div>
  );
}
