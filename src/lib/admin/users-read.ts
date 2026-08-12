import { formatSignInMethods } from "@/lib/auth/sign-in-methods";
import { getTrialPeriodKey } from "@/config/trial";
import { prisma } from "@/lib/db";
import { getUserUsageSnapshot } from "@/lib/usage";

import {
  buildAdminTrialSummary,
  type AdminTrialSummary,
} from "./trial-visibility";

import {
  ADMIN_USERS_PAGE_SIZE,
  adminUsersSkip,
  adminUsersTotalPages,
  buildAdminUserListWhere,
  type AdminUsersListParams,
} from "./users-query";

const listSelect = {
  id: true,
  email: true,
  name: true,
  plan: true,
  role: true,
  emailVerified: true,
  trialStartedAt: true,
  trialEndsAt: true,
  trialInvite: {
    select: { id: true },
  },
  createdAt: true,
  // Presence only — never returned as hash to UI mappers.
  password: true,
  accounts: {
    select: { provider: true },
    orderBy: { provider: "asc" as const },
  },
  subscription: {
    select: {
      status: true,
      provider: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: true,
    },
  },
  _count: {
    select: {
      savedPrompts: true,
      generations: true,
    },
  },
} as const;

export type AdminUserListItem = {
  id: string;
  email: string;
  name: string | null;
  plan: "free" | "pro";
  role: "user" | "admin";
  emailVerified: boolean;
  signInMethods: string;
  createdAt: string;
  savedDraftsCount: number;
  generationsCount: number;
  subscriptionStatus: string | null;
  subscriptionProvider: string | null;
  trial: AdminTrialSummary;
};

export type AdminUsersListResult = {
  users: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  q: string;
};

function mapListItem(row: {
  id: string;
  email: string;
  name: string | null;
  plan: "free" | "pro";
  role: "user" | "admin";
  emailVerified: Date | null;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  trialInvite: { id: string } | null;
  createdAt: Date;
  password: string | null;
  accounts: { provider: string }[];
  subscription: {
    status: string;
    provider: string;
  } | null;
  _count: { savedPrompts: number; generations: number };
}, trialUsed: number, now: Date): AdminUserListItem {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    plan: row.plan,
    role: row.role,
    emailVerified: row.emailVerified instanceof Date,
    signInMethods: formatSignInMethods({
      hasPassword: Boolean(row.password),
      oauthProviders: row.accounts.map((a) => a.provider),
    }),
    createdAt: row.createdAt.toISOString(),
    savedDraftsCount: row._count.savedPrompts,
    generationsCount: row._count.generations,
    subscriptionStatus: row.subscription?.status ?? null,
    subscriptionProvider: row.subscription?.provider ?? null,
    trial: buildAdminTrialSummary(
      {
        trialStartedAt: row.trialStartedAt,
        trialEndsAt: row.trialEndsAt,
        claimedInviteId: row.trialInvite?.id ?? null,
        used: trialUsed,
      },
      now,
    ),
  };
}

async function getCompletedTrialUsageByUser(
  users: Array<{ id: string; trialStartedAt: Date | null }>,
): Promise<Map<string, number>> {
  const periods = users.flatMap((user) =>
    user.trialStartedAt
      ? [
          {
            userId: user.id,
            periodKey: getTrialPeriodKey(user.trialStartedAt),
          },
        ]
      : [],
  );

  if (periods.length === 0) return new Map();

  const usage = await prisma.generationReservation.groupBy({
    by: ["userId", "periodKey"],
    where: {
      status: "completed",
      OR: periods,
    },
    _count: { _all: true },
  });

  return new Map(usage.map((row) => [row.userId, row._count._all]));
}

/**
 * Paginated admin user list. Caller must already have verified admin access.
 */
export async function listAdminUsers(
  params: AdminUsersListParams,
): Promise<AdminUsersListResult> {
  const where = buildAdminUserListWhere(params.q);
  const skip = adminUsersSkip(params.page);
  const now = new Date();

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: ADMIN_USERS_PAGE_SIZE,
      select: listSelect,
    }),
  ]);
  const trialUsageByUser = await getCompletedTrialUsageByUser(rows);

  return {
    users: rows.map((row) =>
      mapListItem(row, trialUsageByUser.get(row.id) ?? 0, now),
    ),
    total,
    page: params.page,
    pageSize: ADMIN_USERS_PAGE_SIZE,
    totalPages: adminUsersTotalPages(total),
    q: params.q,
  };
}

export type AdminUserDetail = {
  id: string;
  email: string;
  name: string | null;
  plan: "free" | "pro";
  role: "user" | "admin";
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  signInMethods: string;
  hasPassword: boolean;
  oauthProviders: string[];
  savedDraftsCount: number;
  generationsTotalCount: number;
  generationsLast7Days: number;
  usage: {
    period: string;
    used: number;
    limit: number;
    remaining: number;
    resetAt: string;
  };
  trial: AdminTrialSummary;
  subscription: {
    status: string;
    provider: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    paddleCustomerId: string | null;
    paddleSubscriptionId: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  } | null;
};

/**
 * Read-only user dossier. Returns null if not found.
 * Caller must already have verified admin access.
 */
export async function getAdminUserDetail(
  userId: string,
): Promise<AdminUserDetail | null> {
  const id = userId.trim();
  if (!id) return null;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      role: true,
      emailVerified: true,
      trialStartedAt: true,
      trialEndsAt: true,
      trialInvite: {
        select: { id: true },
      },
      createdAt: true,
      updatedAt: true,
      password: true,
      accounts: {
        select: { provider: true },
        orderBy: { provider: "asc" },
      },
      subscription: {
        select: {
          status: true,
          provider: true,
          cancelAtPeriodEnd: true,
          currentPeriodEnd: true,
          paddleCustomerId: true,
          paddleSubscriptionId: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
        },
      },
      _count: {
        select: {
          savedPrompts: true,
          generations: true,
        },
      },
    },
  });

  if (!user) return null;

  const [usage, generationsLast7Days, trialUsed] = await Promise.all([
    getUserUsageSnapshot(user.id, user.plan),
    prisma.generation.count({
      where: {
        userId: user.id,
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    user.trialStartedAt
      ? prisma.generationReservation.count({
          where: {
            userId: user.id,
            periodKey: getTrialPeriodKey(user.trialStartedAt),
            status: "completed",
          },
        })
      : Promise.resolve(0),
  ]);

  const oauthProviders = user.accounts.map((a) => a.provider);
  const hasPassword = Boolean(user.password);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    role: user.role,
    emailVerified: user.emailVerified instanceof Date,
    emailVerifiedAt: user.emailVerified?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    signInMethods: formatSignInMethods({
      hasPassword,
      oauthProviders,
    }),
    hasPassword,
    oauthProviders,
    savedDraftsCount: user._count.savedPrompts,
    generationsTotalCount: user._count.generations,
    generationsLast7Days,
    usage: {
      period: usage.period,
      used: usage.used,
      limit: usage.limit,
      remaining: usage.remaining,
      resetAt: usage.resetAt,
    },
    trial: buildAdminTrialSummary({
      trialStartedAt: user.trialStartedAt,
      trialEndsAt: user.trialEndsAt,
      claimedInviteId: user.trialInvite?.id ?? null,
      used: trialUsed,
    }),
    subscription: user.subscription
      ? {
          status: user.subscription.status,
          provider: user.subscription.provider,
          cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
          currentPeriodEnd:
            user.subscription.currentPeriodEnd?.toISOString() ?? null,
          paddleCustomerId: user.subscription.paddleCustomerId,
          paddleSubscriptionId: user.subscription.paddleSubscriptionId,
          stripeCustomerId: user.subscription.stripeCustomerId,
          stripeSubscriptionId: user.subscription.stripeSubscriptionId,
        }
      : null,
  };
}

export type AdminTrialOverview = {
  active: number;
  pendingVerification: number;
  expired: number;
};

/** Counts only. Caller must already have verified admin access. */
export async function getAdminTrialOverview(
  now = new Date(),
): Promise<AdminTrialOverview> {
  const [active, pendingVerification, expired] = await Promise.all([
    prisma.user.count({
      where: {
        trialStartedAt: { not: null },
        trialEndsAt: { gt: now },
      },
    }),
    prisma.user.count({
      where: {
        trialStartedAt: null,
        trialInvite: { isNot: null },
      },
    }),
    prisma.user.count({
      where: {
        trialStartedAt: { not: null },
        trialEndsAt: { lte: now },
      },
    }),
  ]);

  return { active, pendingVerification, expired };
}
