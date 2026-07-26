import {
  freemiusFoundingOfferActive,
  freemiusPricingDisplay,
} from "@/config/freemius-pricing-display";
import { cn } from "@/lib/utils/cn";

interface FreemiusProPricingProps {
  size?: "md" | "lg";
}

/**
 * Pro price + compact billing options (same plan, different cycles).
 * Founding-active: $9.90 regular headline + founding monthly / annual options block.
 * No floating “or $99 / year” line; no extra Founding badge (section top owns audience).
 */
export function FreemiusProPricing({ size = "md" }: FreemiusProPricingProps) {
  const priceClass = size === "lg" ? "text-4xl" : "text-3xl";

  if (freemiusFoundingOfferActive) {
    return (
      <div className="mt-4 space-y-4">
        <div>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className={cn("font-bold text-foreground", priceClass)}>
              {freemiusPricingDisplay.monthlyPrice}
            </span>
            <span className="text-sm text-muted-foreground">
              / {freemiusPricingDisplay.monthlyPeriodLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {freemiusPricingDisplay.regularMonthlyLabel}
          </p>
        </div>

        <div
          className="overflow-hidden rounded-lg border border-border bg-muted/30"
          data-billing-options="true"
        >
          <div className="border-b border-border px-3 py-3 sm:px-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {freemiusPricingDisplay.billingOptionFoundingTitle}
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {freemiusPricingDisplay.billingOptionFoundingPrice}
            </p>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              {freemiusPricingDisplay.billingOptionFoundingDetail}
            </p>
          </div>
          <div className="px-3 py-3 sm:px-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {freemiusPricingDisplay.billingOptionAnnualTitle}
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {freemiusPricingDisplay.billingOptionAnnualPrice}
            </p>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              {freemiusPricingDisplay.billingOptionAnnualDetail}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={cn("font-bold text-foreground", priceClass)}>
          {freemiusPricingDisplay.monthlyPrice}
        </span>
        <span className="text-sm text-muted-foreground">
          / {freemiusPricingDisplay.monthlyPeriodLabel}
        </span>
      </div>
      <div
        className="overflow-hidden rounded-lg border border-border bg-muted/30"
        data-billing-options="true"
      >
        <div className="border-b border-border px-3 py-3 sm:px-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Monthly
          </p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {freemiusPricingDisplay.monthlyPrice}/
            {freemiusPricingDisplay.monthlyPeriodLabel}
          </p>
        </div>
        <div className="px-3 py-3 sm:px-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {freemiusPricingDisplay.billingOptionAnnualTitle}
          </p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {freemiusPricingDisplay.billingOptionAnnualPrice}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            {freemiusPricingDisplay.billingOptionAnnualDetail}
          </p>
        </div>
      </div>
    </div>
  );
}
