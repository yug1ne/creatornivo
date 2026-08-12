import assert from "node:assert/strict";
import test from "node:test";

import { getGenerationPolicy } from "../src/config/plans";
import {
  GENERATION_RESERVATION_STATUS,
  GenerationPolicyError,
  getTrialGenerationUsage,
  reserveGeneration,
  type CompletedGenerationInput,
  type FailedGenerationUsage,
  type GenerationReservationStore,
  type GenerationReservationTransaction,
  type ReservationRecord,
} from "../src/lib/generation/usage-service";
import { getTrialPeriodKey, TRIAL_DURATION_MS } from "../src/config/trial";

class TrialReservationStore implements GenerationReservationStore {
  reservations: ReservationRecord[] = [];
  private transactionTail: Promise<void> = Promise.resolve();

  async runSerializable<T>(
    operation: (transaction: GenerationReservationTransaction) => Promise<T>,
  ): Promise<T> {
    const previous = this.transactionTail;
    let release!: () => void;
    this.transactionTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;

    try {
      return await operation({
        findByRequestId: async (userId, requestId) =>
          this.reservations.find(
            (row) => row.userId === userId && row.requestId === requestId,
          ) ?? null,
        countUsed: async (userId, start, end, periodKey) =>
          this.reservations.filter(
            (row) =>
              row.userId === userId &&
              row.createdAt >= start &&
              row.createdAt < end &&
              (!periodKey || row.periodKey === periodKey) &&
              row.status === GENERATION_RESERVATION_STATUS.COMPLETED,
          ).length,
        countRecent: async (userId, since) =>
          this.reservations.filter(
            (row) => row.userId === userId && row.createdAt >= since,
          ).length,
        countActive: async (userId, now) =>
          this.reservations.filter(
            (row) =>
              row.userId === userId &&
              (row.status === GENERATION_RESERVATION_STATUS.RESERVED ||
                row.status === GENERATION_RESERVATION_STATUS.STARTED) &&
              row.expiresAt > now,
          ).length,
        create: async (input) => {
          const row: ReservationRecord = {
            id: `reservation-${this.reservations.length + 1}`,
            ...input,
            status: GENERATION_RESERVATION_STATUS.RESERVED,
            actualInputTokens: null,
            actualOutputTokens: null,
            startedAt: null,
            completedAt: null,
          };
          this.reservations.push(row);
          return row;
        },
      });
    } finally {
      release();
    }
  }

  async markStarted(userId: string, requestId: string, now: Date) {
    const row = this.find(userId, requestId);
    row.status = GENERATION_RESERVATION_STATUS.STARTED;
    row.startedAt = now;
  }

  async complete(
    userId: string,
    requestId: string,
    generation: CompletedGenerationInput,
    now: Date,
  ) {
    const row = this.find(userId, requestId);
    row.status = GENERATION_RESERVATION_STATUS.COMPLETED;
    row.actualInputTokens = generation.inputTokens;
    row.actualOutputTokens = generation.outputTokens;
    row.completedAt = now;
  }

  async fail(
    userId: string,
    requestId: string,
    usage: FailedGenerationUsage,
    now: Date,
  ) {
    const row = this.find(userId, requestId);
    row.status = GENERATION_RESERVATION_STATUS.FAILED;
    row.actualInputTokens = usage.inputTokens ?? null;
    row.actualOutputTokens = usage.outputTokens ?? null;
    row.completedAt = now;
  }

  async countUsed(userId: string, start: Date, end: Date, periodKey?: string) {
    return this.reservations.filter(
      (row) =>
        row.userId === userId &&
        row.createdAt >= start &&
        row.createdAt < end &&
        (!periodKey || row.periodKey === periodKey) &&
        row.status === GENERATION_RESERVATION_STATUS.COMPLETED,
    ).length;
  }

  addCompleted(input: {
    userId: string;
    requestId: string;
    createdAt: Date;
    periodKey: string;
  }) {
    const policy = getGenerationPolicy("free");
    this.reservations.push({
      id: `reservation-${this.reservations.length + 1}`,
      userId: input.userId,
      requestId: input.requestId,
      plan: "free",
      periodKey: input.periodKey,
      status: GENERATION_RESERVATION_STATUS.COMPLETED,
      model: policy.model,
      estimatedMaxOutputTokens: policy.maxOutputTokens,
      actualInputTokens: 10,
      actualOutputTokens: 20,
      createdAt: input.createdAt,
      startedAt: input.createdAt,
      completedAt: input.createdAt,
      expiresAt: new Date(input.createdAt.getTime() + 10 * 60_000),
    });
  }

  private find(userId: string, requestId: string): ReservationRecord {
    const row = this.reservations.find(
      (candidate) =>
        candidate.userId === userId && candidate.requestId === requestId,
    );
    assert.ok(row);
    return row;
  }
}

const startedAt = new Date("2026-08-12T10:00:00.000Z");
const endsAt = new Date(startedAt.getTime() + TRIAL_DURATION_MS);
const trialPeriod = { startedAt, endsAt };

const completion: CompletedGenerationInput = {
  userId: "trial-user",
  templateId: "template-1",
  prompt: "Prompt",
  result: "Result",
  model: getGenerationPolicy("free").model,
  inputTokens: 10,
  outputTokens: 20,
};

test("trial reservations keep Free model/rate/concurrency policy and exact scope", async () => {
  const store = new TrialReservationStore();
  const reservation = await reserveGeneration(
    {
      requestId: "trial-1",
      userId: "trial-user",
      plan: "free",
      now: startedAt,
      templateSlug: "linkedin-post",
      trialPeriod,
    },
    store,
  );

  const freePolicy = getGenerationPolicy("free");
  assert.equal(reservation.plan, "free");
  assert.equal(reservation.model, freePolicy.model);
  assert.equal(reservation.estimatedMaxOutputTokens, 1000);
  assert.equal(reservation.periodKey, getTrialPeriodKey(startedAt));
  assert.equal(freePolicy.requestsPerMinute, 1);
  assert.equal(freePolicy.maxConcurrentGenerations, 1);
  assert.equal(freePolicy.maxInputChars, 8000);
});

test("normal Free daily completions do not consume trial quota", async () => {
  const store = new TrialReservationStore();
  store.addCompleted({
    userId: "trial-user",
    requestId: "free-before-trial",
    createdAt: new Date(startedAt.getTime() + 1_000),
    periodKey: "2026-08-12",
  });

  const usage = await getTrialGenerationUsage(
    "trial-user",
    startedAt,
    endsAt,
    store,
  );
  assert.equal(usage.used, 0);
  assert.equal(usage.limit, 30);
  assert.equal(usage.period, "trial");
  assert.equal(usage.periodKey, getTrialPeriodKey(startedAt));
});

test("only completed reservations consume the 30-generation trial quota", async () => {
  const store = new TrialReservationStore();
  const failedAt = new Date(startedAt.getTime() + 61_000);
  await reserveGeneration(
    {
      requestId: "failed",
      userId: "trial-user",
      plan: "free",
      now: failedAt,
      trialPeriod,
    },
    store,
  );
  await store.markStarted("trial-user", "failed", failedAt);
  await store.fail("trial-user", "failed", { inputTokens: 2 }, failedAt);

  let usage = await getTrialGenerationUsage(
    "trial-user",
    startedAt,
    endsAt,
    store,
  );
  assert.equal(usage.used, 0);

  const completedAt = new Date(failedAt.getTime() + 61_000);
  await reserveGeneration(
    {
      requestId: "completed",
      userId: "trial-user",
      plan: "free",
      now: completedAt,
      trialPeriod,
    },
    store,
  );
  await store.markStarted("trial-user", "completed", completedAt);
  await store.complete("trial-user", "completed", completion, completedAt);

  usage = await getTrialGenerationUsage(
    "trial-user",
    startedAt,
    endsAt,
    store,
  );
  assert.equal(usage.used, 1);
});

test("trial quota is concurrency-safe at the final available slot", async () => {
  const store = new TrialReservationStore();
  const periodKey = getTrialPeriodKey(startedAt);
  for (let index = 0; index < 29; index += 1) {
    store.addCompleted({
      userId: "trial-user",
      requestId: `completed-${index}`,
      createdAt: new Date(startedAt.getTime() + index * 61_000),
      periodKey,
    });
  }

  const now = new Date(startedAt.getTime() + 40 * 61_000);
  const results = await Promise.allSettled([
    reserveGeneration(
      {
        requestId: "parallel-a",
        userId: "trial-user",
        plan: "free",
        now,
        trialPeriod,
      },
      store,
    ),
    reserveGeneration(
      {
        requestId: "parallel-b",
        userId: "trial-user",
        plan: "free",
        now,
        trialPeriod,
      },
      store,
    ),
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const rejected = results.find((result) => result.status === "rejected");
  assert.ok(rejected && rejected.status === "rejected");
  assert.ok(rejected.reason instanceof GenerationPolicyError);
  assert.equal(rejected.reason.code, "quota");
});

test("an expired trial window cannot reserve generation", async () => {
  const store = new TrialReservationStore();
  await assert.rejects(
    () =>
      reserveGeneration(
        {
          requestId: "expired",
          userId: "trial-user",
          plan: "free",
          now: endsAt,
          trialPeriod,
        },
        store,
      ),
    (error) =>
      error instanceof GenerationPolicyError && error.code === "trial_expired",
  );
  assert.equal(store.reservations.length, 0);
});
