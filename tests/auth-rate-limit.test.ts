import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTH_RATE_LIMIT_GENERIC_MESSAGE,
  authRateLimitPolicies,
} from "../src/config/auth-rate-limit";
import { postAuthRegister } from "../src/app/api/auth/register/route";
import {
  AuthRateLimitError,
  AuthRateLimitUnavailableError,
  AUTH_RATE_LIMIT_UNAVAILABLE_MESSAGE,
  checkAuthRateLimits,
  shouldFailClosedWhenRateLimitUnavailable,
} from "../src/lib/auth/rate-limit";
import bcrypt from "bcryptjs";

import {
  authorizeCredentials,
  registerCredentialsUser,
  type AuthDiagnosticEntry,
  type CredentialsUserRecord,
} from "../src/lib/auth/credentials";

test("checkAuthRateLimits skips when disabled", async () => {
  let calls = 0;
  await checkAuthRateLimits({
    action: "login",
    ipKey: "203.0.113.10",
    email: "user@example.com",
    enabled: false,
    consume: async () => {
      calls += 1;
      return true;
    },
  });

  assert.equal(calls, 0);
});

test("checkAuthRateLimits enforces ip and account buckets", async () => {
  const buckets: string[] = [];

  await checkAuthRateLimits({
    action: "login",
    ipKey: "203.0.113.10",
    email: "user@example.com",
    enabled: true,
    consume: async (bucket) => {
      buckets.push(bucket);
      return true;
    },
  });

  assert.equal(buckets.length, 2);
  assert.match(buckets[0], /^login:ip:/);
  assert.match(buckets[1], /^login:account:sha256:/);
});

test("checkAuthRateLimits throws AuthRateLimitError when a bucket is exceeded", async () => {
  await assert.rejects(
    checkAuthRateLimits({
      action: "register",
      ipKey: "203.0.113.10",
      email: "user@example.com",
      enabled: true,
      consume: async (bucket) => !bucket.startsWith("register:ip:"),
    }),
    (error: unknown) => {
      assert.ok(error instanceof AuthRateLimitError);
      assert.equal(error.message, AUTH_RATE_LIMIT_GENERIC_MESSAGE);
      assert.equal(error.status, 429);
      return true;
    },
  );
});

test("authorizeCredentials throws AuthRateLimitError and logs rate_limited", async () => {
  const logs: AuthDiagnosticEntry[] = [];

  await assert.rejects(
    authorizeCredentials(
      { email: "rate@example.com", password: "password" },
      new Request("https://www.creatornivo.com/api/auth/callback/credentials", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.55" },
      }),
      {
        findUserByEmail: async () => null,
        comparePassword: async () => true,
        enforceRateLimit: async () => {
          throw new AuthRateLimitError();
        },
        log: (entry) => logs.push(entry),
      },
    ),
    AuthRateLimitError,
  );

  assert.equal(logs.at(-1)?.reason, "rate_limited");
  assert.equal(logs.at(-1)?.outcome, "denied");
});

test("register route returns 429 when rate limit is exceeded", async () => {
  const response = await postAuthRegister(
    new Request("https://www.creatornivo.com/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.99",
      },
      body: JSON.stringify({
        name: "Rate Limit",
        email: "rate-limit@example.com",
        password: "password-12345",
      }),
    }),
    {
      enforceRateLimit: async () => {
        throw new AuthRateLimitError();
      },
    },
  );

  assert.equal(response.status, 429);
  const payload = await response.json();
  assert.equal(payload.error, AUTH_RATE_LIMIT_GENERIC_MESSAGE);
});

test("register and login remain available when rate limit passes", async () => {
  const store = new Map<string, CredentialsUserRecord>();
  const password = "same-password";

  const user = await registerCredentialsUser(
    { name: "Immediate", email: "immediate@example.com", password },
    {
      findUserByEmail: async () => null,
      hashPassword: (plainPassword) => bcrypt.hash(plainPassword, 4),
      createUser: async (data) => {
        const created: CredentialsUserRecord = {
          id: "user-1",
          name: data.name,
          email: data.email,
          password: data.password,
          image: null,
          plan: "free",
          role: "user",
        };
        store.set(created.id, created);
        return created;
      },
    },
  );

  const authenticated = await authorizeCredentials(
    { email: user.email, password },
    new Request("https://www.creatornivo.com/api/auth/callback/credentials", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.12" },
    }),
    {
      findUserByEmail: async (email) =>
        Array.from(store.values()).find((candidate) => candidate.email === email) ??
        null,
      comparePassword: bcrypt.compare,
      enforceRateLimit: async () => undefined,
    },
  );

  assert.equal(authenticated?.id, user.id);
});

test("checkAuthRateLimits enforces export_data ip and account buckets", async () => {
  const buckets: string[] = [];

  await checkAuthRateLimits({
    action: "export_data",
    ipKey: "203.0.113.55",
    email: "export@example.com",
    enabled: true,
    consume: async (bucket) => {
      buckets.push(bucket);
      return true;
    },
  });

  assert.equal(buckets.length, 2);
  assert.match(buckets[0], /^export_data:ip:/);
  assert.match(buckets[1], /^export_data:account:sha256:/);
});

test("checkAuthRateLimits enforces delete_account ip and account buckets", async () => {
  const buckets: string[] = [];

  await checkAuthRateLimits({
    action: "delete_account",
    ipKey: "203.0.113.56",
    email: "delete@example.com",
    enabled: true,
    consume: async (bucket) => {
      buckets.push(bucket);
      return true;
    },
  });

  assert.equal(buckets.length, 2);
  assert.match(buckets[0], /^delete_account:ip:/);
  assert.match(buckets[1], /^delete_account:account:sha256:/);
});

test("auth rate limit policies keep privacy action limits documented", () => {
  assert.equal(authRateLimitPolicies.export_data.account?.maxAttempts, 3);
  assert.equal(authRateLimitPolicies.delete_account.account?.maxAttempts, 3);
  assert.equal(
    authRateLimitPolicies.resend_verification.account?.maxAttempts,
    3,
  );
});

test("register IP limit is tightened to 5 per hour for launch", () => {
  assert.equal(authRateLimitPolicies.register.ip.maxAttempts, 5);
  assert.equal(authRateLimitPolicies.register.ip.windowSeconds, 60 * 60);
  assert.equal(authRateLimitPolicies.register.account?.maxAttempts, 5);
});

test("shouldFailClosedWhenRateLimitUnavailable only for register in production", () => {
  assert.equal(
    shouldFailClosedWhenRateLimitUnavailable("register", "production"),
    true,
  );
  assert.equal(
    shouldFailClosedWhenRateLimitUnavailable("register", "development"),
    false,
  );
  assert.equal(
    shouldFailClosedWhenRateLimitUnavailable("register", "test"),
    false,
  );
  assert.equal(
    shouldFailClosedWhenRateLimitUnavailable("login", "production"),
    false,
  );
  assert.equal(
    shouldFailClosedWhenRateLimitUnavailable("forgot_password", "production"),
    false,
  );
  assert.equal(
    shouldFailClosedWhenRateLimitUnavailable("export_data", "production"),
    false,
  );
  assert.equal(
    shouldFailClosedWhenRateLimitUnavailable("delete_account", "production"),
    false,
  );
});

test("register fails closed in production when rate limiting is disabled", async () => {
  let calls = 0;

  await assert.rejects(
    checkAuthRateLimits({
      action: "register",
      ipKey: "203.0.113.10",
      email: "user@example.com",
      enabled: false,
      nodeEnv: "production",
      consume: async () => {
        calls += 1;
        return true;
      },
    }),
    (error: unknown) => {
      assert.ok(error instanceof AuthRateLimitUnavailableError);
      assert.equal(error.status, 503);
      assert.equal(error.message, AUTH_RATE_LIMIT_UNAVAILABLE_MESSAGE);
      return true;
    },
  );

  assert.equal(calls, 0);
});

test("login remains fail-open in production when rate limiting is disabled", async () => {
  let calls = 0;

  await checkAuthRateLimits({
    action: "login",
    ipKey: "203.0.113.10",
    email: "user@example.com",
    enabled: false,
    nodeEnv: "production",
    consume: async () => {
      calls += 1;
      return true;
    },
  });

  assert.equal(calls, 0);
});

test("register remains fail-open in development when rate limiting is disabled", async () => {
  let calls = 0;

  await checkAuthRateLimits({
    action: "register",
    ipKey: "203.0.113.10",
    email: "user@example.com",
    enabled: false,
    nodeEnv: "development",
    consume: async () => {
      calls += 1;
      return true;
    },
  });

  assert.equal(calls, 0);
});

test("register fails closed in production when Upstash consume errors", async () => {
  await assert.rejects(
    checkAuthRateLimits({
      action: "register",
      ipKey: "203.0.113.10",
      email: "user@example.com",
      enabled: true,
      nodeEnv: "production",
      consume: async () => {
        throw new Error("upstash unavailable");
      },
    }),
    (error: unknown) => {
      assert.ok(error instanceof AuthRateLimitUnavailableError);
      assert.equal(error.status, 503);
      return true;
    },
  );
});

test("login remains fail-open in production when Upstash consume errors", async () => {
  await checkAuthRateLimits({
    action: "login",
    ipKey: "203.0.113.10",
    email: "user@example.com",
    enabled: true,
    nodeEnv: "production",
    consume: async () => {
      throw new Error("upstash unavailable");
    },
  });
});

test("register remains fail-open in development when Upstash consume errors", async () => {
  await checkAuthRateLimits({
    action: "register",
    ipKey: "203.0.113.10",
    email: "user@example.com",
    enabled: true,
    nodeEnv: "development",
    consume: async () => {
      throw new Error("upstash unavailable");
    },
  });
});

test("register route returns 503 when rate limiting is unavailable", async () => {
  const response = await postAuthRegister(
    new Request("https://www.creatornivo.com/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.99",
      },
      body: JSON.stringify({
        name: "Unavailable",
        email: "unavailable@example.com",
        password: "password-12345",
      }),
    }),
    {
      enforceRateLimit: async () => {
        throw new AuthRateLimitUnavailableError();
      },
    },
  );

  assert.equal(response.status, 503);
  const payload = await response.json();
  assert.equal(payload.error, AUTH_RATE_LIMIT_UNAVAILABLE_MESSAGE);
});