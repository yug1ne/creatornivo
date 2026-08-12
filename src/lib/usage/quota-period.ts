import { PLANS, type GenerationPeriod, type Plan } from "@/config/plans";
import { prisma } from "@/lib/db";

/** How the active quota window was resolved. */
export type QuotaBasis =
  | "utc_day"
  | "provider_billing"
  | "utc_calendar_month"
  | "trial";

/** Aligns with UserUsage.period column values. */
export type QuotaUsagePeriod = "daily" | "monthly";

/** Provider billing period fields (Freemius, or any subscription with dates). */
export type ProviderPeriodInput = {
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
};

export type ResolvedQuotaPeriod = {
  /** Inclusive start of the counting window. */
  start: Date;
  /** Exclusive end of the counting window. */
  end: Date;
  /** When the quota window resets for UI/API. */
  resetAt: Date;
  basis: QuotaBasis;
  usagePeriod: QuotaUsagePeriod;
  /** Aligns with GenerationPeriod on plan policy (day | month). */
  generationPeriod: GenerationPeriod;
  /** Stable key stored on generation reservations. */
  periodKey: string;
};

/** UTC midnight for the given instant (Free daily window). */
export function getUtcDayStart(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/** UTC first day of month at midnight (Pro calendar-month fallback). */
export function getUtcMonthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function isValidDate(value: Date | null | undefined): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/**
 * True when both ends are valid and `now` falls inside [start, end).
 * Pro without a usable window falls back to UTC calendar month.
 */
export function isUsableProviderBillingPeriod(
  providerPeriod: ProviderPeriodInput | null | undefined,
  now = new Date(),
): boolean {
  if (!providerPeriod) {
    return false;
  }

  const start = providerPeriod.currentPeriodStart;
  const end = providerPeriod.currentPeriodEnd;
  if (!isValidDate(start) || !isValidDate(end)) {
    return false;
  }

  if (start.getTime() >= end.getTime()) {
    return false;
  }

  const t = now.getTime();
  return t >= start.getTime() && t < end.getTime();
}

/**
 * Resolve the quota window for Free (UTC day) or Pro
 * (provider billing period when present, else UTC calendar month).
 */
export function resolveQuotaPeriod(
  plan: Plan,
  now = new Date(),
  providerPeriod?: ProviderPeriodInput | null,
): ResolvedQuotaPeriod {
  if (plan === PLANS.FREE) {
    const start = getUtcDayStart(now);
    const end = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
      ),
    );

    return {
      start,
      end,
      resetAt: end,
      basis: "utc_day",
      usagePeriod: "daily",
      generationPeriod: "day",
      periodKey: start.toISOString().slice(0, 10),
    };
  }

  if (isUsableProviderBillingPeriod(providerPeriod, now)) {
    const start = providerPeriod!.currentPeriodStart as Date;
    const end = providerPeriod!.currentPeriodEnd as Date;

    return {
      start,
      end,
      resetAt: end,
      basis: "provider_billing",
      usagePeriod: "monthly",
      generationPeriod: "month",
      periodKey: `billing:${start.toISOString()}`,
    };
  }

  const start = getUtcMonthStart(now);
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );

  return {
    start,
    end,
    resetAt: end,
    basis: "utc_calendar_month",
    usagePeriod: "monthly",
    generationPeriod: "month",
    periodKey: start.toISOString().slice(0, 7),
  };
}

/**
 * Load subscription period dates for quota resolution.
 * Generic fields only — works for Freemius and any provider that stores them.
 */
export async function loadProviderPeriodForUser(
  userId: string,
): Promise<ProviderPeriodInput | null> {
  if (!userId.trim()) {
    return null;
  }

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: {
        currentPeriodStart: true,
        currentPeriodEnd: true,
      },
    });

    if (!subscription) {
      return null;
    }

    return {
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  } catch {
    return null;
  }
}
