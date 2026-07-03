import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getGenerationLimitMessage, getSaveLimitMessage } from "@/lib/subscriptions/messages";
import type { Plan } from "@/config/plans";

interface UsageBannerProps {
  plan: Plan;
  generationsUsed: number;
  generationLimit: number;
  generationPeriod: "day" | "month";
  savedCount: number;
  maxSavedPrompts: number;
}

export function UsageBanner({
  plan,
  generationsUsed,
  generationLimit,
  generationPeriod,
  savedCount,
  maxSavedPrompts,
}: UsageBannerProps) {
  const generationWarning = getGenerationLimitMessage(plan, generationsUsed);
  const saveWarning = getSaveLimitMessage(plan, savedCount);
  const isGenerationExhausted = generationsUsed >= generationLimit;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                Generation usage
              </p>
              <span className="text-xs font-semibold text-foreground">
                {generationsUsed} of {generationLimit} generations used{" "}
                {generationPeriod === "day" ? "today" : "this month"}
              </span>
            </div>
            <Progress
              className="mt-2"
              value={generationsUsed}
              max={generationLimit}
            />
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
