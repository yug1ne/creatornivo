import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { PrivacySettings } from "@/components/settings/privacy-settings";
import { ThemeSettings } from "@/components/settings/theme-settings";
import { SubscriptionManager } from "@/components/settings/subscription-manager";
import { PLANS } from "@/config/plans";
import {
  getActiveBillingProvider,
  isBillingConfigured,
} from "@/config/billing";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireSession();

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.id },
    select: {
      status: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      provider: true,
    },
  });

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your account and subscription"
        action={
          <Badge variant={session.plan === PLANS.PRO ? "pro" : "free"}>
            {session.plan === PLANS.PRO ? "Pro" : "Free"}
          </Badge>
        }
      />

      <div className="max-w-lg space-y-6">
        <ThemeSettings />

        <Card>
          <CardContent className="p-6">
            <CardTitle className="text-base">Profile</CardTitle>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="min-w-0 break-words text-right text-foreground [overflow-wrap:anywhere]">
                  {session.name ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="min-w-0 break-all text-right text-foreground">
                  {session.email}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Role</dt>
                <dd className="capitalize text-foreground">{session.role}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <PrivacySettings
          isBillingConfigured={isBillingConfigured()}
          billingProvider={getActiveBillingProvider()}
        />

        <SubscriptionManager
          plan={session.plan}
          isBillingConfigured={isBillingConfigured()}
          billingProvider={getActiveBillingProvider()}
          subscription={
            subscription
              ? {
                  status: subscription.status,
                  currentPeriodEnd:
                    subscription.currentPeriodEnd?.toISOString() ?? null,
                  cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                  provider: subscription.provider,
                }
              : null
          }
        />
      </div>
    </>
  );
}
