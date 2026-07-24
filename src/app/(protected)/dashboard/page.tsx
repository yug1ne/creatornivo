import Link from "next/link";

import { DashboardRecentSaves } from "@/components/dashboard/dashboard-recent-saves";
import { StatsCard } from "@/components/dashboard/stats-card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { getPlanLimits, PLANS } from "@/config/plans";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getUserUsageSnapshot } from "@/lib/usage";
import { getRemainingGenerationsLabel } from "@/lib/subscriptions/messages";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession();
  const limits = getPlanLimits(session.plan);

  const [savedCount, usageSnapshot, recentPrompts] = await Promise.all([
    prisma.savedPrompt.count({ where: { userId: session.id } }),
    getUserUsageSnapshot(session.id, session.plan),
    prisma.savedPrompt.findMany({
      where: { userId: session.id },
      orderBy: { updatedAt: "desc" },
      take: 3,
      include: { template: { select: { title: true } } },
    }),
  ]);

  const maxPrompts =
    limits.maxSavedPrompts === Infinity ? "∞" : limits.maxSavedPrompts;
  const generationProgress = {
    current: usageSnapshot.used,
    max: usageSnapshot.limit,
  };

  const savedProgress =
    limits.maxSavedPrompts === Infinity
      ? undefined
      : { current: savedCount, max: limits.maxSavedPrompts };

  return (
    <>
      <PageHeader
        title="Overview"
        description={`Welcome${session.name ? `, ${session.name}` : ""}! Here is a summary of your account.`}
        action={
          <Badge variant={session.plan === PLANS.PRO ? "pro" : "free"}>
            {session.plan === PLANS.PRO ? "Pro" : "Free"}
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
            usageSnapshot.period === "daily" ? "today" : "this calendar month"
          }`}
          value={getRemainingGenerationsLabel(
            session.plan,
            usageSnapshot.remaining,
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
          value={session.plan === PLANS.PRO ? "Pro" : "Free"}
          description={
            session.plan === PLANS.PRO
              ? "Your current plan"
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

      {session.plan === PLANS.FREE && (
        <Card className="mt-8 border-primary/20 bg-accent/30">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-foreground">
                Need more generations?
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pro gives you 100/month, all templates, and export to .md /
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
