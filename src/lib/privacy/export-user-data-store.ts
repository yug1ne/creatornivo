import { prisma } from "@/lib/db";
import { getGenerationUsage } from "@/lib/generation/usage-service";

import type {
  DataExportAdjustment,
  DataExportCheckoutIntent,
  DataExportSubscription,
  UserDataExportStore,
} from "./export-user-data";

function mapSubscription(
  subscription: {
    provider: string;
    status: string;
    paddleCustomerId: string | null;
    paddleSubscriptionId: string | null;
    paddlePriceId: string | null;
    paddleStatus: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    earlyAccessClaimedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null,
): DataExportSubscription | null {
  if (!subscription) return null;

  return {
    provider: subscription.provider,
    status: subscription.status,
    paddleCustomerId: subscription.paddleCustomerId,
    paddleSubscriptionId: subscription.paddleSubscriptionId,
    paddlePriceId: subscription.paddlePriceId,
    paddleStatus: subscription.paddleStatus,
    stripeCustomerId: subscription.stripeCustomerId,
    stripeSubscriptionId: subscription.stripeSubscriptionId,
    stripePriceId: subscription.stripePriceId,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    earlyAccessClaimedAt:
      subscription.earlyAccessClaimedAt?.toISOString() ?? null,
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString(),
  };
}

function mapCheckoutIntent(intent: {
  id: string;
  priceId: string;
  status: string;
  paddleTransactionId: string | null;
  paddleSubscriptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  completedAt: Date | null;
}): DataExportCheckoutIntent {
  return {
    id: intent.id,
    priceId: intent.priceId,
    status: intent.status,
    paddleTransactionId: intent.paddleTransactionId,
    paddleSubscriptionId: intent.paddleSubscriptionId,
    createdAt: intent.createdAt.toISOString(),
    updatedAt: intent.updatedAt.toISOString(),
    expiresAt: intent.expiresAt.toISOString(),
    completedAt: intent.completedAt?.toISOString() ?? null,
  };
}

function mapAdjustment(adjustment: {
  paddleAdjustmentId: string;
  paddleTransactionId: string;
  paddleSubscriptionId: string | null;
  action: string;
  type: string | null;
  status: string;
  currencyCode: string | null;
  total: string | null;
  occurredAt: Date;
}): DataExportAdjustment {
  return {
    paddleAdjustmentId: adjustment.paddleAdjustmentId,
    paddleTransactionId: adjustment.paddleTransactionId,
    paddleSubscriptionId: adjustment.paddleSubscriptionId,
    action: adjustment.action,
    type: adjustment.type,
    status: adjustment.status,
    currencyCode: adjustment.currencyCode,
    total: adjustment.total,
    occurredAt: adjustment.occurredAt.toISOString(),
  };
}

const templateSelect = {
  select: {
    id: true,
    slug: true,
    title: true,
  },
} as const;

export const prismaUserDataExportStore: UserDataExportStore = {
  async findUserById(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        plan: true,
        role: true,
        emailVerified: true,
        onboardingCompletedAt: true,
        passwordChangedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async findAccountsByUserId(userId) {
    return prisma.account.findMany({
      where: { userId },
      select: {
        provider: true,
        type: true,
        providerAccountId: true,
      },
      orderBy: { provider: "asc" },
    });
  },

  async findSubscriptionByUserId(userId) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: {
        provider: true,
        status: true,
        paddleCustomerId: true,
        paddleSubscriptionId: true,
        paddlePriceId: true,
        paddleStatus: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripePriceId: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        earlyAccessClaimedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return mapSubscription(subscription);
  },

  async findCheckoutIntentsByUserId(userId) {
    const intents = await prisma.paddleCheckoutIntent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: {
        id: true,
        priceId: true,
        status: true,
        paddleTransactionId: true,
        paddleSubscriptionId: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        completedAt: true,
      },
    });

    return intents.map(mapCheckoutIntent);
  },

  async countCheckoutIntentsByUserId(userId) {
    return prisma.paddleCheckoutIntent.count({ where: { userId } });
  },

  async findAdjustmentsByUserId(userId) {
    const adjustments = await prisma.paddleAdjustment.findMany({
      where: { userId },
      orderBy: { occurredAt: "desc" },
      take: 5000,
      select: {
        paddleAdjustmentId: true,
        paddleTransactionId: true,
        paddleSubscriptionId: true,
        action: true,
        type: true,
        status: true,
        currencyCode: true,
        total: true,
        occurredAt: true,
      },
    });

    return adjustments.map(mapAdjustment);
  },

  async countAdjustmentsByUserId(userId) {
    return prisma.paddleAdjustment.count({ where: { userId } });
  },

  async findSavedPromptsByUserId(userId) {
    return prisma.savedPrompt.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5000,
      select: {
        id: true,
        title: true,
        content: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        template: templateSelect,
      },
    });
  },

  async countSavedPromptsByUserId(userId) {
    return prisma.savedPrompt.count({ where: { userId } });
  },

  async findGenerationsByUserId(userId) {
    return prisma.generation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: {
        id: true,
        prompt: true,
        result: true,
        model: true,
        tokensUsed: true,
        createdAt: true,
        template: templateSelect,
      },
    });
  },

  async countGenerationsByUserId(userId) {
    return prisma.generation.count({ where: { userId } });
  },

  async findReservationsByUserId(userId) {
    return prisma.generationReservation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: {
        requestId: true,
        plan: true,
        periodKey: true,
        status: true,
        model: true,
        estimatedMaxOutputTokens: true,
        actualInputTokens: true,
        actualOutputTokens: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        expiresAt: true,
      },
    });
  },

  async countReservationsByUserId(userId) {
    return prisma.generationReservation.count({ where: { userId } });
  },

  async getGenerationUsage(userId, plan) {
    return getGenerationUsage(userId, plan);
  },
};

export async function getUserPasswordPresent(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  return Boolean(user?.password);
}