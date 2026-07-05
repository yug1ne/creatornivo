import assert from "node:assert/strict";
import test from "node:test";

import bcrypt from "bcryptjs";

import { postAccountDelete } from "../src/app/api/account/delete/route";
import { AUTH_RATE_LIMIT_GENERIC_MESSAGE } from "../src/config/auth-rate-limit";
import { authRateLimitPolicies } from "../src/config/auth-rate-limit";
import {
  ACCOUNT_DELETION_AUDIT_STATUS,
  type AccountDeletionAuditStore,
} from "../src/lib/privacy/account-deletion-audit";
import type { AccountDeletionDataStore } from "../src/lib/privacy/account-deletion-store";
import {
  getAccountDeletionBlock,
  hasActiveGenerationReservations,
} from "../src/lib/privacy/account-deletion-policy";
import {
  AccountDeletionError,
  deleteUserAccount,
} from "../src/lib/privacy/delete-user-account";
import {
  authorizeCredentials,
  registerCredentialsUser,
  type CredentialsUserRecord,
} from "../src/lib/auth/credentials";
import { AuthRateLimitError } from "../src/lib/auth/rate-limit";

class MemoryAccountDeletionDataStore implements AccountDeletionDataStore {
  users = new Map<
    string,
    {
      id: string;
      email: string;
      plan: "free" | "pro";
      role: "user" | "admin";
      password: string | null;
      subscription: {
        provider: string;
        status: string;
        paddleStatus: string | null;
        cancelAtPeriodEnd: boolean;
        currentPeriodEnd: Date | null;
      } | null;
    }
  >();
  reservations: Array<{ userId: string; status: string; expiresAt: Date }> = [];
  adjustments: Array<{ userId: string | null }> = [];
  verificationTokens: Array<{ identifier: string }> = [];

  async findDeletionUser(userId: string) {
    const user = this.users.get(userId);
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      plan: user.plan,
      role: user.role,
      subscription: user.subscription,
    };
  }

  async findActiveReservations(userId: string) {
    return this.reservations
      .filter((reservation) => reservation.userId === userId)
      .map((reservation) => ({
        status: reservation.status,
        expiresAt: reservation.expiresAt,
      }));
  }

  async deleteUserData(userId: string, email: string) {
    this.users.delete(userId);
    this.reservations = this.reservations.filter(
      (reservation) => reservation.userId !== userId,
    );
    this.verificationTokens = this.verificationTokens.filter(
      (token) => token.identifier !== email,
    );
    for (const adjustment of this.adjustments) {
      if (adjustment.userId === userId) {
        adjustment.userId = null;
      }
    }
  }

  async findAdjustmentsWithUserId(userId: string) {
    return this.adjustments.filter((adjustment) => adjustment.userId === userId)
      .length;
  }
}

class MemoryAccountDeletionAuditStore implements AccountDeletionAuditStore {
  records: Array<{
    id: string;
    userId: string;
    emailHash: string;
    status: string;
    blockReason?: string | null;
    failureReason?: string | null;
    completedAt?: Date | null;
  }> = [];

  async createRecord(data) {
    const record = {
      id: `audit-${this.records.length + 1}`,
      userId: data.userId,
      emailHash: data.emailHash,
      status: data.status,
      blockReason: data.blockReason ?? null,
      failureReason: data.failureReason ?? null,
      completedAt: data.completedAt ?? null,
    };
    this.records.push(record);
    return { id: record.id };
  }

  async updateRecord(id, data) {
    const record = this.records.find((entry) => entry.id === id);
    if (!record) return;
    record.status = data.status;
    record.completedAt = data.completedAt ?? null;
    record.failureReason = data.failureReason ?? null;
  }
}

test("getAccountDeletionBlock blocks active paddle subscriptions", () => {
  const block = getAccountDeletionBlock(
    {
      id: "user-1",
      email: "pro@example.com",
      plan: "pro",
      role: "user",
      subscription: {
        provider: "paddle",
        status: "active",
        paddleStatus: "active",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date("2026-08-01T00:00:00.000Z"),
      },
    },
    new Date("2026-07-05T12:00:00.000Z"),
  );

  assert.equal(block?.code, "subscription_active");
  assert.equal(block?.manageSubscription, true);
});

test("hasActiveGenerationReservations detects in-progress reservations", () => {
  assert.equal(
    hasActiveGenerationReservations({
      reservations: [
        {
          status: "started",
          expiresAt: new Date("2026-07-05T13:00:00.000Z"),
        },
      ],
      now: new Date("2026-07-05T12:00:00.000Z"),
    }),
    true,
  );
  assert.equal(
    hasActiveGenerationReservations({
      reservations: [
        {
          status: "completed",
          expiresAt: new Date("2026-07-05T13:00:00.000Z"),
        },
      ],
      now: new Date("2026-07-05T12:00:00.000Z"),
    }),
    false,
  );
});

test("deleteUserAccount removes user data and writes completed audit record", async () => {
  const dataStore = new MemoryAccountDeletionDataStore();
  const auditStore = new MemoryAccountDeletionAuditStore();
  const password = "delete-password";
  const passwordHash = await bcrypt.hash(password, 4);

  dataStore.users.set("user-1", {
    id: "user-1",
    email: "delete@example.com",
    plan: "free",
    role: "user",
    password: passwordHash,
    subscription: null,
  });
  dataStore.reservations.push({
    userId: "user-1",
    status: "completed",
    expiresAt: new Date("2026-07-05T13:00:00.000Z"),
  });
  dataStore.verificationTokens.push({ identifier: "delete@example.com" });
  dataStore.adjustments.push({ userId: "user-1" });

  await deleteUserAccount(
    {
      userId: "user-1",
      password,
      confirmation: "DELETE",
      ipKey: "203.0.113.10",
    },
    {
      dataStore,
      auditStore,
      verifyPassword: async (_userId, plainPassword) => {
        if (plainPassword !== password) {
          throw new Error("invalid");
        }
      },
    },
  );

  assert.equal(dataStore.users.has("user-1"), false);
  assert.equal(dataStore.reservations.length, 0);
  assert.equal(dataStore.verificationTokens.length, 0);
  assert.equal(dataStore.adjustments[0]?.userId, null);
  assert.equal(auditStore.records[0]?.status, ACCOUNT_DELETION_AUDIT_STATUS.COMPLETED);
});

test("deleteUserAccount blocks active subscriptions with audit record", async () => {
  const dataStore = new MemoryAccountDeletionDataStore();
  const auditStore = new MemoryAccountDeletionAuditStore();

  dataStore.users.set("user-pro", {
    id: "user-pro",
    email: "pro@example.com",
    plan: "pro",
    role: "user",
    password: await bcrypt.hash("password", 4),
    subscription: {
      provider: "paddle",
      status: "active",
      paddleStatus: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date("2026-08-01T00:00:00.000Z"),
    },
  });

  await assert.rejects(
    deleteUserAccount(
      {
        userId: "user-pro",
        password: "password",
        confirmation: "DELETE",
      },
      {
        dataStore,
        auditStore,
        verifyPassword: async () => undefined,
        now: () => new Date("2026-07-05T12:00:00.000Z"),
      },
    ),
    (error: unknown) => {
      assert.ok(error instanceof AccountDeletionError);
      assert.equal(error.code, "subscription_active");
      assert.equal(error.manageSubscription, true);
      return true;
    },
  );

  assert.equal(dataStore.users.has("user-pro"), true);
  assert.equal(auditStore.records[0]?.status, ACCOUNT_DELETION_AUDIT_STATUS.BLOCKED);
  assert.equal(auditStore.records[0]?.blockReason, "subscription_active");
});

test("delete route returns 409 for active subscriptions", async () => {
  const response = await postAccountDelete(
    new Request("https://www.creatornivo.com/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "password",
        confirmation: "DELETE",
      }),
    }),
    {
      requireSessionFn: async () => ({
        id: "user-pro",
        email: "pro@example.com",
        name: null,
        image: null,
        plan: "pro",
        role: "user",
      }),
      enforceRateLimit: async () => undefined,
      deleteAccount: async () => {
        throw new AccountDeletionError(
          "subscription_active",
          "You have an active subscription. Please cancel your subscription before deleting your account.",
          true,
        );
      },
    },
  );

  assert.equal(response.status, 409);
  const payload = await response.json();
  assert.equal(payload.code, "subscription_active");
  assert.equal(payload.manageSubscription, true);
});

test("deleted users can register again and immediate login still works", async () => {
  const dataStore = new MemoryAccountDeletionDataStore();
  const auditStore = new MemoryAccountDeletionAuditStore();
  const password = "initial-password";
  const passwordHash = await bcrypt.hash(password, 4);
  const email = "rejoin@example.com";

  dataStore.users.set("user-flow", {
    id: "user-flow",
    email,
    plan: "free",
    role: "user",
    password: passwordHash,
    subscription: null,
  });

  await deleteUserAccount(
    {
      userId: "user-flow",
      password,
      confirmation: "DELETE",
    },
    {
      dataStore,
      auditStore,
      verifyPassword: async (_userId, plainPassword) => {
        const valid = await bcrypt.compare(plainPassword, passwordHash);
        if (!valid) throw new Error("invalid");
      },
    },
  );

  const recreated = await registerCredentialsUser(
    { name: "Rejoin", email, password },
    {
      findUserByEmail: async (candidateEmail) => {
        const user = Array.from(dataStore.users.values()).find(
          (entry) => entry.email === candidateEmail,
        );
        return user ? { id: user.id } : null;
      },
      hashPassword: (plainPassword) => bcrypt.hash(plainPassword, 4),
      createUser: async (data) => {
        const created: CredentialsUserRecord = {
          id: "user-rejoin",
          name: data.name,
          email: data.email,
          password: data.password,
          image: null,
          plan: "free",
          role: "user",
        };
        dataStore.users.set(created.id, {
          id: created.id,
          email: created.email,
          plan: "free",
          role: "user",
          password: created.password,
          subscription: null,
        });
        return created;
      },
    },
  );

  const login = await authorizeCredentials(
    { email, password },
    new Request("https://www.creatornivo.com/api/auth/callback/credentials"),
    {
      findUserByEmail: async (candidateEmail) => {
        const user = Array.from(dataStore.users.values()).find(
          (entry) => entry.email === candidateEmail,
        );
        if (!user) return null;
        return {
          id: user.id,
          email: user.email,
          name: "Rejoin",
          image: null,
          password: user.password,
          plan: user.plan,
          role: user.role,
        };
      },
      comparePassword: bcrypt.compare,
      enforceRateLimit: async () => undefined,
    },
  );

  assert.equal(recreated.email, email);
  assert.equal(login?.id, "user-rejoin");
});

test("delete route maps rate limits and invalid passwords", async () => {
  const rateLimited = await postAccountDelete(
    new Request("https://www.creatornivo.com/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "x", confirmation: "DELETE" }),
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

  const invalidPassword = await postAccountDelete(
    new Request("https://www.creatornivo.com/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "wrong", confirmation: "DELETE" }),
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
      deleteAccount: async () => {
        throw new AccountDeletionError("invalid_password", "Invalid password");
      },
    },
  );
  assert.equal(invalidPassword.status, 403);
});

test("auth rate limit policy includes delete_account buckets", () => {
  assert.equal(authRateLimitPolicies.delete_account.ip?.maxAttempts, 5);
  assert.equal(authRateLimitPolicies.delete_account.account?.maxAttempts, 3);
});