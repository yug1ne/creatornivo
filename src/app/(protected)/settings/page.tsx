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
import { isPublicCheckoutEnabled } from "@/config/freemius";
import { formatSignInMethods } from "@/lib/auth/sign-in-methods";
import { requireSession } from "@/lib/auth/session";
import { getAccountDeletionBlock } from "@/lib/privacy/account-deletion-policy";
import { prisma } from "@/lib/db";
import { userSupportAttentionCount } from "@/lib/support/counts";
import { getUserSupportStatusCounts } from "@/lib/support/service";
import { prismaSupportStore } from "@/lib/support/store";
import { isAdminSession } from "@/lib/admin/is-admin-session";
import { countActiveAppSumoRedemptions } from "@/lib/appsumo/entitlement";
import { getEffectiveUsageSnapshot, resolveUserAccess } from "@/lib/trial/access";
import { formatHumanUtcDateTime } from "@/lib/usage/quota-copy";

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
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        provider: true,
        paddleStatus: true,
        freemiusUserId: true,
        freemiusLicenseId: true,
        freemiusSubscriptionId: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: session.id },
      select: {
        password: true,
        plan: true,
        emailVerified: true,
        trialStartedAt: true,
        trialEndsAt: true,
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

  const access = identity
    ? resolveUserAccess(identity, {
        isAdmin: isAdminSession(session),
        activeAppSumoCodeCount: await countActiveAppSumoRedemptions(session.id),
      })
    : null;
  const planLabel = session.plan === PLANS.PRO ? "Pro" : "Free";
  const usageSnapshot = access
    ? await getEffectiveUsageSnapshot(session.id, access)
    : null;

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
              {access?.mode === "trial" && access.trialEndsAt ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Trial</dt>
                  <dd className="text-right text-foreground">
                    Active until {formatHumanUtcDateTime(access.trialEndsAt)}
                  </dd>
                </div>
              ) : null}
              {access && access.appSumo.tier > 0 ? (
                <>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Lifetime access</dt>
                    <dd className="text-right text-foreground">
                      {access.appSumo.dormant
                        ? `AppSumo Tier ${access.appSumo.tier} — saved as lifetime fallback`
                        : `AppSumo Tier ${access.appSumo.tier}`}
                    </dd>
                  </div>
                  {access.appSumo.dormant ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Current access</dt>
                      <dd className="text-right text-foreground">
                        Freemius Pro currently provides access.
                      </dd>
                    </div>
                  ) : usageSnapshot ? (
                    <>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">
                          Monthly AI-assisted drafts
                        </dt>
                        <dd className="text-right text-foreground">
                          {usageSnapshot.used} / {usageSnapshot.limit} used
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Allowance resets</dt>
                        <dd className="text-right text-foreground">
                          {formatHumanUtcDateTime(usageSnapshot.resetAt)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Templates</dt>
                        <dd className="text-right text-foreground">45</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Saved drafts</dt>
                        <dd className="text-right text-foreground">Unlimited</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Export</dt>
                        <dd className="text-right text-foreground">Enabled</dd>
                      </div>
                    </>
                  ) : null}
                </>
              ) : null}
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
          publicCheckoutEnabled={isPublicCheckoutEnabled()}
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
