import Link from "next/link";

import { earlyAccessConfig } from "@/config/early-access";
import { pricingPlans } from "@/config/pricing-display";
import {
  getActiveBillingProvider,
  isBillingCheckoutConfigured,
} from "@/config/billing";
import { PLANS } from "@/config/plans";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProPlanPricing } from "@/components/pricing/pro-plan-pricing";
import { UpgradeButton } from "@/components/pricing/upgrade-button";
import { getEarlyAccessStatus } from "@/lib/early-access/status";
import { cn } from "@/lib/utils/cn";

export async function PricingSection() {
  const billingReady = isBillingCheckoutConfigured();
  const billingProvider = getActiveBillingProvider();
  const earlyAccessStatus = await getEarlyAccessStatus();

  return (
    <section id="pricing" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Pricing</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Start free. Scale when you&apos;re ready.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Everything you need to test the workflow on Free. Unlock unlimited
            power on Pro.
          </p>
          {earlyAccessStatus.isAvailable && (
            <p className="mt-3 text-sm font-medium text-primary">
              {earlyAccessConfig.limitLabel} — lock in {earlyAccessStatus.price}
              /mo before spots run out
            </p>
          )}
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
                  <Badge variant={plan.badge}>{plan.name}</Badge>
                </div>

                {plan.id === PLANS.PRO ? (
                  <ProPlanPricing status={earlyAccessStatus} size="lg" />
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
                  <UpgradeButton
                    isConfigured={billingReady}
                    billingProvider={billingProvider}
                    earlyAccessAvailable={earlyAccessStatus.isAvailable}
                    earlyAccessPrice={earlyAccessStatus.price}
                  />
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