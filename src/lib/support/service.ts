import type {
  SupportMessageSenderType,
  SupportThreadStatus,
} from "@prisma/client";

import { SUPPORT_THREAD_LIST_LIMIT } from "@/config/support";
import {
  normalizeSupportBody,
  normalizeSupportSubject,
} from "@/lib/support/validation";

export class SupportAccessError extends Error {
  constructor(
    public readonly code: "not_found" | "closed" | "forbidden",
  ) {
    super(code);
    this.name = "SupportAccessError";
  }
}

export type SupportThreadListItem = {
  id: string;
  subject: string;
  status: SupportThreadStatus;
  lastMessageAt: string;
  createdAt: string;
  messageCount: number;
};

export type SupportMessageView = {
  id: string;
  senderType: SupportMessageSenderType;
  body: string;
  createdAt: string;
  /** Present only for non-internal, non-system messages when known. */
  authorUserId: string | null;
};

export type SupportThreadDetail = {
  id: string;
  subject: string;
  status: SupportThreadStatus;
  lastMessageAt: string;
  createdAt: string;
  closedAt: string | null;
  canReply: boolean;
  messages: SupportMessageView[];
};

export interface SupportStore {
  listThreadsForUser(userId: string, limit: number): Promise<
    Array<{
      id: string;
      subject: string;
      status: SupportThreadStatus;
      lastMessageAt: Date;
      createdAt: Date;
      _count: { messages: number };
    }>
  >;
  createThread(input: {
    userId: string;
    subject: string;
    body: string;
    now: Date;
  }): Promise<{ id: string }>;
  findThreadForUser(
    threadId: string,
    userId: string,
  ): Promise<{
    id: string;
    userId: string;
    subject: string;
    status: SupportThreadStatus;
    lastMessageAt: Date;
    createdAt: Date;
    closedAt: Date | null;
  } | null>;
  listVisibleMessages(threadId: string): Promise<
    Array<{
      id: string;
      senderType: SupportMessageSenderType;
      authorUserId: string | null;
      body: string;
      createdAt: Date;
    }>
  >;
  addUserReply(input: {
    threadId: string;
    userId: string;
    body: string;
    now: Date;
    /** When status is answered, reopen to open so admin sees new activity. */
    setStatus: SupportThreadStatus;
  }): Promise<{ id: string }>;
}

/** Pure: only USER sender is allowed for end-user writes. */
export function resolveUserMessageSenderType(
  attempted?: string | null,
): "USER" {
  // Ignore client-supplied senderType entirely.
  void attempted;
  return "USER";
}

export function canUserReplyToStatus(status: SupportThreadStatus): boolean {
  return status === "open" || status === "answered";
}

/** After a user reply, thread should be open (waiting on support). */
export function statusAfterUserReply(
  current: SupportThreadStatus,
): SupportThreadStatus {
  if (current === "closed") {
    return "closed";
  }
  return "open";
}

export async function listUserSupportThreads(
  userId: string,
  store: SupportStore,
): Promise<SupportThreadListItem[]> {
  const rows = await store.listThreadsForUser(userId, SUPPORT_THREAD_LIST_LIMIT);
  return rows.map((row) => ({
    id: row.id,
    subject: row.subject,
    status: row.status,
    lastMessageAt: row.lastMessageAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    messageCount: row._count.messages,
  }));
}

export async function createUserSupportThread(
  input: {
    userId: string;
    subject: unknown;
    body: unknown;
  },
  store: SupportStore,
  now = () => new Date(),
): Promise<{ id: string }> {
  const subject = normalizeSupportSubject(input.subject);
  const body = normalizeSupportBody(input.body);
  const current = now();

  return store.createThread({
    userId: input.userId,
    subject,
    body,
    now: current,
  });
}

export async function getUserSupportThreadDetail(
  input: { userId: string; threadId: string },
  store: SupportStore,
): Promise<SupportThreadDetail> {
  const thread = await store.findThreadForUser(input.threadId, input.userId);
  if (!thread) {
    throw new SupportAccessError("not_found");
  }

  const messages = await store.listVisibleMessages(thread.id);

  return {
    id: thread.id,
    subject: thread.subject,
    status: thread.status,
    lastMessageAt: thread.lastMessageAt.toISOString(),
    createdAt: thread.createdAt.toISOString(),
    closedAt: thread.closedAt?.toISOString() ?? null,
    canReply: canUserReplyToStatus(thread.status),
    messages: messages.map((message) => ({
      id: message.id,
      senderType: message.senderType,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      authorUserId: message.authorUserId,
    })),
  };
}

export async function replyToUserSupportThread(
  input: {
    userId: string;
    threadId: string;
    body: unknown;
    /** Rejected if present and not USER — callers should not forward it. */
    attemptedSenderType?: string | null;
  },
  store: SupportStore,
  now = () => new Date(),
): Promise<{ id: string }> {
  void resolveUserMessageSenderType(input.attemptedSenderType);

  const body = normalizeSupportBody(input.body);
  const thread = await store.findThreadForUser(input.threadId, input.userId);
  if (!thread) {
    throw new SupportAccessError("not_found");
  }

  if (!canUserReplyToStatus(thread.status)) {
    throw new SupportAccessError("closed");
  }

  const current = now();
  return store.addUserReply({
    threadId: thread.id,
    userId: input.userId,
    body,
    now: current,
    setStatus: statusAfterUserReply(thread.status),
  });
}
