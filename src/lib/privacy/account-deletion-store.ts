import { prisma } from "@/lib/db";

import type { AccountDeletionAuditStore } from "./account-deletion-audit";

export const prismaAccountDeletionAuditStore: AccountDeletionAuditStore = {
  async createRecord(data) {
    return prisma.accountDeletionRequest.create({
      data: {
        userId: data.userId,
        emailHash: data.emailHash,
        status: data.status,
        blockReason: data.blockReason ?? null,
        failureReason: data.failureReason ?? null,
        ipHash: data.ipHash ?? null,
        completedAt: data.completedAt ?? null,
      },
      select: { id: true },
    });
  },

  async updateRecord(id, data) {
    await prisma.accountDeletionRequest.update({
      where: { id },
      data: {
        status: data.status,
        completedAt: data.completedAt ?? null,
        failureReason: data.failureReason ?? null,
      },
    });
  },
};

export interface AccountDeletionDataStore {
  findDeletionUser(userId: string): Promise<{
    id: string;
    email: string;
    plan: "free" | "pro";
    role: "user" | "admin";
    subscription: {
      provider: string;
      status: string;
      paddleStatus: string | null;
      cancelAtPeriodEnd: boolean;
      currentPeriodEnd: Date | null;
    } | null;
  } | null>;
  findActiveReservations(userId: string): Promise<
    Array<{ status: string; expiresAt: Date }>
  >;
  deleteUserData(userId: string, email: string): Promise<void>;
  findAdjustmentsWithUserId(userId: string): Promise<number>;
}

export const prismaAccountDeletionDataStore: AccountDeletionDataStore = {
  async findDeletionUser(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        plan: true,
        role: true,
        subscription: {
          select: {
            provider: true,
            status: true,
            paddleStatus: true,
            cancelAtPeriodEnd: true,
            currentPeriodEnd: true,
          },
        },
      },
    });
  },

  async findActiveReservations(userId) {
    return prisma.generationReservation.findMany({
      where: { userId },
      select: {
        status: true,
        expiresAt: true,
      },
    });
  },

  async deleteUserData(userId, email) {
    await prisma.$transaction(async (transaction) => {
      await transaction.generationReservation.deleteMany({
        where: { userId },
      });
      await transaction.verificationToken.deleteMany({
        where: { identifier: email },
      });
      await transaction.user.delete({
        where: { id: userId },
      });
    });
  },

  async findAdjustmentsWithUserId(userId) {
    return prisma.paddleAdjustment.count({
      where: { userId },
    });
  },
};