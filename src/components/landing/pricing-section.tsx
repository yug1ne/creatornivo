import Link from "next/link";

import { earlyAccessConfig } from "@/config/early-access";
import { freemiusPricingDisplay } from "@/config/freemius-pricing-display";
import { isPublicCheckoutEnabled } from "@/config/freemius";
import { pricingPlans } from "@/config/pricing-display";
import { PLANS } from "@/config/plans";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProPlanCta } from "@/components/pricing/pro-plan-cta";
import { ProPlanPriceBlock } from "@/components/pricing/pro-plan-price-block";
import { getEarlyAccessStatus } from "@/lib/early-access/status";
import { cn } from "@/lib/utils/cn";

export async function PricingSection() {
  const earlyAccessStatus = await getEarlyAccessStatus();
  const publicCheckoutEnabled = isPublicCheckoutEnabled();

  return (
    <section id="pricing" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Pricing</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Start free. Scale when you&apos;re ready.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Everything you need to test the workflow on Free. Unlock more
            capacity and Pro tools.
          </p>
          {publicCheckoutEnabled ? (
            <p className="mt-3 text-sm font-medium text-primary">
              {freemiusPricingDisplay.sectionTopLine}
            </p>
          ) : earlyAccessStatus.isAvailable ? (
            <p className="mt-3 text-sm font-medium text-primary">
              {earlyAccessConfig.sectionTopLine}
            </p>
          ) : null}
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-8 md:grid-cols-2">
          {pricingPlans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "relative overflow-hidden",
                plan.highlighted && "border-primary shadow-[var(--shadow-md)]",
              )}
            >
              {plan.highlighted && (
                <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
              )}
              <CardContent className="p-8">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-foreground">
                    {plan.name}
                  </h3>
                </div>

                {plan.id === PLANS.PRO ? (
                  <ProPlanPriceBlock
                    earlyAccessStatus={earlyAccessStatus}
                    size="lg"
                  />
                ) : (
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {plan.period}
                    </span>
                  </div>
                )}

                <p className="mt-3 text-sm text-muted-foreground">
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
                  <ProPlanCta size="lg" />
                ) : (
                  <Link
                    href={plan.cta.href}
                    className={buttonVariants({
                      className: "mt-6 w-full",
                      size: "lg",
                    })}
                  >
                    {plan.cta.label}
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
