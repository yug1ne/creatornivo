import type {
  SupportMessageSenderType,
  SupportThreadStatus,
} from "@prisma/client";

import {
  ADMIN_SUPPORT_PAGE_SIZE,
  adminSupportSkip,
  adminSupportTotalPages,
  resolveAdminMessageSenderType,
  statusAfterAdminClose,
  statusAfterAdminReopen,
  statusAfterAdminReply,
  type AdminSupportListParams,
  type AdminSupportStatusFilter,
} from "@/lib/support/admin-query";
import {
  emptySupportStatusCounts,
  type SupportStatusCounts,
} from "@/lib/support/counts";
import { SUPPORT_THREAD_LIST_LIMIT } from "@/config/support";
import {
  normalizeSupportBody,
  normalizeSupportSubject,
} from "@/lib/support/validation";

export class SupportAccessError extends Error {
  constructor(
    public readonly code: "not_found" | "closed" | "forbidden" | "invalid_status",
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
  isInternal?: boolean;
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

export type AdminSupportThreadListItem = {
  id: string;
  subject: string;
  status: SupportThreadStatus;
  lastMessageAt: string;
  createdAt: string;
  messageCount: number;
  user: {
    id: string;
    email: string;
    plan: "free" | "pro";
  };
};

export type AdminSupportThreadDetail = {
  id: string;
  subject: string;
  status: SupportThreadStatus;
  lastMessageAt: string;
  createdAt: string;
  closedAt: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
    plan: "free" | "pro";
    role: "user" | "admin";
    createdAt: string;
    signInMethods: string;
  };
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
      isInternal?: boolean;
    }>
  >;
  addUserReply(input: {
    threadId: string;
    userId: string;
    body: string;
    now: Date;
    setStatus: SupportThreadStatus;
  }): Promise<{ id: string }>;

  /** Admin inbox */
  listThreadsForAdmin(input: {
    status?: SupportThreadStatus;
    q: string;
    skip: number;
    take: number;
  }): Promise<{
    total: number;
    rows: Array<{
      id: string;
      subject: string;
      status: SupportThreadStatus;
      lastMessageAt: Date;
      createdAt: Date;
      messageCount: number;
      user: { id: string; email: string; plan: "free" | "pro" };
    }>;
  }>;
  findThreadForAdmin(threadId: string): Promise<{
    id: string;
    userId: string;
    subject: string;
    status: SupportThreadStatus;
    lastMessageAt: Date;
    createdAt: Date;
    closedAt: Date | null;
    user: {
      id: string;
      email: string;
      name: string | null;
      plan: "free" | "pro";
      role: "user" | "admin";
      createdAt: Date;
      password: string | null;
      accounts: { provider: string }[];
    };
  } | null>;
  listAdminMessages(threadId: string): Promise<
    Array<{
      id: string;
      senderType: SupportMessageSenderType;
      authorUserId: string | null;
      body: string;
      createdAt: Date;
      isInternal: boolean;
    }>
  >;
  addAdminReply(input: {
    threadId: string;
    adminUserId: string;
    body: string;
    now: Date;
    setStatus: SupportThreadStatus;
  }): Promise<{ id: string }>;
  setThreadStatus(input: {
    threadId: string;
    status: SupportThreadStatus;
    closedAt: Date | null;
    now: Date;
  }): Promise<void>;

  /** Status counts only — no subjects, emails, or message bodies. */
  countStatusesForUser(userId: string): Promise<SupportStatusCounts>;
  countStatusesForAdmin(): Promise<SupportStatusCounts>;
}

/** Pure: only USER sender is allowed for end-user writes. */
export function resolveUserMessageSenderType(
  attempted?: string | null,
): "USER" {
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

// ——— Admin ———

export async function listAdminSupportThreads(
  params: AdminSupportListParams,
  store: SupportStore,
): Promise<{
  threads: AdminSupportThreadListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  status: AdminSupportStatusFilter;
  q: string;
}> {
  const status =
    params.status === "all"
      ? undefined
      : (params.status as SupportThreadStatus);

  const result = await store.listThreadsForAdmin({
    status,
    q: params.q,
    skip: adminSupportSkip(params.page),
    take: ADMIN_SUPPORT_PAGE_SIZE,
  });

  return {
    threads: result.rows.map((row) => ({
      id: row.id,
      subject: row.subject,
      status: row.status,
      lastMessageAt: row.lastMessageAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      messageCount: row.messageCount,
      user: row.user,
    })),
    total: result.total,
    page: params.page,
    pageSize: ADMIN_SUPPORT_PAGE_SIZE,
    totalPages: adminSupportTotalPages(result.total),
    status: params.status,
    q: params.q,
  };
}

export async function getAdminSupportThreadDetail(
  threadId: string,
  store: SupportStore,
  formatSignIn: (input: {
    hasPassword: boolean;
    oauthProviders: string[];
  }) => string,
): Promise<AdminSupportThreadDetail> {
  const thread = await store.findThreadForAdmin(threadId);
  if (!thread) {
    throw new SupportAccessError("not_found");
  }

  const messages = await store.listAdminMessages(thread.id);

  return {
    id: thread.id,
    subject: thread.subject,
    status: thread.status,
    lastMessageAt: thread.lastMessageAt.toISOString(),
    createdAt: thread.createdAt.toISOString(),
    closedAt: thread.closedAt?.toISOString() ?? null,
    user: {
      id: thread.user.id,
      email: thread.user.email,
      name: thread.user.name,
      plan: thread.user.plan,
      role: thread.user.role,
      createdAt: thread.user.createdAt.toISOString(),
      signInMethods: formatSignIn({
        hasPassword: Boolean(thread.user.password),
        oauthProviders: thread.user.accounts.map((a) => a.provider),
      }),
    },
    messages: messages.map((message) => ({
      id: message.id,
      senderType: message.senderType,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      authorUserId: message.authorUserId,
      isInternal: message.isInternal,
    })),
  };
}

export async function adminReplyToSupportThread(
  input: {
    adminUserId: string;
    threadId: string;
    body: unknown;
    attemptedSenderType?: string | null;
  },
  store: SupportStore,
  now = () => new Date(),
): Promise<{ id: string }> {
  void resolveAdminMessageSenderType(input.attemptedSenderType);

  const body = normalizeSupportBody(input.body);
  const thread = await store.findThreadForAdmin(input.threadId);
  if (!thread) {
    throw new SupportAccessError("not_found");
  }

  const current = now();
  return store.addAdminReply({
    threadId: thread.id,
    adminUserId: input.adminUserId,
    body,
    now: current,
    setStatus: statusAfterAdminReply(thread.status),
  });
}

export async function adminCloseSupportThread(
  threadId: string,
  store: SupportStore,
  now = () => new Date(),
): Promise<void> {
  const thread = await store.findThreadForAdmin(threadId);
  if (!thread) {
    throw new SupportAccessError("not_found");
  }
  if (thread.status === "closed") {
    return;
  }

  const current = now();
  await store.setThreadStatus({
    threadId: thread.id,
    status: statusAfterAdminClose(),
    closedAt: current,
    now: current,
  });
}

export async function adminReopenSupportThread(
  threadId: string,
  store: SupportStore,
  now = () => new Date(),
): Promise<void> {
  const thread = await store.findThreadForAdmin(threadId);
  if (!thread) {
    throw new SupportAccessError("not_found");
  }
  if (thread.status !== "closed") {
    return;
  }

  const current = now();
  await store.setThreadStatus({
    threadId: thread.id,
    status: statusAfterAdminReopen(),
    closedAt: null,
    now: current,
  });
}

/** Counts for the owning user only. Caller must pass session.user.id. */
export async function getUserSupportStatusCounts(
  userId: string,
  store: SupportStore,
): Promise<SupportStatusCounts> {
  if (!userId.trim()) {
    return emptySupportStatusCounts();
  }
  return store.countStatusesForUser(userId);
}

/**
 * Global status counts for admin inbox/nav.
 * Caller must already have verified admin access.
 */
export async function getAdminSupportStatusCounts(
  store: SupportStore,
): Promise<SupportStatusCounts> {
  return store.countStatusesForAdmin();
}
