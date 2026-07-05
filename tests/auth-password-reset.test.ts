import assert from "node:assert/strict";
import test from "node:test";

import bcrypt from "bcryptjs";

import { POST as forgotPasswordPost } from "../src/app/api/auth/forgot-password/route";
import {
  authorizeCredentials,
  registerCredentialsUser,
  type CredentialsUserRecord,
} from "../src/lib/auth/credentials";
import {
  FORGOT_PASSWORD_SUCCESS_MESSAGE,
  PasswordResetError,
  hashPasswordResetToken,
  requestPasswordResetForEmail,
  resetPasswordWithToken,
  type PasswordResetStore,
} from "../src/lib/auth/password-reset";

class MemoryPasswordResetStore implements PasswordResetStore {
  users = new Map<string, CredentialsUserRecord>();
  tokens: Array<{
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
  }> = [];

  async findUserByEmail(email: string) {
    return (
      Array.from(this.users.values()).find((user) => user.email === email) ??
      null
    );
  }

  async invalidateActiveTokens(userId: string, usedAt: Date) {
    for (const token of this.tokens) {
      if (token.userId === userId && token.usedAt === null) {
        token.usedAt = usedAt;
      }
    }
  }

  async createToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    const token = {
      id: `token-${this.tokens.length + 1}`,
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      usedAt: null,
    };
    this.tokens.push(token);
    return token;
  }

  async findValidToken(tokenHash: string, now: Date) {
    return (
      this.tokens.find(
        (token) =>
          token.tokenHash === tokenHash &&
          token.usedAt === null &&
          token.expiresAt > now,
      ) ?? null
    );
  }

  async markTokenUsed(tokenId: string, usedAt: Date) {
    const token = this.tokens.find((entry) => entry.id === tokenId);
    if (token) token.usedAt = usedAt;
  }

  async updateUserPassword(
    userId: string,
    passwordHash: string,
    passwordChangedAt: Date,
  ) {
    const user = this.users.get(userId);
    if (!user) return;
    user.password = passwordHash;
    (user as CredentialsUserRecord & { passwordChangedAt?: Date }).passwordChangedAt =
      passwordChangedAt;
  }
}

test("requestPasswordResetForEmail invalidates previous active tokens", async () => {
  const store = new MemoryPasswordResetStore();
  const user: CredentialsUserRecord = {
    id: "user-1",
    email: "reset@example.com",
    name: "Reset User",
    image: null,
    password: "hash",
    plan: "free",
    role: "user",
  };
  store.users.set(user.id, user);

  const first = await requestPasswordResetForEmail(
    user.email,
    store,
    () => new Date("2026-07-04T12:00:00.000Z"),
  );
  const second = await requestPasswordResetForEmail(
    user.email,
    store,
    () => new Date("2026-07-04T12:05:00.000Z"),
  );

  assert.ok(first?.plainToken);
  assert.ok(second?.plainToken);
  assert.equal(store.tokens[0]?.usedAt?.toISOString(), "2026-07-04T12:05:00.000Z");
  assert.equal(store.tokens[1]?.usedAt, null);
  assert.equal(
    store.tokens[1]?.expiresAt.toISOString(),
    "2026-07-04T13:05:00.000Z",
  );
});

test("resetPasswordWithToken updates password, usedAt, and passwordChangedAt", async () => {
  const store = new MemoryPasswordResetStore();
  const plainToken = "reset-token-value";
  const oldPassword = await bcrypt.hash("old-password", 4);
  const user: CredentialsUserRecord = {
    id: "user-1",
    email: "reset@example.com",
    name: "Reset User",
    image: null,
    password: oldPassword,
    plan: "free",
    role: "user",
  };
  store.users.set(user.id, user);
  await store.createToken({
    userId: user.id,
    tokenHash: hashPasswordResetToken(plainToken),
    expiresAt: new Date("2026-07-04T13:00:00.000Z"),
  });

  await resetPasswordWithToken(
    { token: plainToken, password: "new-password-9" },
    store,
    {
      hashPassword: (password) => bcrypt.hash(password, 4),
      now: () => new Date("2026-07-04T12:30:00.000Z"),
    },
  );

  assert.equal(store.tokens[0]?.usedAt?.toISOString(), "2026-07-04T12:30:00.000Z");
  assert.equal(
    (
      store.users.get("user-1") as CredentialsUserRecord & {
        passwordChangedAt?: Date;
      }
    ).passwordChangedAt?.toISOString(),
    "2026-07-04T12:30:00.000Z",
  );
  assert.equal(await bcrypt.compare("old-password", user.password!), false);
  assert.equal(await bcrypt.compare("new-password-9", user.password!), true);
});

test("forgot-password always returns the same success message", async () => {
  const existing = await forgotPasswordPost(
    new Request("https://www.creatornivo.com/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.40",
      },
      body: JSON.stringify({ email: "missing@example.com" }),
    }),
  );
  const missingPayload = await existing.json();

  const duplicate = await forgotPasswordPost(
    new Request("https://www.creatornivo.com/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.41",
      },
      body: JSON.stringify({ email: "another-missing@example.com" }),
    }),
  );
  const duplicatePayload = await duplicate.json();

  assert.equal(existing.status, 200);
  assert.equal(duplicate.status, 200);
  assert.equal(missingPayload.message, FORGOT_PASSWORD_SUCCESS_MESSAGE);
  assert.equal(duplicatePayload.message, FORGOT_PASSWORD_SUCCESS_MESSAGE);
});

test("password reset flow rejects old password and keeps immediate login working", async () => {
  const store = new MemoryPasswordResetStore();
  const password = "initial-password";
  const user = await registerCredentialsUser(
    { name: "Flow User", email: "flow@example.com", password },
    {
      findUserByEmail: (email) => store.findUserByEmail(email),
      hashPassword: (plainPassword) => bcrypt.hash(plainPassword, 4),
      createUser: async (data) => {
        const created: CredentialsUserRecord = {
          id: "user-flow",
          name: data.name,
          email: data.email,
          password: data.password,
          image: null,
          plan: "free",
          role: "user",
        };
        store.users.set(created.id, created);
        return created;
      },
    },
  );

  const resetRequest = await requestPasswordResetForEmail(
    user.email,
    store,
    () => new Date("2026-07-04T12:00:00.000Z"),
  );
  assert.ok(resetRequest?.plainToken);

  await resetPasswordWithToken(
    { token: resetRequest!.plainToken, password: "updated-password-9" },
    store,
    {
      hashPassword: (plainPassword) => bcrypt.hash(plainPassword, 4),
      now: () => new Date("2026-07-04T12:10:00.000Z"),
    },
  );

  const oldLogin = await authorizeCredentials(
    { email: user.email, password },
    new Request("https://www.creatornivo.com/api/auth/callback/credentials"),
    {
      findUserByEmail: (email) => store.findUserByEmail(email),
      comparePassword: bcrypt.compare,
      enforceRateLimit: async () => undefined,
    },
  );
  const newLogin = await authorizeCredentials(
    { email: user.email, password: "updated-password-9" },
    new Request("https://www.creatornivo.com/api/auth/callback/credentials"),
    {
      findUserByEmail: (email) => store.findUserByEmail(email),
      comparePassword: bcrypt.compare,
      enforceRateLimit: async () => undefined,
    },
  );

  assert.equal(oldLogin, null);
  assert.equal(newLogin?.id, user.id);
});

test("resetPasswordWithToken rejects expired and used tokens", async () => {
  const store = new MemoryPasswordResetStore();
  const plainToken = "expired-token";
  await store.createToken({
    userId: "user-1",
    tokenHash: hashPasswordResetToken(plainToken),
    expiresAt: new Date("2026-07-04T11:00:00.000Z"),
  });

  await assert.rejects(
    resetPasswordWithToken(
      { token: plainToken, password: "new-password-9" },
      store,
      {
        hashPassword: (password) => bcrypt.hash(password, 4),
        now: () => new Date("2026-07-04T12:00:00.000Z"),
      },
    ),
    PasswordResetError,
  );

  const usedToken = "used-token";
  const created = await store.createToken({
    userId: "user-1",
    tokenHash: hashPasswordResetToken(usedToken),
    expiresAt: new Date("2026-07-04T13:00:00.000Z"),
  });
  await store.markTokenUsed(created.id, new Date("2026-07-04T12:00:00.000Z"));

  await assert.rejects(
    resetPasswordWithToken(
      { token: usedToken, password: "new-password-9" },
      store,
      {
        hashPassword: (password) => bcrypt.hash(password, 4),
        now: () => new Date("2026-07-04T12:10:00.000Z"),
      },
    ),
    (error: unknown) => {
      assert.ok(error instanceof PasswordResetError);
      assert.equal(error.code, "invalid_or_expired_token");
      return true;
    },
  );
});