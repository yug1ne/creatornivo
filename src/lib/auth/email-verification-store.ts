import { prisma } from "@/lib/db";

import { normalizeEmail } from "./credentials";
import type { EmailVerificationStore } from "./email-verification";

export const prismaEmailVerificationStore: EmailVerificationStore = {
  async findUserById(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
      },
    });
  },

  async findUserByEmail(email) {
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
        name: true,
        emailVerified: true,
      },
    });
  },

  async deleteTokensForIdentifier(identifier) {
    await prisma.verificationToken.deleteMany({
      where: { identifier },
    });
  },

  async createToken(data) {
    return prisma.verificationToken.create({
      data: {
        identifier: data.identifier,
        token: data.token,
        expires: data.expires,
      },
    });
  },

  async findValidToken(tokenHash, now) {
    return prisma.verificationToken.findFirst({
      where: {
        token: tokenHash,
        expires: { gt: now },
      },
    });
  },

  async deleteToken(identifier, token) {
    await prisma.verificationToken.deleteMany({
      where: { identifier, token },
    });
  },

  async markEmailVerified(userId, verifiedAt) {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: verifiedAt },
    });
  },
};
