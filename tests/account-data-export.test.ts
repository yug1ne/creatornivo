import assert from "node:assert/strict";
import test from "node:test";

import bcrypt from "bcryptjs";

import { postAccountExportData } from "../src/app/api/account/export-data/route";
import { AUTH_RATE_LIMIT_GENERIC_MESSAGE } from "../src/config/auth-rate-limit";
import { authRateLimitPolicies } from "../src/config/auth-rate-limit";
import {
  buildExportFilename,
  buildUserDataExport,
  DATA_EXPORT_RECORD_LIMIT,
  DATA_EXPORT_VERSION,
  type UserDataExportStore,
} from "../src/lib/privacy/export-user-data";
import {
  AccountPasswordVerificationError,
  verifyAccountPassword,
} from "../src/lib/privacy/verify-account-password";
import { AuthRateLimitError } from "../src/lib/auth/rate-limit";

class MemoryUserDataExportStore implements UserDataExportStore {
  user = {
    id: "user-export",
    email: "export@example.com",
    name: "Export User",
    image: null,
    plan: "pro" as const,
    role: "user",
    emailVerified: null,
    onboardingCompletedAt: new Date("2026-07-01T10:00:00.000Z"),
    passwordChangedAt: null,
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
    updatedAt: new Date("2026-07-05T12:00:00.000Z"),
  };

  accounts = [{ provider: "credentials", type: "credentials", providerAccountId: "local" }];
  subscription = {
    provider: "paddle",
    status: "active",
    paddleCustomerId: "ctm_test",
    paddleSubscriptionId: "sub_test",
    paddlePriceId: "pri_test",
    paddleStatus: "active",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    currentPeriodEnd: "2026-08-01T00:00:00.000Z",
    cancelAtPeriodEnd: false,
    earlyAccessClaimedAt: null,
    createdAt: "2026-06-15T10:00:00.000Z",
    updatedAt: "2026-07-05T12:00:00.000Z",
  };
  checkoutIntents = [
    {
      id: "intent-1",
      priceId: "pri_test",
      status: "completed",
      paddleTransactionId: "txn_test",
      paddleSubscriptionId: "sub_test",
      createdAt: "2026-06-15T10:00:00.000Z",
      updatedAt: "2026-06-15T10:05:00.000Z",
      expiresAt: "2026-06-15T11:00:00.000Z",
      completedAt: "2026-06-15T10:05:00.000Z",
    },
  ];
  adjustments = [
    {
      paddleAdjustmentId: "adj_test",
      paddleTransactionId: "txn_test",
      paddleSubscriptionId: "sub_test",
      action: "refund",
      type: "full",
      status: "approved",
      currencyCode: "USD",
      total: "4.90",
      occurredAt: "2026-06-20T10:00:00.000Z",
    },
  ];
  savedPrompts = [
    {
      id: "prompt-1",
      title: "Saved prompt",
      content: "Prompt body",
      tags: ["marketing"],
      createdAt: new Date("2026-07-02T10:00:00.000Z"),
      updatedAt: new Date("2026-07-02T10:00:00.000Z"),
      template: { id: "tpl-1", slug: "x-thread", title: "X Thread" },
    },
  ];
  generations = [
    {
      id: "gen-1",
      prompt: "Write a thread",
      result: "Thread output",
      model: "gpt-4o-mini",
      tokensUsed: 120,
      createdAt: new Date("2026-07-03T10:00:00.000Z"),
      template: { id: "tpl-1", slug: "x-thread", title: "X Thread" },
    },
  ];
  reservations = [
    {
      requestId: "req-1",
      plan: "pro" as const,
      periodKey: "2026-07",
      status: "completed",
      model: "gpt-4o-mini",
      estimatedMaxOutputTokens: 4096,
      actualInputTokens: 80,
      actualOutputTokens: 120,
      createdAt: new Date("2026-07-03T10:00:00.000Z"),
      startedAt: new Date("2026-07-03T10:00:01.000Z"),
      completedAt: new Date("2026-07-03T10:00:05.000Z"),
      expiresAt: new Date("2026-07-03T10:10:00.000Z"),
    },
  ];

  async findUserById(userId: string) {
    return userId === this.user.id ? this.user : null;
  }

  async findAccountsByUserId() {
    return this.accounts;
  }

  async findSubscriptionByUserId() {
    return this.subscription;
  }

  async findCheckoutIntentsByUserId() {
    return this.checkoutIntents;
  }

  async countCheckoutIntentsByUserId() {
    return this.checkoutIntents.length;
  }

  async findAdjustmentsByUserId() {
    return this.adjustments;
  }

  async countAdjustmentsByUserId() {
    return this.adjustments.length;
  }

  async findSavedPromptsByUserId() {
    return this.savedPrompts;
  }

  async countSavedPromptsByUserId() {
    return this.savedPrompts.length;
  }

  async findGenerationsByUserId() {
    return this.generations;
  }

  async countGenerationsByUserId() {
    return this.generations.length;
  }

  async findReservationsByUserId() {
    return this.reservations;
  }

  async countReservationsByUserId() {
    return this.reservations.length;
  }

  async getGenerationUsage() {
    return {
      used: 1,
      limit: 100,
      period: "month" as const,
      periodKey: "2026-07",
    };
  }
}

test("buildUserDataExport assembles account, content, billing, and usage data", async () => {
  const store = new MemoryUserDataExportStore();
  const exportedAt = new Date("2026-07-05T18:00:00.000Z");

  const payload = await buildUserDataExport(store.user.id, store, {
    exportedAt,
    userPasswordPresent: true,
  });

  assert.equal(payload.exportVersion, DATA_EXPORT_VERSION);
  assert.equal(payload.exportedAt, exportedAt.toISOString());
  assert.equal(payload.account.email, "export@example.com");
  assert.deepEqual(payload.account.authProviders, ["credentials"]);
  assert.equal(payload.subscription?.paddleSubscriptionId, "sub_test");
  assert.equal(payload.library.items[0]?.title, "Saved prompt");
  assert.equal(payload.generations.items[0]?.result, "Thread output");
  assert.equal(payload.usage.currentPeriod.used, 1);
  assert.equal(payload.usage.reservations.items[0]?.requestId, "req-1");
  assert.match(
    JSON.stringify(payload),
    /password hashes/,
  );
  assert.doesNotMatch(JSON.stringify(payload), /refresh_token|access_token|id_token/);
});

test("buildUserDataExport marks truncated lists when totalCount exceeds the limit", async () => {
  const store = new MemoryUserDataExportStore();
  store.generations = Array.from({ length: DATA_EXPORT_RECORD_LIMIT }, (_, index) => ({
    id: `gen-${index}`,
    prompt: `prompt-${index}`,
    result: `result-${index}`,
    model: "gpt-4o-mini",
    tokensUsed: 10,
    createdAt: new Date("2026-07-03T10:00:00.000Z"),
    template: null,
  }));

  const payload = await buildUserDataExport(store.user.id, store, {
    userPasswordPresent: true,
  });

  assert.equal(payload.generations.totalCount, DATA_EXPORT_RECORD_LIMIT);
  assert.equal(payload.generations.items.length, DATA_EXPORT_RECORD_LIMIT);
  assert.equal(payload.generations.truncated, false);

  store.generations.push({
    id: "gen-overflow",
    prompt: "overflow",
    result: "overflow",
    model: "gpt-4o-mini",
    tokensUsed: 10,
    createdAt: new Date("2026-07-03T10:00:00.000Z"),
    template: null,
  });

  store.countGenerationsByUserId = async () => DATA_EXPORT_RECORD_LIMIT + 1;

  const truncatedPayload = await buildUserDataExport(store.user.id, store);

  assert.equal(truncatedPayload.generations.totalCount, DATA_EXPORT_RECORD_LIMIT + 1);
  assert.equal(truncatedPayload.generations.items.length, DATA_EXPORT_RECORD_LIMIT);
  assert.equal(truncatedPayload.generations.truncated, true);
});

test("verifyAccountPassword rejects missing, unsupported, and invalid passwords", async () => {
  const hash = await bcrypt.hash("correct-password", 4);

  await assert.rejects(
    verifyAccountPassword("user-1", undefined, {
      store: { findUserPassword: async () => hash },
    }),
    AccountPasswordVerificationError,
  );

  await assert.rejects(
    verifyAccountPassword("user-1", "any-password", {
      store: { findUserPassword: async () => null },
    }),
    (error: unknown) => {
      assert.ok(error instanceof AccountPasswordVerificationError);
      assert.equal(error.code, "password_not_supported");
      return true;
    },
  );

  await assert.rejects(
    verifyAccountPassword("user-1", "wrong-password", {
      store: { findUserPassword: async () => hash },
      comparePassword: bcrypt.compare,
    }),
    (error: unknown) => {
      assert.ok(error instanceof AccountPasswordVerificationError);
      assert.equal(error.code, "invalid_password");
      return true;
    },
  );

  await verifyAccountPassword("user-1", "correct-password", {
    store: { findUserPassword: async () => hash },
    comparePassword: bcrypt.compare,
  });
});

test("export-data route returns JSON attachment when password verification passes", async () => {
  const store = new MemoryUserDataExportStore();

  const response = await postAccountExportData(
    new Request("https://www.creatornivo.com/api/account/export-data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.50",
      },
      body: JSON.stringify({ password: "correct-password" }),
    }),
    {
      requireSessionFn: async () => ({
        id: store.user.id,
        email: store.user.email,
        name: store.user.name,
        image: store.user.image,
        plan: store.user.plan,
        role: "user",
      }),
      enforceRateLimit: async () => undefined,
      verifyPassword: async () => undefined,
      getPasswordPresent: async () => true,
      store,
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("Content-Disposition") ?? "",
    /creatornivo-data-export-/,
  );
  assert.equal(
    response.headers.get("Content-Type"),
    "application/json; charset=utf-8",
  );

  const payload = await response.json();
  assert.equal(payload.account.email, "export@example.com");
  assert.equal(buildExportFilename(new Date("2026-07-05T18:00:00.000Z")), "creatornivo-data-export-2026-07-05.json");
});

test("export-data route maps auth and rate-limit failures", async () => {
  const unauthorized = await postAccountExportData(
    new Request("https://www.creatornivo.com/api/account/export-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "secret" }),
    }),
    {
      requireSessionFn: async () => {
        throw new Error("Unauthorized");
      },
    },
  );
  assert.equal(unauthorized.status, 401);

  const invalidPassword = await postAccountExportData(
    new Request("https://www.creatornivo.com/api/account/export-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "wrong" }),
    }),
    {
      requireSessionFn: async () => ({
        id: "user-1",
        email: "user@example.com",
        name: null,
        image: null,
        plan: "free",
        role: "user",
      }),
      enforceRateLimit: async () => undefined,
      verifyPassword: async () => {
        throw new AccountPasswordVerificationError("invalid_password");
      },
    },
  );
  assert.equal(invalidPassword.status, 403);
  assert.equal((await invalidPassword.json()).error, "Invalid password");

  const rateLimited = await postAccountExportData(
    new Request("https://www.creatornivo.com/api/account/export-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "secret" }),
    }),
    {
      requireSessionFn: async () => ({
        id: "user-1",
        email: "user@example.com",
        name: null,
        image: null,
        plan: "free",
        role: "user",
      }),
      enforceRateLimit: async () => {
        throw new AuthRateLimitError();
      },
    },
  );
  assert.equal(rateLimited.status, 429);
  assert.equal((await rateLimited.json()).error, AUTH_RATE_LIMIT_GENERIC_MESSAGE);
});

test("auth rate limit policy includes export_data buckets", () => {
  assert.equal(authRateLimitPolicies.export_data.ip?.maxAttempts, 10);
  assert.equal(authRateLimitPolicies.export_data.account?.maxAttempts, 3);
});