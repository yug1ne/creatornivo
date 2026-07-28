import type { UserUsage } from "@prisma/client";
import { Prisma } from "@prisma/client";

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

export type UsageErrorCode =
  | "invalid_input"
  | "database_error"
  /** Session user id exists in JWT but User row is gone (deleted account). */
  | "stale_session";

export { getUtcDayStart, getUtcMonthStart };

export class UsageError extends Error {
  constructor(
    message: string,
    public readonly code: UsageErrorCode = "invalid_input",
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

/** Prisma foreign-key failure (e.g. UserUsage_userId_fkey when User is gone). */
export function isPrismaForeignKeyError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  );
}

export type FindUserById = (
  userId: string,
) => Promise<{ id: string } | null>;

const defaultFindUserById: FindUserById = async (userId) =>
  prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

/**
 * Ensure the User row still exists before any UserUsage write.
 * Throws UsageError `stale_session` when the session points at a deleted user.
 */
export async function ensureUserExistsForUsage(
  userId: string,
  findUser: FindUserById = defaultFindUserById,
): Promise<void> {
  assertUserId(userId);

  let user: { id: string } | null;
  try {
    user = await findUser(userId);
  } catch {
    throw new UsageError(
      `Failed to verify user ${userId} before usage access`,
      "database_error",
    );
  }

  if (!user) {
    throw new UsageError(
      "Session is no longer valid because the user account does not exist.",
      "stale_session",
    );
  }
}

function mapUsageWriteError(
  error: unknown,
  userId: string,
  period: UsagePeriod,
  action: "load" | "increment",
): never {
  if (isPrismaForeignKeyError(error)) {
    throw new UsageError(
      "Session is no longer valid because the user account does not exist.",
      "stale_session",
    );
  }

  throw new UsageError(
    `Failed to ${action} usage for user ${userId} (${period})`,
    "database_error",
  );
}

async function getOrCreateUsage(
  userId: string,
  period: UsagePeriod,
  now = new Date(),
  bucketStart?: Date,
): Promise<UserUsage> {
  assertUserId(userId);
  await ensureUserExistsForUsage(userId);
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
  } catch (error) {
    mapUsageWriteError(error, userId, period, "load");
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
  await ensureUserExistsForUsage(userId);

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
  } catch (error) {
    mapUsageWriteError(error, userId, period, "increment");
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
 * Pure snapshot builder from a usage count (no DB).
 * Used by getUserUsageSnapshot and unit tests for Free/Pro remaining math.
 */
export function buildUserUsageSnapshotFromCount(
  plan: Plan,
  used: number,
  now = new Date(),
  providerPeriod?: ProviderPeriodInput | null,
): UserUsageSnapshot {
  const resolved = resolveQuotaPeriod(plan, now, providerPeriod);
  const policy = getGenerationPolicy(plan);
  const limit = policy.maxGenerationsPerPeriod;
  const safeUsed = Math.max(0, used);
  const remaining = Math.max(0, limit - safeUsed);

  return {
    plan,
    remaining,
    limit,
    period: resolved.usagePeriod,
    resetAt: resolved.resetAt.toISOString(),
    used: safeUsed,
    quotaBasis: resolved.basis,
  };
}

/**
 * Full usage snapshot for API/UI — backed by UserUsage counters.
 * Free: UTC day. Pro: provider billing period when available, else UTC calendar month.
 *
 * When `providerPeriod` is omitted for Pro, subscription dates are loaded from the DB.
 * Pass `null` to force calendar-month fallback without a DB lookup.
 *
 * Throws UsageError `stale_session` when the User row no longer exists.
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

  const usage = await getOrCreateUsage(
    userId,
    resolved.usagePeriod,
    now,
    resolved.start,
  );

  return buildUserUsageSnapshotFromCount(
    plan,
    usage.count,
    now,
    periodInput ?? null,
  );
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
