import Link from "next/link";

import { earlyAccessConfig } from "@/config/early-access";
import { pricingPlans } from "@/config/pricing-display";
import { PLANS } from "@/config/plans";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProPlanPricing } from "@/components/pricing/pro-plan-pricing";
import { RequestEarlyAccessCta } from "@/components/pricing/request-early-access-cta";
import { getEarlyAccessStatus } from "@/lib/early-access/status";
import { cn } from "@/lib/utils/cn";

export default async function PricingPage() {
  const earlyAccessStatus = await getEarlyAccessStatus();

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Pricing
        </h1>
        <p className="mt-4 text-muted-foreground">
          Start for free and upgrade to Pro when you need more capabilities.
        </p>
        {earlyAccessStatus.isAvailable && (
          <p className="mt-3 text-sm font-medium text-primary">
            {earlyAccessConfig.limitLabel}
          </p>
        )}
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-8 md:grid-cols-2">
        {pricingPlans.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              plan.highlighted && "border-primary shadow-[var(--shadow-md)]",
            )}
          >
            <CardContent className="p-8">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground">
                  {plan.name}
                </h2>
              </div>

              {plan.id === PLANS.PRO ? (
                <ProPlanPricing status={earlyAccessStatus} />
              ) : (
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {plan.period}
                  </span>
                </div>
              )}

              <p className="mt-2 text-sm text-muted-foreground">
                {plan.description}
              </p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-foreground/80"
                  >
                    <span className="mt-0.5 text-success">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.id === PLANS.PRO ? (
                <RequestEarlyAccessCta />
              ) : (
                <Link
                  href={plan.cta.href}
                  className={buttonVariants({ className: "mt-6 w-full" })}
                >
                  {plan.cta.label}
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
