import { prisma } from "@/lib/db";

import { normalizeEmail } from "./credentials";

export const prismaPasswordResetStore = {
  async findUserByEmail(email: string) {
    return prisma.user.findFirst({
      where: {
        email: {
          equals: normalizeEmail(email),
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        email: true,
        password: true,
      },
    });
  },

  async invalidateActiveTokens(userId: string, usedAt: Date) {
    await prisma.passwordResetToken.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: { usedAt },
    });
  },

  async createToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return prisma.passwordResetToken.create({
      data,
    });
  },

  async findValidToken(tokenHash: string, now: Date) {
    return prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: now },
      },
    });
  },

  async markTokenUsed(tokenId: string, usedAt: Date) {
    await prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: { usedAt },
    });
  },

  async updateUserPassword(
    userId: string,
    passwordHash: string,
    passwordChangedAt: Date,
  ) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: passwordHash,
        passwordChangedAt,
      },
    });
  },
};