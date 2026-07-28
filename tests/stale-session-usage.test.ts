import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { Prisma } from "@prisma/client";

import { getGenerationPolicy } from "../src/config/plans";
import {
  buildUserUsageSnapshotFromCount,
  ensureUserExistsForUsage,
  isPrismaForeignKeyError,
  UsageError,
} from "../src/lib/usage";

test("missing/deleted user does not proceed to usage upsert (stale_session)", async () => {
  await assert.rejects(
    () => ensureUserExistsForUsage("deleted-user-id", async () => null),
    (error: unknown) => {
      assert.ok(error instanceof UsageError);
      assert.equal(error.code, "stale_session");
      assert.match(error.message, /no longer valid|does not exist/i);
      return true;
    },
  );
});

test("ensureUserExistsForUsage allows a present user through", async () => {
  await ensureUserExistsForUsage("user-1", async () => ({ id: "user-1" }));
});

test("empty userId is invalid_input, not stale_session", async () => {
  await assert.rejects(
    () => ensureUserExistsForUsage("   ", async () => null),
    (error: unknown) => {
      assert.ok(error instanceof UsageError);
      assert.equal(error.code, "invalid_input");
      return true;
    },
  );
});

test("findUser database failure maps to database_error", async () => {
  await assert.rejects(
    () =>
      ensureUserExistsForUsage("user-1", async () => {
        throw new Error("db down");
      }),
    (error: unknown) => {
      assert.ok(error instanceof UsageError);
      assert.equal(error.code, "database_error");
      return true;
    },
  );
});

test("Prisma P2003 foreign-key errors are recognized for stale-session fallback", () => {
  const fkError = new Prisma.PrismaClientKnownRequestError(
    "Foreign key constraint failed on the field: `UserUsage_userId_fkey`",
    {
      code: "P2003",
      clientVersion: "test",
      meta: { field_name: "UserUsage_userId_fkey" },
    },
  );

  assert.equal(isPrismaForeignKeyError(fkError), true);
  assert.equal(isPrismaForeignKeyError(new Error("other")), false);
  assert.equal(
    isPrismaForeignKeyError(
      new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "test",
      }),
    ),
    false,
  );
});

test("valid Free usage snapshot still works (daily, limit 5)", () => {
  const now = new Date("2026-07-28T15:30:00.000Z");
  const snapshot = buildUserUsageSnapshotFromCount("free", 2, now, null);

  assert.equal(snapshot.plan, "free");
  assert.equal(snapshot.period, "daily");
  assert.equal(snapshot.quotaBasis, "utc_day");
  assert.equal(snapshot.limit, getGenerationPolicy("free").maxGenerationsPerPeriod);
  assert.equal(snapshot.limit, 5);
  assert.equal(snapshot.used, 2);
  assert.equal(snapshot.remaining, 3);
  assert.equal(snapshot.resetAt, "2026-07-29T00:00:00.000Z");
});

test("valid Pro billing-period usage snapshot still works", () => {
  const now = new Date("2026-07-28T15:30:00.000Z");
  const periodStart = new Date("2026-07-10T12:00:00.000Z");
  const periodEnd = new Date("2026-08-10T12:00:00.000Z");
  const snapshot = buildUserUsageSnapshotFromCount("pro", 17, now, {
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
  });

  assert.equal(snapshot.plan, "pro");
  assert.equal(snapshot.period, "monthly");
  assert.equal(snapshot.quotaBasis, "provider_billing");
  assert.equal(snapshot.limit, getGenerationPolicy("pro").maxGenerationsPerPeriod);
  assert.equal(snapshot.limit, 100);
  assert.equal(snapshot.used, 17);
  assert.equal(snapshot.remaining, 83);
  assert.equal(snapshot.resetAt, periodEnd.toISOString());
});

test("usage module guards user existence before UserUsage upsert", () => {
  const source = readFileSync("src/lib/usage.ts", "utf8");

  assert.match(source, /ensureUserExistsForUsage/);
  assert.match(source, /stale_session/);
  assert.match(source, /isPrismaForeignKeyError/);
  assert.match(source, /P2003/);

  const ensureIdx = source.indexOf("await ensureUserExistsForUsage(userId)");
  const firstUpsert = source.indexOf("prisma.userUsage.upsert");
  assert.ok(ensureIdx >= 0, "ensureUserExistsForUsage must be called");
  assert.ok(firstUpsert > ensureIdx, "user check must run before first upsert");

  // Both getOrCreateUsage and incrementUsage must guard.
  const ensureCount = (source.match(/await ensureUserExistsForUsage\(userId\)/g) ?? [])
    .length;
  assert.ok(ensureCount >= 2, "both load and increment paths must check user");
});

test("API routes return controlled stale_session / 401, not bare 500", () => {
  const usageRoute = readFileSync("src/app/api/ai/usage/route.ts", "utf8");
  const generateRoute = readFileSync("src/app/api/ai/generate/route.ts", "utf8");

  assert.match(usageRoute, /code:\s*"stale_session"/);
  assert.match(usageRoute, /status:\s*401/);
  // Existing missing-user gate before snapshot.
  assert.match(usageRoute, /if \(!user\)/);

  assert.match(generateRoute, /code:\s*"stale_session"/);
  assert.match(
    generateRoute,
    /error\.code === "stale_session"[\s\S]*?status:\s*401/,
  );
  // Existing missing-user gate before generation work.
  assert.match(generateRoute, /if \(!user\)/);
});

test("protected dashboard and generate pages handle stale_session without crash", () => {
  const dashboard = readFileSync(
    "src/app/(protected)/dashboard/page.tsx",
    "utf8",
  );
  const generate = readFileSync(
    "src/app/(protected)/generate/page.tsx",
    "utf8",
  );

  for (const source of [dashboard, generate]) {
    assert.match(source, /isStaleSessionUsageError/);
    assert.match(source, /clearStaleSessionAndRedirect/);
    assert.match(source, /getUserUsageSnapshot\(session\.id, session\.plan\)/);
  }
});

test("JWT refresh drops identity when User row is missing", () => {
  const authSource = readFileSync("src/auth.ts", "utf8");
  assert.match(authSource, /return \{\}/);
  assert.match(authSource, /User row was deleted|stale session/i);
});
