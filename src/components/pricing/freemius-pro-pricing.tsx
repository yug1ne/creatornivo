import {
  freemiusFoundingOfferActive,
  freemiusPricingDisplay,
} from "@/config/freemius-pricing-display";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

interface FreemiusProPricingProps {
  size?: "md" | "lg";
}

/**
 * Pro price display when public Freemius checkout is enabled.
 * Founding-active: $9.90 regular list + short founding $4.90 line + auto-apply note.
 * Does not repeat “first 20 customers” (that lives in the section top line only).
 */
export function FreemiusProPricing({ size = "md" }: FreemiusProPricingProps) {
  const priceClass = size === "lg" ? "text-4xl" : "text-3xl";

  if (freemiusFoundingOfferActive) {
    return (
      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="pro">Founding offer</Badge>
        </div>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className={cn("font-bold text-foreground", priceClass)}>
            {freemiusPricingDisplay.monthlyPrice}
          </span>
          <span className="text-sm text-muted-foreground">
            / {freemiusPricingDisplay.monthlyPeriodLabel}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {freemiusPricingDisplay.regularMonthlyLabel}
        </p>
        <p className="text-sm font-medium text-primary">
          {freemiusPricingDisplay.foundingPriceLine}
        </p>
        <p className="text-xs text-muted-foreground">
          {freemiusPricingDisplay.autoApplyLine}
        </p>
        <p className="text-sm text-muted-foreground">
          or{" "}
          <span className="font-medium text-foreground">
            {freemiusPricingDisplay.annualPrice}
          </span>{" "}
          / {freemiusPricingDisplay.annualPeriodLabel}
        </p>
      </div>
    );
  }

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
    </div>
  );
}
