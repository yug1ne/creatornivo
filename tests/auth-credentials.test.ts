import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import bcrypt from "bcryptjs";

import {
  authorizeCredentials,
  getDatabaseFingerprint,
  getSafeEmailHash,
  normalizeEmail,
  registerCredentialsUser,
  type AuthDiagnosticEntry,
  type CredentialsUserRecord,
} from "../src/lib/auth/credentials";

class MemoryCredentialsStore {
  users = new Map<string, CredentialsUserRecord>();

  async findUserByEmail(email: string) {
    return (
      Array.from(this.users.values()).find(
        (user) => normalizeEmail(user.email) === normalizeEmail(email),
      ) ?? null
    );
  }

  async createUser(data: {
    name: string | null;
    email: string;
    password: string;
  }) {
    const user: CredentialsUserRecord = {
      id: `user-${this.users.size + 1}`,
      name: data.name,
      email: data.email,
      password: data.password,
      image: null,
      plan: "free",
      role: "user",
    };
    this.users.set(user.id, user);
    return user;
  }
}

function request() {
  return new Request("https://www.creatornivo.com/api/auth/callback/credentials", {
    method: "POST",
    headers: { "x-request-id": "auth-test-request" },
  });
}

function authorizer(
  store: MemoryCredentialsStore,
  logs: AuthDiagnosticEntry[],
  now = () => new Date("2026-07-04T12:00:00.000Z"),
) {
  return (
    email: string,
    password: string,
    overrides: Partial<{
      findUserByEmail: typeof store.findUserByEmail;
      comparePassword: typeof bcrypt.compare;
    }> = {},
  ) =>
    authorizeCredentials({ email, password }, request(), {
      findUserByEmail:
        overrides.findUserByEmail ?? store.findUserByEmail.bind(store),
      comparePassword: overrides.comparePassword ?? bcrypt.compare,
      log: (entry) => logs.push(entry),
      now,
    });
}

async function register(
  store: MemoryCredentialsStore,
  email: string,
  password: string,
) {
  return registerCredentialsUser(
    { name: "Test User", email, password },
    {
      findUserByEmail: (candidate) => store.findUserByEmail(candidate),
      hashPassword: (plainPassword) => bcrypt.hash(plainPassword, 4),
      createUser: (data) => store.createUser(data),
    },
  );
}

test("register awaits a persisted bcrypt hash and supports immediate login", async () => {
  const store = new MemoryCredentialsStore();
  const logs: AuthDiagnosticEntry[] = [];
  const password = " Unicode pass \u{1F512} ";
  const user = await register(store, " New.User@Example.COM ", password);

  assert.equal(user.email, "new.user@example.com");
  assert.ok(user.password);
  assert.notEqual(user.password, password);
  assert.equal(await bcrypt.compare(password, user.password), true);

  const authenticated = await authorizer(store, logs)(
    "NEW.USER@example.com",
    password,
  );
  assert.equal(authenticated?.id, user.id);
  assert.equal(logs.at(-1)?.outcome, "success");
});

test("register, logout, and login is deterministic at 0, 1, 5, and 30 seconds", async () => {
  const store = new MemoryCredentialsStore();
  const logs: AuthDiagnosticEntry[] = [];
  const password = "same-password";
  const user = await register(store, "delay@example.com", password);
  const base = Date.parse("2026-07-04T12:00:00.000Z");
  let elapsedSeconds = 0;
  const login = authorizer(
    store,
    logs,
    () => new Date(base + elapsedSeconds * 1000),
  );

  for (const delay of [0, 1, 5, 30]) {
    elapsedSeconds = delay;
    const authenticated = await login(" delay@EXAMPLE.com ", password);
    assert.equal(authenticated?.id, user.id, `failed after ${delay} seconds`);
    assert.equal(
      logs.at(-1)?.timestamp,
      new Date(base + delay * 1000).toISOString(),
    );
  }
});

test("plan and Paddle lifecycle updates do not prevent credentials login", async () => {
  const store = new MemoryCredentialsStore();
  const logs: AuthDiagnosticEntry[] = [];
  const password = "plan-password";
  const user = await register(store, "plan@example.com", password);
  const login = authorizer(store, logs);

  user.plan = "pro";
  assert.equal((await login(user.email, password))?.plan, "pro");

  user.plan = "free";
  assert.equal((await login(user.email, password))?.plan, "free");

  user.plan = "pro";
  assert.equal((await login(user.email, password))?.plan, "pro");
  assert.equal(await bcrypt.compare(password, user.password!), true);
});

test("wrong password is rejected specifically as bcrypt_mismatch", async () => {
  const store = new MemoryCredentialsStore();
  const logs: AuthDiagnosticEntry[] = [];
  await register(store, "wrong@example.com", "correct-password");

  const authenticated = await authorizer(store, logs)(
    "wrong@example.com",
    "wrong-password",
  );
  assert.equal(authenticated, null);
  assert.equal(logs.at(-1)?.reason, "bcrypt_mismatch");
});

test("email is normalized but password whitespace, case, and Unicode are unchanged", async () => {
  const store = new MemoryCredentialsStore();
  const logs: AuthDiagnosticEntry[] = [];
  const password = "  P\u00E4ssWord\u{1F512}  ";
  await register(store, " Mixed.Case@Example.COM ", password);
  const login = authorizer(store, logs);

  assert.equal(normalizeEmail(" Mixed.Case@Example.COM "), "mixed.case@example.com");
  assert.ok(await login(" MIXED.case@example.com ", password));
  assert.equal(await login("mixed.case@example.com", password.trim()), null);
  assert.equal(logs.at(-1)?.reason, "bcrypt_mismatch");
});

test("database failures are never classified as bcrypt mismatch", async () => {
  const store = new MemoryCredentialsStore();
  const logs: AuthDiagnosticEntry[] = [];
  const databaseError = Object.assign(new Error("connection timeout"), {
    code: "P2024",
  });

  const authenticated = await authorizer(store, logs)(
    "db@example.com",
    "password",
    {
      findUserByEmail: async () => {
        throw databaseError;
      },
    },
  );

  assert.equal(authenticated, null);
  assert.equal(logs.at(-1)?.reason, "database_error");
  assert.equal(logs.at(-1)?.databaseErrorCode, "P2024");
  assert.notEqual(logs.at(-1)?.reason, "bcrypt_mismatch");
});

test("missing users, hashes, and bcrypt exceptions have distinct reasons", async () => {
  const store = new MemoryCredentialsStore();
  const logs: AuthDiagnosticEntry[] = [];
  const login = authorizer(store, logs);

  assert.equal(await login("missing@example.com", "password"), null);
  assert.equal(logs.at(-1)?.reason, "user_not_found");

  store.users.set("no-password", {
    id: "no-password",
    email: "no-password@example.com",
    name: null,
    image: null,
    password: null,
    plan: "free",
    role: "user",
  });
  assert.equal(await login("no-password@example.com", "password"), null);
  assert.equal(logs.at(-1)?.reason, "password_hash_missing");

  const user = await register(store, "bcrypt@example.com", "password");
  assert.equal(
    await login(user.email, "password", {
      comparePassword: async () => {
        throw new Error("bcrypt unavailable");
      },
    }),
    null,
  );
  assert.equal(logs.at(-1)?.reason, "unexpected_authorize_error");
});

test("diagnostic fingerprints do not disclose email or database URL", () => {
  const email = "owner@example.com";
  const databaseUrl =
    "postgresql://sensitive-user:sensitive-password@db.example/private";
  const emailHash = getSafeEmailHash(email);
  const databaseFingerprint = getDatabaseFingerprint(databaseUrl);

  assert.match(emailHash, /^sha256:[a-f0-9]{12}$/);
  assert.match(databaseFingerprint, /^sha256:[a-f0-9]{12}$/);
  assert.doesNotMatch(emailHash, /owner|example/);
  assert.doesNotMatch(databaseFingerprint, /sensitive|db\.example|private/);
});

test("Paddle webhook user writes change plan only and never overwrite password", () => {
  const source = readFileSync("src/lib/paddle/subscription-service.ts", "utf8");
  assert.doesNotMatch(source, /\bpassword\b/);
  assert.match(source, /transaction\.user\.update\(\{[\s\S]*?data: \{ plan \}/);
  assert.doesNotMatch(source, /data:\s*\{\s*\.\.\.[^}]*user/i);
});
