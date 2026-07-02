import Link from "next/link";

import { StatsCard } from "@/components/dashboard/stats-card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlanLimits, PLANS } from "@/config/plans";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { countGenerationsToday } from "@/lib/templates/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession();
  const limits = getPlanLimits(session.plan);

  const [savedCount, generationsToday, recentPrompts] = await Promise.all([
    prisma.savedPrompt.count({ where: { userId: session.id } }),
    countGenerationsToday(session.id),
    prisma.savedPrompt.findMany({
      where: { userId: session.id },
      orderBy: { updatedAt: "desc" },
      take: 3,
      include: { template: { select: { title: true } } },
    }),
  ]);

  const maxPrompts =
    limits.maxSavedPrompts === Infinity ? "∞" : limits.maxSavedPrompts;
  const maxGenerations =
    limits.maxGenerationsPerDay === Infinity
      ? "∞"
      : limits.maxGenerationsPerDay;

  const generationProgress =
    limits.maxGenerationsPerDay === Infinity
      ? undefined
      : { current: generationsToday, max: limits.maxGenerationsPerDay };

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
          label="Generations today"
          value={`${generationsToday} / ${maxGenerations}`}
          description={
            session.plan === PLANS.FREE
              ? "Limit resets at midnight"
              : "Unlimited access"
          }
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
          description={session.email}
          icon="◈"
          href="/settings"
          hrefLabel="Settings"
        />
      </div>

      {recentPrompts.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent saves</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {recentPrompts.map((prompt) => (
              <Link
                key={prompt.id}
                href={`/library/${prompt.id}`}
                className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {prompt.title}
                  </p>
                  {prompt.template && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {prompt.template.title}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {prompt.updatedAt.toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {session.plan === PLANS.FREE && (
        <Card className="mt-8 border-primary/20 bg-accent/30">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-foreground">
                Unlock full potential
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pro templates, unlimited generations, export to .md and .txt
              </p>
            </div>
            <Link href="/pricing" className={buttonVariants()}>
              Upgrade to Pro
            </Link>
          </CardContent>
        </Card>
      )}
    </>
  );
}