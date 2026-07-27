import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SubscriptionManager } from "@/components/settings/subscription-manager";
import { PLANS } from "@/config/plans";
import {
  getActiveBillingProvider,
  isBillingConfigured,
} from "@/config/billing";
import { isPublicCheckoutEnabled } from "@/config/freemius";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Billing settings (Phase 5-pre).
 * Handles Freemius success/cancel return URLs:
 *   /settings/billing?checkout=success
 *   /settings/billing?checkout=cancelled
 * Does not grant Pro from query params — webhook remains source of truth.
 */
export default async function SettingsBillingPage() {
  const session = await requireSession();

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.id },
    select: {
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      provider: true,
      freemiusUserId: true,
      freemiusLicenseId: true,
      freemiusSubscriptionId: true,
    },
  });

  const planLabel = session.plan === PLANS.PRO ? "Pro" : "Free";
  const publicCheckoutEnabled = isPublicCheckoutEnabled();

  return (
    <>
      <PageHeader
        title="Billing"
        description="Plan, subscription status, and payment management"
        action={
          <Badge variant={session.plan === PLANS.PRO ? "pro" : "free"}>
            {planLabel}
          </Badge>
        }
      />

      <div className="max-w-lg space-y-6">
        <SubscriptionManager
          plan={session.plan}
          isBillingConfigured={isBillingConfigured()}
          billingProvider={getActiveBillingProvider()}
          publicCheckoutEnabled={publicCheckoutEnabled}
          subscription={
            subscription
              ? {
                  status: subscription.status,
                  currentPeriodStart:
                    subscription.currentPeriodStart?.toISOString() ?? null,
                  currentPeriodEnd:
                    subscription.currentPeriodEnd?.toISOString() ?? null,
                  cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                  provider: subscription.provider,
                  freemiusUserId: subscription.freemiusUserId,
                  freemiusLicenseId: subscription.freemiusLicenseId,
                  freemiusSubscriptionId: subscription.freemiusSubscriptionId,
                }
              : null
          }
        />

        <p className="text-sm text-muted-foreground">
          Paid Pro access is activated after payment confirmation.
          {subscription?.currentPeriodStart && subscription?.currentPeriodEnd
            ? " Generation quota follows your provider billing period when available."
            : " Generation quota for Pro without a provider period uses UTC calendar months."}
        </p>

        <Link
          href="/settings"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Back to settings
        </Link>
      </div>
    </>
  );
}
