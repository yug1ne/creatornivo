import type { UserUsage } from "@prisma/client";

import { getGenerationPolicy, type Plan } from "@/config/plans";
import { prisma } from "@/lib/db";

/** Usage bucket type — aligns with UserUsage.period column. */
export type UsagePeriod = "daily" | "monthly";

export const USAGE_PERIOD = {
  DAILY: "daily",
  MONTHLY: "monthly",
} as const satisfies Record<string, UsagePeriod>;

export class UsageError extends Error {
  constructor(
    message: string,
    public readonly code: "invalid_input" | "database_error" = "invalid_input",
  ) {
    super(message);
    this.name = "UsageError";
  }
}

/** UTC midnight for the given instant (Free daily window). */
export function getUtcDayStart(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/** UTC first day of month at midnight (Pro monthly window). */
export function getUtcMonthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function assertUserId(userId: string): void {
  if (!userId.trim()) {
    throw new UsageError("userId is required");
  }
}

function assertUsagePeriod(period: string): asserts period is UsagePeriod {
  if (period !== USAGE_PERIOD.DAILY && period !== USAGE_PERIOD.MONTHLY) {
    throw new UsageError(
      `period must be "${USAGE_PERIOD.DAILY}" or "${USAGE_PERIOD.MONTHLY}"`,
    );
  }
}

function periodStartFor(period: UsagePeriod, now = new Date()): Date {
  return period === USAGE_PERIOD.DAILY
    ? getUtcDayStart(now)
    : getUtcMonthStart(now);
}

async function getOrCreateUsage(
  userId: string,
  period: UsagePeriod,
  now = new Date(),
): Promise<UserUsage> {
  assertUserId(userId);
  const date = periodStartFor(period, now);

  try {
    return await prisma.userUsage.upsert({
      where: {
        userId_date_period: {
          userId,
          date,
          period,
        },
      },
      create: {
        userId,
        date,
        period,
        count: 0,
      },
      update: {},
    });
  } catch {
    throw new UsageError(
      `Failed to load usage for user ${userId} (${period})`,
      "database_error",
    );
  }
}

/** Returns (or creates) the Free-tier daily usage row for the current UTC day. */
export async function getOrCreateDailyUsage(
  userId: string,
  now = new Date(),
): Promise<UserUsage> {
  return getOrCreateUsage(userId, USAGE_PERIOD.DAILY, now);
}

/** Returns (or creates) the Pro-tier monthly usage row for the current UTC month. */
export async function getOrCreateMonthlyUsage(
  userId: string,
  now = new Date(),
): Promise<UserUsage> {
  return getOrCreateUsage(userId, USAGE_PERIOD.MONTHLY, now);
}

/**
 * Atomically increments the usage counter by 1 for the active period bucket.
 * Creates the row at count = 1 if it does not exist yet.
 */
export async function incrementUsage(
  userId: string,
  period: UsagePeriod,
  now = new Date(),
): Promise<UserUsage> {
  assertUserId(userId);
  assertUsagePeriod(period);

  const date = periodStartFor(period, now);

  try {
    return await prisma.userUsage.upsert({
      where: {
        userId_date_period: {
          userId,
          date,
          period,
        },
      },
      create: {
        userId,
        date,
        period,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    });
  } catch {
    throw new UsageError(
      `Failed to increment usage for user ${userId} (${period})`,
      "database_error",
    );
  }
}

/**
 * Remaining generations for the user's plan in the current period.
 * Free: 5/day (UTC). Pro: 100/month (UTC).
 */
export async function getRemainingGenerations(
  userId: string,
  plan: Plan,
  now = new Date(),
): Promise<number> {
  assertUserId(userId);

  const policy = getGenerationPolicy(plan);
  const usage =
    policy.period === "day"
      ? await getOrCreateDailyUsage(userId, now)
      : await getOrCreateMonthlyUsage(userId, now);

  return Math.max(0, policy.maxGenerationsPerPeriod - usage.count);
}