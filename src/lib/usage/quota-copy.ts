import { PLANS, type Plan } from "@/config/plans";

import type { UsagePeriod } from "@/lib/usage";

/** Human-readable countdown until `resetAt` (e.g. "in about 4 hours"). */
export function getQuotaResetCountdown(
  resetAt: string,
  now = new Date(),
): string {
  const resetMs = new Date(resetAt).getTime();
  if (Number.isNaN(resetMs)) {
    return "soon";
  }

  const diffMs = resetMs - now.getTime();
  if (diffMs <= 0) {
    return "now";
  }

  const minutes = Math.ceil(diffMs / (60 * 1000));
  if (minutes < 60) {
    return minutes === 1 ? "in about 1 minute" : `in about ${minutes} minutes`;
  }

  const hours = Math.ceil(diffMs / (60 * 60 * 1000));
  if (hours < 24) {
    return hours === 1 ? "in about 1 hour" : `in about ${hours} hours`;
  }

  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  return days === 1 ? "in about 1 day" : `in about ${days} days`;
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function formatUtcTime(resetDate: Date): string {
  return resetDate.toLocaleTimeString("en-US", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Compact reset label for usage cards (banner, stats). */
export function getQuotaResetHint(
  period: UsagePeriod,
  resetAt: string,
  now = new Date(),
): string {
  const resetDate = new Date(resetAt);
  if (Number.isNaN(resetDate.getTime())) {
    return period === "daily" ? "Resets at midnight UTC" : "Resets monthly UTC";
  }

  const countdown = getQuotaResetCountdown(resetAt, now);

  if (period === "daily") {
    const time = formatUtcTime(resetDate);
    if (isSameUtcDay(resetDate, now)) {
      return `Resets today at ${time} UTC (${countdown})`;
    }

    const dateLabel = resetDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    return `Resets at ${time} UTC on ${dateLabel} (${countdown})`;
  }

  const dateLabel = resetDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `Resets on ${dateLabel} UTC (${countdown})`;
}

/** Short banner line when quota is exhausted (usage banner, button title). */
export function getQuotaExhaustedBannerMessage(
  plan: Plan,
  resetAt: string,
  now = new Date(),
): string {
  const countdown = getQuotaResetCountdown(resetAt, now);

  if (plan === PLANS.FREE) {
    const resetDate = new Date(resetAt);
    const time =
      Number.isNaN(resetDate.getTime()) ? "00:00" : formatUtcTime(resetDate);
    const resetPhrase = isSameUtcDay(resetDate, now)
      ? `today at ${time} UTC`
      : `at ${time} UTC on ${resetDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        })}`;

    return `You've reached today's free generation limit. Resets ${resetPhrase} (${countdown}).`;
  }

  const resetDate = new Date(resetAt);
  const dateLabel = Number.isNaN(resetDate.getTime())
    ? "the next month"
    : resetDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });

  return `You've reached your monthly generation limit. Resets on ${dateLabel} UTC (${countdown}).`;
}

/** Headline + body for API 429 / inline error on Generate. */
export function getQuotaExceededCopy(
  plan: Plan,
  resetAt: string,
  now = new Date(),
): { error: string; message: string } {
  const countdown = getQuotaResetCountdown(resetAt, now);

  if (plan === PLANS.FREE) {
    const resetDate = new Date(resetAt);
    const time =
      Number.isNaN(resetDate.getTime()) ? "00:00" : formatUtcTime(resetDate);
    const resetPhrase = isSameUtcDay(resetDate, now)
      ? `today at ${time} UTC`
      : `at ${time} UTC on ${resetDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        })}`;

    return {
      error: "Daily generation limit reached",
      message: `You've used all 5 free generations today. Resets ${resetPhrase} (${countdown}). Upgrade to Pro for 100 generations per month.`,
    };
  }

  const resetDate = new Date(resetAt);
  const dateLabel = Number.isNaN(resetDate.getTime())
    ? "the start of next month"
    : resetDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });

  return {
    error: "Monthly generation limit reached",
    message: `You've used all 100 Pro generations this month. Resets on ${dateLabel} UTC (${countdown}).`,
  };
}

export const GENERATION_DISABLED_MESSAGE =
  "Generation is temporarily unavailable. We're fixing this — your quota wasn't used. Try again in a few minutes.";

/** Inline hint when the Generate button is disabled due to form state. */
export function getGenerateDisabledHint(input: {
  hasTemplate: boolean;
  values: Record<string, string>;
  variableCount: number;
  isFormValid: boolean;
  canGenerate: boolean;
  isStreaming: boolean;
}): string | null {
  const { hasTemplate, values, variableCount, isFormValid, canGenerate, isStreaming } =
    input;

  if (isStreaming || !hasTemplate || !canGenerate || isFormValid) {
    return null;
  }

  if (variableCount === 0) {
    return "Fill in all required fields above to generate.";
  }

  const allEmpty = Object.values(values).every((value) => !value.trim());
  if (allEmpty) {
    return "Add a topic in Parameters to continue.";
  }

  return "Fill in all required fields above to generate.";
}