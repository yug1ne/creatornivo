import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { HelpContactCard } from "@/components/settings/help-contact-card";
import { PrivacySettings } from "@/components/settings/privacy-settings";
import { ThemeSettings } from "@/components/settings/theme-settings";
import { SubscriptionManager } from "@/components/settings/subscription-manager";
import { PLANS } from "@/config/plans";
import {
  getActiveBillingProvider,
  isBillingConfigured,
} from "@/config/billing";
import { formatSignInMethods } from "@/lib/auth/sign-in-methods";
import { requireSession } from "@/lib/auth/session";
import { getAccountDeletionBlock } from "@/lib/privacy/account-deletion-policy";
import { prisma } from "@/lib/db";
import { userSupportAttentionCount } from "@/lib/support/counts";
import { getUserSupportStatusCounts } from "@/lib/support/service";
import { prismaSupportStore } from "@/lib/support/store";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireSession();
  // Role row only for durable DB admins (not env allowlist alone).
  const showRoleField = session.role === "admin";

  const [subscription, identity, supportCounts] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId: session.id },
      select: {
        status: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        provider: true,
        paddleStatus: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: session.id },
      select: {
        password: true,
        accounts: {
          select: { provider: true },
          orderBy: { provider: "asc" },
        },
      },
    }),
    getUserSupportStatusCounts(session.id, prismaSupportStore),
  ]);

  const answeredSupportCount = userSupportAttentionCount(supportCounts);

  const signInMethods = formatSignInMethods({
    hasPassword: Boolean(identity?.password),
    oauthProviders: (identity?.accounts ?? []).map((account) => account.provider),
  });

  const planLabel = session.plan === PLANS.PRO ? "Pro" : "Free";

  const deletionBlock = getAccountDeletionBlock({
    id: session.id,
    email: session.email,
    plan: session.plan,
    role: session.role,
    subscription: subscription
      ? {
          provider: subscription.provider,
          status: subscription.status,
          paddleStatus: subscription.paddleStatus,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          currentPeriodEnd: subscription.currentPeriodEnd,
        }
      : null,
  });

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your account, appearance, plan, and privacy"
        action={
          <Badge variant={session.plan === PLANS.PRO ? "pro" : "free"}>
            {planLabel}
          </Badge>
        }
      />

      <div className="max-w-lg space-y-6">
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
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="text-right text-foreground">{planLabel}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Sign-in</dt>
                <dd className="min-w-0 break-words text-right text-foreground [overflow-wrap:anywhere]">
                  {signInMethods}
                </dd>
              </div>
              {showRoleField ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Role</dt>
                  <dd className="capitalize text-foreground">{session.role}</dd>
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>

        <ThemeSettings />

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

        <PrivacySettings
          isBillingConfigured={isBillingConfigured()}
          billingProvider={getActiveBillingProvider()}
          deletionBlock={deletionBlock}
        />

        <HelpContactCard answeredSupportCount={answeredSupportCount} />
      </div>
    </>
  );
}
