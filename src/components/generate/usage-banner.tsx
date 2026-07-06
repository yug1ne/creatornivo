import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  getGenerationLimitMessage,
  getRemainingGenerationsLabel,
  getSaveLimitMessage,
} from "@/lib/subscriptions/messages";
import type { Plan } from "@/config/plans";
import type { UsagePeriod } from "@/lib/usage";

interface UsageBannerProps {
  plan: Plan;
  remaining: number;
  used: number;
  limit: number;
  period: UsagePeriod;
  resetAt: string;
  savedCount: number;
  maxSavedPrompts: number;
}

function formatResetHint(period: UsagePeriod, resetAt: string): string {
  const resetDate = new Date(resetAt);
  if (Number.isNaN(resetDate.getTime())) {
    return period === "daily" ? "Resets at midnight UTC" : "Resets monthly UTC";
  }

  return period === "daily"
    ? `Resets ${resetDate.toLocaleString(undefined, { timeZone: "UTC", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}`
    : `Resets ${resetDate.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })} UTC`;
}

export function UsageBanner({
  plan,
  remaining,
  used,
  limit,
  period,
  resetAt,
  savedCount,
  maxSavedPrompts,
}: UsageBannerProps) {
  const generationWarning = getGenerationLimitMessage(plan, used);
  const saveWarning = getSaveLimitMessage(plan, savedCount);
  const isGenerationExhausted = remaining <= 0;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  Generation quota
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {getRemainingGenerationsLabel(plan, remaining)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {used} of {limit} used · {formatResetHint(period, resetAt)}
                </p>
              </div>
            </div>
            <Progress className="mt-2" value={used} max={limit} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                Saved in library
              </p>
              <span className="text-xs font-semibold text-foreground">
                {maxSavedPrompts === Infinity
                  ? savedCount
                  : `${savedCount} / ${maxSavedPrompts}`}
              </span>
            </div>
            {maxSavedPrompts !== Infinity && (
              <Progress
                className="mt-2"
                value={savedCount}
                max={maxSavedPrompts}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {generationWarning && (
        <div
          className={`rounded-[var(--radius-md)] px-4 py-3 text-sm ${
            isGenerationExhausted
              ? "bg-destructive/10 text-destructive"
              : "bg-warning/10 text-warning"
          }`}
        >
          {generationWarning}
          {isGenerationExhausted && (
            <Link
              href="/pricing"
              className="ml-2 font-medium underline hover:no-underline"
            >
              View pricing
            </Link>
          )}
        </div>
      )}

      {saveWarning && !isGenerationExhausted && (
        <div className="rounded-[var(--radius-md)] bg-warning/10 px-4 py-3 text-sm text-warning">
          {saveWarning}
        </div>
      )}
    </div>
  );
}