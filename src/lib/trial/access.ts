import type { Plan } from "@/config/plans";
import { PLANS } from "@/config/plans";
import { isAdminSession } from "@/lib/admin/is-admin-session";
import { prisma } from "@/lib/db";
import { getTrialGenerationUsage } from "@/lib/generation/usage-service";
import { getUserUsageSnapshot, type UserUsageSnapshot } from "@/lib/usage";
import type { ProviderPeriodInput } from "@/lib/usage/quota-period";
import type { SessionUser } from "@/types";

export type AccessMode = "paid_pro" | "trial" | "free";

export type TrialAccessUser = {
  plan: Plan;
  emailVerified: Date | null;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
};

export type UserAccessContext = {
  billingPlan: Plan;
  mode: AccessMode;
  canUseProTemplates: boolean;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
};

export type EffectiveUsageSnapshot = Omit<
  UserUsageSnapshot,
  "period" | "quotaBasis"
> & {
  accessMode: AccessMode;
  period: UserUsageSnapshot["period"] | "trial";
  quotaBasis: UserUsageSnapshot["quotaBasis"] | "trial";
  trialEndsAt: string | null;
};

export function isActiveTrial(
  user: Pick<
    TrialAccessUser,
    "emailVerified" | "trialStartedAt" | "trialEndsAt"
  >,
  now = new Date(),
): boolean {
  if (!user.emailVerified || !user.trialStartedAt || !user.trialEndsAt) {
    return false;
  }

  const start = user.trialStartedAt.getTime();
  const end = user.trialEndsAt.getTime();
  const current = now.getTime();

  return (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start < end &&
    current >= start &&
    current < end
  );
}

export function resolveUserAccess(
  user: TrialAccessUser,
  options: { isAdmin?: boolean; now?: Date } = {},
): UserAccessContext {
  const now = options.now ?? new Date();
  const trialActive = user.plan !== PLANS.PRO && isActiveTrial(user, now);
  const mode: AccessMode =
    user.plan === PLANS.PRO ? "paid_pro" : trialActive ? "trial" : "free";

  return {
    billingPlan: user.plan,
    mode,
    canUseProTemplates:
      user.plan === PLANS.PRO || trialActive || options.isAdmin === true,
    trialStartedAt: user.trialStartedAt,
    trialEndsAt: user.trialEndsAt,
  };
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

  return resolveUserAccess(user, {
    isAdmin: isAdminSession(session),
    now,
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
