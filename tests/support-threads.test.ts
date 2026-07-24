import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  SUPPORT_BODY_MAX_LENGTH,
  SUPPORT_SUBJECT_MAX_LENGTH,
} from "../src/config/support";
import {
  canUserReplyToStatus,
  createUserSupportThread,
  getUserSupportThreadDetail,
  listUserSupportThreads,
  replyToUserSupportThread,
  resolveUserMessageSenderType,
  statusAfterUserReply,
  SupportAccessError,
  type SupportStore,
} from "../src/lib/support/service";
import {
  normalizeSupportBody,
  normalizeSupportSubject,
  SupportValidationError,
} from "../src/lib/support/validation";

type ThreadRow = {
  id: string;
  userId: string;
  subject: string;
  status: "open" | "answered" | "closed";
  lastMessageAt: Date;
  createdAt: Date;
  closedAt: Date | null;
};

type MessageRow = {
  id: string;
  threadId: string;
  senderType: "USER" | "ADMIN" | "SYSTEM";
  authorUserId: string | null;
  body: string;
  isInternal: boolean;
  createdAt: Date;
};

class MemorySupportStore implements SupportStore {
  threads = new Map<string, ThreadRow>();
  messages: MessageRow[] = [];
  private seq = 0;

  private nextId(prefix: string) {
    this.seq += 1;
    return `${prefix}-${this.seq}`;
  }

  async listThreadsForUser(userId: string, limit: number) {
    return Array.from(this.threads.values())
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
      .slice(0, limit)
      .map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        lastMessageAt: t.lastMessageAt,
        createdAt: t.createdAt,
        _count: {
          messages: this.messages.filter(
            (m) => m.threadId === t.id && !m.isInternal,
          ).length,
        },
      }));
  }

  async createThread(input: {
    userId: string;
    subject: string;
    body: string;
    now: Date;
  }) {
    const id = this.nextId("thread");
    this.threads.set(id, {
      id,
      userId: input.userId,
      subject: input.subject,
      status: "open",
      lastMessageAt: input.now,
      createdAt: input.now,
      closedAt: null,
    });
    this.messages.push({
      id: this.nextId("msg"),
      threadId: id,
      senderType: "USER",
      authorUserId: input.userId,
      body: input.body,
      isInternal: false,
      createdAt: input.now,
    });
    return { id };
  }

  async findThreadForUser(threadId: string, userId: string) {
    const thread = this.threads.get(threadId);
    if (!thread || thread.userId !== userId) return null;
    return { ...thread };
  }

  async listVisibleMessages(threadId: string) {
    return this.messages
      .filter((m) => m.threadId === threadId && !m.isInternal)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((m) => ({
        id: m.id,
        senderType: m.senderType,
        authorUserId: m.authorUserId,
        body: m.body,
        createdAt: m.createdAt,
      }));
  }

  async addUserReply(input: {
    threadId: string;
    userId: string;
    body: string;
    now: Date;
    setStatus: "open" | "answered" | "closed";
  }) {
    const id = this.nextId("msg");
    this.messages.push({
      id,
      threadId: input.threadId,
      senderType: "USER",
      authorUserId: input.userId,
      body: input.body,
      isInternal: false,
      createdAt: input.now,
    });
    const thread = this.threads.get(input.threadId);
    if (thread) {
      thread.status = input.setStatus;
      thread.lastMessageAt = input.now;
      thread.closedAt = null;
    }
    return { id };
  }
}

test("validation enforces subject and body limits", () => {
  assert.throws(
    () => normalizeSupportSubject(""),
    (error: unknown) => error instanceof SupportValidationError,
  );
  assert.throws(
    () => normalizeSupportSubject("a".repeat(SUPPORT_SUBJECT_MAX_LENGTH + 1)),
    (error: unknown) =>
      error instanceof SupportValidationError &&
      error.code === "subject_too_long",
  );
  assert.equal(normalizeSupportSubject("  Hello world  "), "Hello world");

  assert.throws(
    () => normalizeSupportBody("short"),
    (error: unknown) =>
      error instanceof SupportValidationError && error.code === "body_too_short",
  );
  assert.throws(
    () => normalizeSupportBody("x".repeat(SUPPORT_BODY_MAX_LENGTH + 1)),
    (error: unknown) =>
      error instanceof SupportValidationError && error.code === "body_too_long",
  );
});

test("user senderType is always USER regardless of attempted value", () => {
  assert.equal(resolveUserMessageSenderType("ADMIN"), "USER");
  assert.equal(resolveUserMessageSenderType("SYSTEM"), "USER");
  assert.equal(resolveUserMessageSenderType(null), "USER");
});

test("closed threads reject user replies; open and answered allow", () => {
  assert.equal(canUserReplyToStatus("open"), true);
  assert.equal(canUserReplyToStatus("answered"), true);
  assert.equal(canUserReplyToStatus("closed"), false);
  assert.equal(statusAfterUserReply("answered"), "open");
  assert.equal(statusAfterUserReply("open"), "open");
});

test("user can create, list, view own thread and reply when open", async () => {
  const store = new MemorySupportStore();
  const created = await createUserSupportThread(
    {
      userId: "user-a",
      subject: "Billing question",
      body: "I need help understanding Early Access pricing options.",
    },
    store,
    () => new Date("2026-07-18T12:00:00.000Z"),
  );

  const list = await listUserSupportThreads("user-a", store);
  assert.equal(list.length, 1);
  assert.equal(list[0]?.id, created.id);
  assert.equal(list[0]?.status, "open");

  const detail = await getUserSupportThreadDetail(
    { userId: "user-a", threadId: created.id },
    store,
  );
  assert.equal(detail.messages.length, 1);
  assert.equal(detail.messages[0]?.senderType, "USER");
  assert.equal(detail.canReply, true);

  await replyToUserSupportThread(
    {
      userId: "user-a",
      threadId: created.id,
      body: "Here is more detail about my account situation.",
      attemptedSenderType: "ADMIN",
    },
    store,
    () => new Date("2026-07-18T12:05:00.000Z"),
  );

  const after = await getUserSupportThreadDetail(
    { userId: "user-a", threadId: created.id },
    store,
  );
  assert.equal(after.messages.length, 2);
  assert.ok(after.messages.every((m) => m.senderType === "USER"));
});

test("user cannot view another user's thread", async () => {
  const store = new MemorySupportStore();
  const created = await createUserSupportThread(
    {
      userId: "user-a",
      subject: "Private topic",
      body: "This should only be visible to user A after enough characters.",
    },
    store,
  );

  await assert.rejects(
    () =>
      getUserSupportThreadDetail(
        { userId: "user-b", threadId: created.id },
        store,
      ),
    (error: unknown) =>
      error instanceof SupportAccessError && error.code === "not_found",
  );

  const listB = await listUserSupportThreads("user-b", store);
  assert.equal(listB.length, 0);
});

test("internal messages are not returned to the user", async () => {
  const store = new MemorySupportStore();
  const created = await createUserSupportThread(
    {
      userId: "user-a",
      subject: "Need help",
      body: "Please look at my account access issue carefully.",
    },
    store,
  );

  store.messages.push({
    id: "internal-1",
    threadId: created.id,
    senderType: "ADMIN",
    authorUserId: "admin-1",
    body: "Internal note: escalate",
    isInternal: true,
    createdAt: new Date(),
  });
  store.messages.push({
    id: "public-admin",
    threadId: created.id,
    senderType: "ADMIN",
    authorUserId: "admin-1",
    body: "Thanks — we are looking into this for you.",
    isInternal: false,
    createdAt: new Date(),
  });

  const detail = await getUserSupportThreadDetail(
    { userId: "user-a", threadId: created.id },
    store,
  );
  assert.equal(detail.messages.length, 2);
  assert.ok(!detail.messages.some((m) => m.body.includes("Internal note")));
  assert.ok(detail.messages.some((m) => m.senderType === "ADMIN"));
});

test("closed thread rejects user reply", async () => {
  const store = new MemorySupportStore();
  const created = await createUserSupportThread(
    {
      userId: "user-a",
      subject: "Closed case",
      body: "Initial message that is long enough for validation rules.",
    },
    store,
  );
  const thread = store.threads.get(created.id)!;
  thread.status = "closed";
  thread.closedAt = new Date();

  await assert.rejects(
    () =>
      replyToUserSupportThread(
        {
          userId: "user-a",
          threadId: created.id,
          body: "Trying to reply after the thread was closed by support.",
        },
        store,
      ),
    (error: unknown) =>
      error instanceof SupportAccessError && error.code === "closed",
  );
});

test("support routes and UI enforce session ownership patterns", () => {
  const listPage = readFileSync(
    "src/app/(protected)/settings/support/page.tsx",
    "utf8",
  );
  const detailPage = readFileSync(
    "src/app/(protected)/settings/support/[threadId]/page.tsx",
    "utf8",
  );
  const createApi = readFileSync("src/app/api/support/threads/route.ts", "utf8");
  const replyApi = readFileSync(
    "src/app/api/support/threads/[id]/messages/route.ts",
    "utf8",
  );
  const store = readFileSync("src/lib/support/store.ts", "utf8");
  const help = readFileSync("src/components/settings/help-contact-card.tsx", "utf8");
  const rateConfig = readFileSync("src/config/auth-rate-limit.ts", "utf8");

  assert.match(listPage, /requireSession/);
  assert.match(detailPage, /requireSession/);
  assert.match(createApi, /requireSession/);
  assert.match(createApi, /support_create_thread/);
  assert.match(replyApi, /support_reply/);
  assert.match(replyApi, /void body\.senderType|attemptedSenderType/);
  assert.match(store, /userId/);
  assert.match(store, /isInternal: false/);
  assert.match(store, /senderType: "USER"/);
  assert.match(help, /\/settings\/support/);
  assert.match(rateConfig, /support_create_thread/);
  assert.match(rateConfig, /support_reply/);

  // No admin inbox in Phase C.
  assert.doesNotMatch(listPage, /admin\/support/);
  assert.doesNotMatch(createApi, /senderType:\s*"ADMIN"/);
});

test("schema includes support models", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  assert.match(schema, /model SupportThread/);
  assert.match(schema, /model SupportMessage/);
  assert.match(schema, /enum SupportThreadStatus/);
  assert.match(schema, /enum SupportMessageSenderType/);
});
