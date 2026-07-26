import { freemiusPricingDisplay } from "@/config/freemius-pricing-display";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

interface FreemiusProPricingProps {
  size?: "md" | "lg";
}

/**
 * Pro price display when public Freemius checkout is enabled.
 * Shows regular monthly/annual prices and an honest FOUNDING20 note.
 * Does not claim live remaining seats or permanent $4.90 Pro pricing.
 */
export function FreemiusProPricing({ size = "md" }: FreemiusProPricingProps) {
  const priceClass = size === "lg" ? "text-4xl" : "text-3xl";

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={cn("font-bold text-foreground", priceClass)}>
          {freemiusPricingDisplay.monthlyPrice}
        </span>
        <span className="text-sm text-muted-foreground">
          / {freemiusPricingDisplay.monthlyPeriodLabel}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        or{" "}
        <span className="font-medium text-foreground">
          {freemiusPricingDisplay.annualPrice}
        </span>{" "}
        / {freemiusPricingDisplay.annualPeriodLabel}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="pro">Founding offer</Badge>
        <span className="text-xs text-muted-foreground">
          Code {freemiusPricingDisplay.foundingCouponCode}
        </span>
      </div>
      <p className="text-sm font-medium text-primary">
        {freemiusPricingDisplay.foundingOfferCopy}
      </p>
    </div>
  );
}
