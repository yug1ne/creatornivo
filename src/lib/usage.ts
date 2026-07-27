import type { UserUsage } from "@prisma/client";

import { getGenerationPolicy, PLANS, type Plan } from "@/config/plans";
import { prisma } from "@/lib/db";
import {
  getUtcDayStart,
  getUtcMonthStart,
  loadProviderPeriodForUser,
  resolveQuotaPeriod,
  type ProviderPeriodInput,
  type QuotaBasis,
} from "@/lib/usage/quota-period";

/** Usage bucket type — aligns with UserUsage.period column. */
export type UsagePeriod = "daily" | "monthly";

export const USAGE_PERIOD = {
  DAILY: "daily",
  MONTHLY: "monthly",
} as const satisfies Record<string, UsagePeriod>;

export { getUtcDayStart, getUtcMonthStart };

export class UsageError extends Error {
  constructor(
    message: string,
    public readonly code: "invalid_input" | "database_error" = "invalid_input",
  ) {
    super(message);
    this.name = "UsageError";
  }
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

function periodStartFor(
  period: UsagePeriod,
  now = new Date(),
  bucketStart?: Date,
): Date {
  if (bucketStart) {
    return bucketStart;
  }

  return period === USAGE_PERIOD.DAILY
    ? getUtcDayStart(now)
    : getUtcMonthStart(now);
}

async function getOrCreateUsage(
  userId: string,
  period: UsagePeriod,
  now = new Date(),
  bucketStart?: Date,
): Promise<UserUsage> {
  assertUserId(userId);
  const date = periodStartFor(period, now, bucketStart);

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
  bucketStart?: Date,
): Promise<UserUsage> {
  return getOrCreateUsage(userId, USAGE_PERIOD.MONTHLY, now, bucketStart);
}

/**
 * Atomically increments the usage counter by 1 for the active period bucket.
 * Creates the row at count = 1 if it does not exist yet.
 * Optional `bucketStart` pins the UserUsage.date key (provider billing period start).
 */
export async function incrementUsage(
  userId: string,
  period: UsagePeriod,
  now = new Date(),
  options?: { bucketStart?: Date },
): Promise<UserUsage> {
  assertUserId(userId);
  assertUsagePeriod(period);

  const date = periodStartFor(period, now, options?.bucketStart);

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

/** Maps plan billing period to UserUsage.period column value. */
export function getUsagePeriodForPlan(plan: Plan): UsagePeriod {
  return getGenerationPolicy(plan).period === "day"
    ? USAGE_PERIOD.DAILY
    : USAGE_PERIOD.MONTHLY;
}

/** UTC instant when the current usage bucket resets (next day or next month). */
export function getUsageResetAt(period: UsagePeriod, now = new Date()): Date {
  if (period === USAGE_PERIOD.DAILY) {
    return new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
      ),
    );
  }

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
}

export type UserUsageSnapshot = {
  plan: Plan;
  remaining: number;
  limit: number;
  period: UsagePeriod;
  resetAt: string;
  used: number;
  /** Resolved quota window basis for honest UI copy. */
  quotaBasis: QuotaBasis;
};

/**
 * Full usage snapshot for API/UI — backed by UserUsage counters.
 * Free: UTC day. Pro: provider billing period when available, else UTC calendar month.
 *
 * When `providerPeriod` is omitted for Pro, subscription dates are loaded from the DB.
 * Pass `null` to force calendar-month fallback without a DB lookup.
 */
export async function getUserUsageSnapshot(
  userId: string,
  plan: Plan,
  now = new Date(),
  providerPeriod?: ProviderPeriodInput | null,
): Promise<UserUsageSnapshot> {
  assertUserId(userId);

  let periodInput = providerPeriod;
  if (plan === PLANS.PRO && periodInput === undefined) {
    periodInput = await loadProviderPeriodForUser(userId);
  }

  const resolved = resolveQuotaPeriod(plan, now, periodInput);
  const policy = getGenerationPolicy(plan);

  const usage = await getOrCreateUsage(
    userId,
    resolved.usagePeriod,
    now,
    resolved.start,
  );

  const limit = policy.maxGenerationsPerPeriod;
  const used = usage.count;
  const remaining = Math.max(0, limit - used);

  return {
    plan,
    remaining,
    limit,
    period: resolved.usagePeriod,
    resetAt: resolved.resetAt.toISOString(),
    used,
    quotaBasis: resolved.basis,
  };
}

/**
 * Remaining generations for the user's plan in the current period.
 * Free: 5/day (UTC). Pro: 100 per provider period or UTC month fallback.
 */
export async function getRemainingGenerations(
  userId: string,
  plan: Plan,
  now = new Date(),
): Promise<number> {
  const snapshot = await getUserUsageSnapshot(userId, plan, now);
  return snapshot.remaining;
}
