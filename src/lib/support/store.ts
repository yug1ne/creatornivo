import type { Prisma, SupportThreadStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { SupportStore } from "@/lib/support/service";

export const prismaSupportStore: SupportStore = {
  async listThreadsForUser(userId, limit) {
    return prisma.supportThread.findMany({
      where: { userId },
      orderBy: { lastMessageAt: "desc" },
      take: limit,
      select: {
        id: true,
        subject: true,
        status: true,
        lastMessageAt: true,
        createdAt: true,
        _count: {
          select: {
            messages: { where: { isInternal: false } },
          },
        },
      },
    });
  },

  async createThread({ userId, subject, body, now }) {
    const thread = await prisma.supportThread.create({
      data: {
        userId,
        subject,
        status: "open",
        lastMessageAt: now,
        messages: {
          create: {
            senderType: "USER",
            authorUserId: userId,
            body,
            isInternal: false,
            createdAt: now,
          },
        },
      },
      select: { id: true },
    });
    return thread;
  },

  async findThreadForUser(threadId, userId) {
    return prisma.supportThread.findFirst({
      where: { id: threadId, userId },
      select: {
        id: true,
        userId: true,
        subject: true,
        status: true,
        lastMessageAt: true,
        createdAt: true,
        closedAt: true,
      },
    });
  },

  async listVisibleMessages(threadId) {
    return prisma.supportMessage.findMany({
      where: {
        threadId,
        isInternal: false,
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        senderType: true,
        authorUserId: true,
        body: true,
        createdAt: true,
        isInternal: true,
      },
    });
  },

  async addUserReply({ threadId, userId, body, now, setStatus }) {
    const [message] = await prisma.$transaction([
      prisma.supportMessage.create({
        data: {
          threadId,
          senderType: "USER",
          authorUserId: userId,
          body,
          isInternal: false,
          createdAt: now,
        },
        select: { id: true },
      }),
      prisma.supportThread.update({
        where: { id: threadId },
        data: {
          status: setStatus,
          lastMessageAt: now,
          closedAt: null,
        },
      }),
    ]);

    return message;
  },

  async listThreadsForAdmin({ status, q, skip, take }) {
    const where: Prisma.SupportThreadWhereInput = {};
    if (status) {
      where.status = status;
    }
    if (q) {
      where.OR = [
        { subject: { contains: q, mode: "insensitive" } },
        { user: { email: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.supportThread.count({ where }),
      prisma.supportThread.findMany({
        where,
        orderBy: { lastMessageAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          subject: true,
          status: true,
          lastMessageAt: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              plan: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      rows: rows.map((row) => ({
        id: row.id,
        subject: row.subject,
        status: row.status,
        lastMessageAt: row.lastMessageAt,
        createdAt: row.createdAt,
        messageCount: row._count.messages,
        user: row.user,
      })),
    };
  },

  async findThreadForAdmin(threadId) {
    return prisma.supportThread.findUnique({
      where: { id: threadId },
      select: {
        id: true,
        userId: true,
        subject: true,
        status: true,
        lastMessageAt: true,
        createdAt: true,
        closedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            plan: true,
            role: true,
            createdAt: true,
            password: true,
            accounts: {
              select: { provider: true },
              orderBy: { provider: "asc" },
            },
          },
        },
      },
    });
  },

  async listAdminMessages(threadId) {
    return prisma.supportMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        senderType: true,
        authorUserId: true,
        body: true,
        createdAt: true,
        isInternal: true,
      },
    });
  },

  async addAdminReply({ threadId, adminUserId, body, now, setStatus }) {
    const [message] = await prisma.$transaction([
      prisma.supportMessage.create({
        data: {
          threadId,
          senderType: "ADMIN",
          authorUserId: adminUserId,
          body,
          isInternal: false,
          createdAt: now,
        },
        select: { id: true },
      }),
      prisma.supportThread.update({
        where: { id: threadId },
        data: {
          status: setStatus,
          lastMessageAt: now,
          closedAt: null,
        },
      }),
    ]);

    return message;
  },

  async setThreadStatus({ threadId, status, closedAt, now }) {
    await prisma.supportThread.update({
      where: { id: threadId },
      data: {
        status: status as SupportThreadStatus,
        closedAt,
        updatedAt: now,
      },
    });
  },
};
