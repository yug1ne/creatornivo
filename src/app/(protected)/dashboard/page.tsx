import Link from "next/link";

import { DashboardRecentSaves } from "@/components/dashboard/dashboard-recent-saves";
import { StatsCard } from "@/components/dashboard/stats-card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { PLANS } from "@/config/plans";
import {
  clearStaleSessionAndRedirect,
  isStaleSessionUsageError,
} from "@/lib/auth/stale-session";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  getEffectiveUsageSnapshot,
  getUserAccessContext,
  isAppSumoAccessMode,
} from "@/lib/trial/access";
import { getRemainingGenerationsLabel } from "@/lib/subscriptions/messages";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession();

  const access = await getUserAccessContext(session);
  if (!access) {
    return clearStaleSessionAndRedirect();
  }

  let usageSnapshot: Awaited<ReturnType<typeof getEffectiveUsageSnapshot>>;
  try {
    usageSnapshot = await getEffectiveUsageSnapshot(session.id, access);
  } catch (error) {
    if (isStaleSessionUsageError(error)) {
      await clearStaleSessionAndRedirect();
    }
    throw error;
  }

  const [savedCount, recentPrompts] = await Promise.all([
    prisma.savedPrompt.count({ where: { userId: session.id } }),
    prisma.savedPrompt.findMany({
      where: { userId: session.id },
      orderBy: { updatedAt: "desc" },
      take: 3,
      include: { template: { select: { title: true } } },
    }),
  ]);

  const maxPrompts =
    access.maxSavedPrompts === Infinity ? "∞" : access.maxSavedPrompts;
  const generationProgress = {
    current: usageSnapshot.used,
    max: usageSnapshot.limit,
  };

  const savedProgress =
    access.maxSavedPrompts === Infinity
      ? undefined
      : { current: savedCount, max: access.maxSavedPrompts };

  return (
    <>
      <PageHeader
        title="Overview"
        description={`Welcome${session.name ? `, ${session.name}` : ""}! Here is a summary of your account.`}
        action={
          <Badge variant={session.plan === PLANS.PRO ? "pro" : "free"}>
            {access.mode === "appsumo_t2"
              ? "AppSumo Tier 2"
              : access.mode === "appsumo_t1"
                ? "AppSumo Tier 1"
                : session.plan === PLANS.PRO
                  ? "Pro"
                  : "Free"}
          </Badge>
        }
      />

      <div className="mb-8 flex flex-wrap gap-3">
        <Link href="/generate" className={buttonVariants()}>
          New generation
        </Link>
        <Link href="/templates" className={buttonVariants({ variant: "outline" })}>
          All templates
        </Link>
      </div>

      <div
        data-onboarding="dashboard-stats"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <StatsCard
          label={`Generations ${
            usageSnapshot.period === "trial"
              ? "in trial"
              : usageSnapshot.period === "daily"
              ? "today"
              : usageSnapshot.quotaBasis === "provider_billing"
                ? "this billing period"
                : "this calendar month"
          }`}
          value={getRemainingGenerationsLabel(
            session.plan,
            usageSnapshot.remaining,
            usageSnapshot.quotaBasis,
          )}
          description={`${usageSnapshot.used} / ${usageSnapshot.limit} used`}
          icon="✦"
          progress={generationProgress}
          href="/generate"
          hrefLabel="Generate"
        />
        <StatsCard
          label="Saved prompts"
          value={`${savedCount} / ${maxPrompts}`}
          description="In your library"
          icon="▤"
          progress={savedProgress}
          href="/library"
          hrefLabel="Open library"
        />
        <StatsCard
          label="Plan"
          value={
            access.mode === "appsumo_t2"
              ? "AppSumo Tier 2"
              : access.mode === "appsumo_t1"
                ? "AppSumo Tier 1"
                : session.plan === PLANS.PRO
                  ? "Pro"
                  : "Free"
          }
          description={
            session.plan === PLANS.PRO
              ? access.appSumo.dormant
                ? "Pro access · AppSumo saved as fallback"
                : "Your current plan"
              : isAppSumoAccessMode(access.mode)
                ? "Lifetime AppSumo access · Manage account in Settings"
                : "Free plan · Manage account in Settings"
          }
          icon="◈"
          href="/settings"
          hrefLabel="Open Settings"
        />
      </div>

      <DashboardRecentSaves
        prompts={recentPrompts.map((prompt) => ({
          id: prompt.id,
          title: prompt.title,
          updatedAt: prompt.updatedAt,
          templateTitle: prompt.template?.title ?? null,
        }))}
      />

      {access.mode === "appsumo_t1" ? (
        <Card className="mt-8 border-border bg-muted/40">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Need more generations?
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Upgrade to Tier 2 with a second AppSumo code.
              </p>
            </div>
            <Link
              href="/appsumo"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Upgrade to Tier 2
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {(access.mode === "free" || access.mode === "trial") && (
        <Card className="mt-8 border-primary/20 bg-accent/30">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-foreground">
                Need more generations?
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pro gives you 100 drafts per billing period, all templates, and export to .md /
                .txt. Self-serve checkout may be paused — see pricing for Early
                Access options.
              </p>
            </div>
            <Link href="/pricing" className={buttonVariants()}>
              View pricing
            </Link>
          </CardContent>
        </Card>
      )}
    </>
  );
}
