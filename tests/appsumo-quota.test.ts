import assert from "node:assert/strict";
import test from "node:test";

import {
  APPSUMO_TIER1_GENERATION_LIMIT,
  APPSUMO_TIER2_GENERATION_LIMIT,
  getAppSumoPeriodKey,
} from "../src/config/appsumo";
import { resolveUserAccess } from "../src/lib/trial/access";
import {
  reserveGeneration,
  type GenerationReservationStore,
  type GenerationReservationTransaction,
} from "../src/lib/generation/usage-service";

class MemoryStore implements GenerationReservationStore {
  reservations: Array<{
    userId: string;
    requestId: string;
    plan: string;
    periodKey: string;
    status: string;
    model: string;
  }> = [];

  async runSerializable<T>(
    operation: (transaction: GenerationReservationTransaction) => Promise<T>,
  ): Promise<T> {
    const reservations = this.reservations;
    return operation({
      async findByRequestId(userId, requestId) {
        return (
          (reservations.find(
            (row) => row.userId === userId && row.requestId === requestId,
          ) as never) ?? null
        );
      },
      async countUsed(userId, _start, _end, periodKey) {
        return reservations.filter(
          (row) =>
            row.userId === userId &&
            row.periodKey === periodKey &&
            row.status === "completed",
        ).length;
      },
      async countRecent() {
        return 0;
      },
      async countActive() {
        return 0;
      },
      async create(input) {
        const row = {
          ...input,
          status: "reserved",
          id: `res-${reservations.length + 1}`,
          actualInputTokens: null,
          actualOutputTokens: null,
          startedAt: null,
          completedAt: null,
        };
        reservations.push(row);
        return row as never;
      },
    });
  }

  async markStarted() {}
  async complete() {}
  async fail() {}
  async countUsed(userId: string, start: Date, end: Date, periodKey?: string) {
    return this.reservations.filter(
      (row) =>
        row.userId === userId &&
        row.periodKey === periodKey &&
        row.status === "completed",
    ).length;
  }
}

test("AppSumo reservations use appsumo:YYYY-MM and Luna, not Pro YYYY-MM", async () => {
  const store = new MemoryStore();
  const now = new Date("2026-09-16T15:00:00.000Z");
  const periodKey = getAppSumoPeriodKey(now);

  await reserveGeneration(
    {
      requestId: "11111111-1111-4111-8111-111111111111",
      userId: "user-1",
      plan: "free",
      now,
      appsumoPeriod: {
        start: new Date("2026-09-01T00:00:00.000Z"),
        end: new Date("2026-10-01T00:00:00.000Z"),
        periodKey,
        limit: 50,
      },
      policyOverride: {
        model: "gpt-5.6-luna",
        requestsPerMinute: 3,
        maxConcurrentGenerations: 1,
      },
    },
    store,
  );

  assert.equal(store.reservations[0]?.periodKey, "appsumo:2026-09");
  assert.equal(store.reservations[0]?.model, "gpt-5.6-luna");
  assert.equal(store.reservations[0]?.plan, "free");
  assert.notEqual(store.reservations[0]?.periodKey, "2026-09");
});

test("Tier 1 to Tier 2 keeps appsumo:YYYY-MM usage and raises only the limit", async () => {
  const now = new Date("2026-08-16T15:00:00.000Z");
  const user = {
    plan: "free" as const,
    emailVerified: now,
    trialStartedAt: null,
    trialEndsAt: null,
  };
  const t1 = resolveUserAccess(user, { now, activeAppSumoCodeCount: 1 });
  const t2 = resolveUserAccess(user, { now, activeAppSumoCodeCount: 2 });

  assert.equal(t1.mode, "appsumo_t1");
  assert.equal(t2.mode, "appsumo_t2");
  assert.equal(t1.quota.periodKey, "appsumo:2026-08");
  assert.equal(t2.quota.periodKey, t1.quota.periodKey);
  assert.equal(t1.quota.limit, APPSUMO_TIER1_GENERATION_LIMIT);
  assert.equal(t2.quota.limit, APPSUMO_TIER2_GENERATION_LIMIT);

  const store = new MemoryStore();
  const periodKey = t1.quota.periodKey;
  for (let i = 0; i < 17; i += 1) {
    store.reservations.push({
      userId: "user-1",
      requestId: `done-${i}`,
      plan: "free",
      periodKey,
      status: "completed",
      model: "gpt-5.6-luna",
    });
  }

  const usedBefore = await store.countUsed(
    "user-1",
    t1.quota.startsAt,
    t1.quota.endsAt,
    periodKey,
  );
  assert.equal(usedBefore, 17);

  await reserveGeneration(
    {
      requestId: "11111111-1111-4111-8111-111111111113",
      userId: "user-1",
      plan: "free",
      now,
      appsumoPeriod: {
        start: t2.quota.startsAt,
        end: t2.quota.endsAt,
        periodKey: t2.quota.periodKey,
        limit: t2.quota.limit,
      },
      policyOverride: {
        model: "gpt-5.6-luna",
        requestsPerMinute: 3,
        maxConcurrentGenerations: 1,
      },
    },
    store,
  );

  const usedAfter = await store.countUsed(
    "user-1",
    t2.quota.startsAt,
    t2.quota.endsAt,
    periodKey,
  );
  assert.equal(usedAfter, 17);
  assert.equal(store.reservations.at(-1)?.periodKey, "appsumo:2026-08");
  assert.equal(store.reservations.at(-1)?.plan, "free");
  assert.equal(17, t2.quota.limit - 83);
});

test("T2 to T1 mid-month blocks when more than 50 AppSumo completions exist", async () => {
  const store = new MemoryStore();
  const now = new Date("2026-09-16T15:00:00.000Z");
  const periodKey = getAppSumoPeriodKey(now);
  for (let i = 0; i < 51; i += 1) {
    store.reservations.push({
      userId: "user-1",
      requestId: `done-${i}`,
      plan: "free",
      periodKey,
      status: "completed",
      model: "gpt-5.6-luna",
    });
  }

  await assert.rejects(
    () =>
      reserveGeneration(
        {
          requestId: "11111111-1111-4111-8111-111111111112",
          userId: "user-1",
          plan: "free",
          now,
          appsumoPeriod: {
            start: new Date("2026-09-01T00:00:00.000Z"),
            end: new Date("2026-10-01T00:00:00.000Z"),
            periodKey,
            limit: 50,
          },
        },
        store,
      ),
    /AppSumo monthly generation limit/,
  );
});
