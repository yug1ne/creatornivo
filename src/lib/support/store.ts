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
            // User never sees internal messages; count only public ones.
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
          // User replies never close a thread.
          closedAt: null,
        },
      }),
    ]);

    return message;
  },
};
