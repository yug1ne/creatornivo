import type { Plan } from "@/config/plans";
import { isAdminSession } from "@/lib/admin/is-admin-session";
import {
  isAppSumoAccessMode,
  resolveUserCapabilities,
  type AccessMode,
  type UserCapabilities,
} from "@/lib/access/capabilities";
import { countActiveAppSumoRedemptions } from "@/lib/appsumo/entitlement";
import { prisma } from "@/lib/db";
import {
  getTrialGenerationUsage,
  prismaGenerationReservationStore,
} from "@/lib/generation/usage-service";
import { getUserUsageSnapshot, type UserUsageSnapshot } from "@/lib/usage";
import type { ProviderPeriodInput } from "@/lib/usage/quota-period";
import type { SessionUser } from "@/types";

export type { AccessMode, UserCapabilities };
export { isActiveTrial, isAppSumoAccessMode } from "@/lib/access/capabilities";

export type TrialAccessUser = {
  plan: Plan;
  emailVerified: Date | null;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
};

export type UserAccessContext = UserCapabilities;

export type EffectiveUsageSnapshot = Omit<
  UserUsageSnapshot,
  "period" | "quotaBasis"
> & {
  accessMode: AccessMode;
  period: UserUsageSnapshot["period"] | "trial";
  quotaBasis: UserUsageSnapshot["quotaBasis"];
  trialEndsAt: string | null;
};

/**
 * Central capability resolver. billingPlan is always User.plan.
 * AppSumo codes are optional so unit tests stay synchronous.
 */
export function resolveUserAccess(
  user: TrialAccessUser,
  options: {
    isAdmin?: boolean;
    now?: Date;
    activeAppSumoCodeCount?: number;
    providerPeriod?: ProviderPeriodInput | null;
    env?: NodeJS.ProcessEnv;
  } = {},
): UserAccessContext {
  return resolveUserCapabilities(user, options);
}

export async function getUserAccessContext(
  session: SessionUser,
  now = new Date(),
): Promise<UserAccessContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      plan: true,
      emailVerified: true,
      trialStartedAt: true,
      trialEndsAt: true,
    },
  });

  if (!user) return null;

  const activeAppSumoCodeCount = await countActiveAppSumoRedemptions(
    session.id,
  );

  return resolveUserAccess(user, {
    isAdmin: isAdminSession(session),
    now,
    activeAppSumoCodeCount,
  });
}

export async function getEffectiveUsageSnapshot(
  userId: string,
  access: UserAccessContext,
  now = new Date(),
  providerPeriod?: ProviderPeriodInput | null,
): Promise<EffectiveUsageSnapshot> {
  if (
    access.mode === "trial" &&
    access.trialStartedAt &&
    access.trialEndsAt
  ) {
    const trialUsage = await getTrialGenerationUsage(
      userId,
      access.trialStartedAt,
      access.trialEndsAt,
    );

    return {
      plan: access.billingPlan,
      accessMode: "trial",
      used: trialUsage.used,
      remaining: Math.max(0, trialUsage.limit - trialUsage.used),
      limit: trialUsage.limit,
      period: "trial",
      resetAt: trialUsage.resetAt,
      quotaBasis: "trial",
      trialEndsAt: access.trialEndsAt.toISOString(),
    };
  }

  if (isAppSumoAccessMode(access.mode)) {
    const used = await prismaGenerationReservationStore.countUsed(
      userId,
      access.quota.startsAt,
      access.quota.endsAt,
      access.quota.periodKey,
    );

    return {
      plan: access.billingPlan,
      accessMode: access.mode,
      used,
      remaining: Math.max(0, access.quota.limit - used),
      limit: access.quota.limit,
      period: "monthly",
      resetAt: access.quota.endsAt.toISOString(),
      quotaBasis: "appsumo_month",
      trialEndsAt: null,
    };
  }

  const snapshot = await getUserUsageSnapshot(
    userId,
    access.billingPlan,
    now,
    providerPeriod,
  );

  return {
    ...snapshot,
    accessMode: access.mode,
    trialEndsAt: null,
  };
}
