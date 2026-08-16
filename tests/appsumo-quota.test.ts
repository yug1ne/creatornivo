import assert from "node:assert/strict";
import test from "node:test";

import { getAppSumoPeriodKey } from "../src/config/appsumo";
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
