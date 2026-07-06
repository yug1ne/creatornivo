import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { Prisma } from "@prisma/client";

import { generationPolicies, getGenerationPolicy, type Plan } from "../src/config/plans";
import {
  parseGenerationRequestBody,
  POST,
  requireGenerationRequestId,
} from "../src/app/api/ai/generate/route";
import {
  acquireGenerationAttempt,
  fetchGenerationUsageSnapshot,
} from "../src/components/generate/generate-workspace";
import { isAIProviderConfigured } from "../src/lib/ai/provider";
import {
  GENERATION_RESERVATION_STATUS,
  GENERATION_RESERVATION_TTL_MS,
  GENERATION_TRANSACTION_ISOLATION_LEVEL,
  GENERATION_TRANSACTION_MAX_ATTEMPTS,
  GenerationPolicyError,
  getGenerationPeriodWindow,
  getGenerationUsage,
  reserveGeneration,
  runWithSerializationRetry,
  validateUserInput,
  type CompletedGenerationInput,
  type FailedGenerationUsage,
  type GenerationReservationStore,
  type GenerationReservationTransaction,
  type ReservationRecord,
} from "../src/lib/generation/usage-service";

interface StoredGeneration extends CompletedGenerationInput {
  requestId: string;
}

class MemoryReservationStore implements GenerationReservationStore {
  reservations: ReservationRecord[] = [];
  generations: StoredGeneration[] = [];
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
            (reservation) =>
              reservation.userId === userId &&
              reservation.requestId === requestId,
          ) ?? null,
        countUsed: async (userId, start, end) =>
          this.reservations.filter(
            (reservation) =>
              reservation.userId === userId &&
              reservation.createdAt >= start &&
              reservation.createdAt < end &&
              (reservation.status ===
                GENERATION_RESERVATION_STATUS.COMPLETED ||
                reservation.startedAt !== null),
          ).length,
        countRecent: async (userId, since) =>
          this.reservations.filter(
            (reservation) =>
              reservation.userId === userId &&
              reservation.createdAt >= since,
          ).length,
        countActive: async (userId, now) =>
          this.reservations.filter(
            (reservation) =>
              reservation.userId === userId &&
              (reservation.status ===
                GENERATION_RESERVATION_STATUS.RESERVED ||
                reservation.status ===
                  GENERATION_RESERVATION_STATUS.STARTED) &&
              reservation.expiresAt > now,
          ).length,
        create: async (input) => {
          if (
            this.reservations.some(
              (reservation) =>
                reservation.userId === input.userId &&
                reservation.requestId === input.requestId,
            )
          ) {
            throw new Error("Unique requestId violation");
          }

          const reservation: ReservationRecord = {
            id: `reservation-${this.reservations.length + 1}`,
            ...input,
            status: GENERATION_RESERVATION_STATUS.RESERVED,
            actualInputTokens: null,
            actualOutputTokens: null,
            startedAt: null,
            completedAt: null,
          };
          this.reservations.push(reservation);
          return reservation;
        },
      });
    } finally {
      release();
    }
  }

  async markStarted(
    userId: string,
    requestId: string,
    now: Date,
  ): Promise<void> {
    const reservation = this.find(userId, requestId);
    assert.equal(
      reservation.status,
      GENERATION_RESERVATION_STATUS.RESERVED,
    );
    reservation.status = GENERATION_RESERVATION_STATUS.STARTED;
    reservation.startedAt = now;
  }

  async complete(
    userId: string,
    requestId: string,
    generation: CompletedGenerationInput,
    now: Date,
  ): Promise<void> {
    const reservation = this.find(userId, requestId);
    if (reservation.status === GENERATION_RESERVATION_STATUS.COMPLETED) return;

    this.generations.push({ requestId, ...generation });
    reservation.status = GENERATION_RESERVATION_STATUS.COMPLETED;
    reservation.actualInputTokens = generation.inputTokens;
    reservation.actualOutputTokens = generation.outputTokens;
    reservation.completedAt = now;
  }

  async fail(
    userId: string,
    requestId: string,
    usage: FailedGenerationUsage,
    now: Date,
  ): Promise<void> {
    const reservation = this.find(userId, requestId);
    if (reservation.status === GENERATION_RESERVATION_STATUS.COMPLETED) return;

    reservation.status = GENERATION_RESERVATION_STATUS.FAILED;
    reservation.actualInputTokens =
      usage.inputTokens ?? reservation.actualInputTokens;
    reservation.actualOutputTokens =
      usage.outputTokens ?? reservation.actualOutputTokens;
    reservation.completedAt = now;
  }

  async countUsed(userId: string, start: Date, end: Date): Promise<number> {
    return this.reservations.filter(
      (reservation) =>
        reservation.userId === userId &&
        reservation.createdAt >= start &&
        reservation.createdAt < end &&
        (reservation.status === GENERATION_RESERVATION_STATUS.COMPLETED ||
          reservation.startedAt !== null),
    ).length;
  }

  seed(input: {
    requestId: string;
    userId?: string;
    plan?: Plan;
    status?: string;
    createdAt: Date;
    startedAt?: Date | null;
    expiresAt?: Date;
  }): ReservationRecord {
    const plan = input.plan ?? "free";
    const policy = getGenerationPolicy(plan);
    const reservation: ReservationRecord = {
      id: `reservation-${this.reservations.length + 1}`,
      requestId: input.requestId,
      userId: input.userId ?? "user-1",
      plan,
      periodKey: getGenerationPeriodWindow(plan, input.createdAt).key,
      status: input.status ?? GENERATION_RESERVATION_STATUS.COMPLETED,
      model: policy.model,
      estimatedMaxOutputTokens: policy.maxOutputTokens,
      actualInputTokens: null,
      actualOutputTokens: null,
      createdAt: input.createdAt,
      startedAt:
        input.startedAt === undefined ? input.createdAt : input.startedAt,
      completedAt: input.createdAt,
      expiresAt:
        input.expiresAt ??
        new Date(input.createdAt.getTime() + GENERATION_RESERVATION_TTL_MS),
    };
    this.reservations.push(reservation);
    return reservation;
  }

  private find(userId: string, requestId: string): ReservationRecord {
    const reservation = this.reservations.find(
      (candidate) =>
        candidate.userId === userId && candidate.requestId === requestId,
    );
    assert.ok(reservation, `Missing reservation ${requestId}`);
    return reservation;
  }
}

const generation = (
  overrides: Partial<CompletedGenerationInput> = {},
): CompletedGenerationInput => ({
  userId: "user-1",
  templateId: "template-1",
  prompt: "Prompt",
  result: "Result",
  model: "gpt-4o-mini",
  inputTokens: 12,
  outputTokens: 34,
  ...overrides,
});

async function finishReservation(
  store: MemoryReservationStore,
  requestId: string,
  now: Date,
): Promise<void> {
  await store.markStarted("user-1", requestId, now);
  await store.complete("user-1", requestId, generation(), now);
}

async function expectPolicyError(
  action: () => Promise<unknown>,
  code: GenerationPolicyError["code"],
  message?: string,
): Promise<GenerationPolicyError> {
  try {
    await action();
  } catch (error) {
    assert.ok(error instanceof GenerationPolicyError);
    assert.equal(error.code, code);
    if (message) assert.equal(error.message, message);
    return error;
  }
  assert.fail(`Expected GenerationPolicyError: ${code}`);
}

function serializationConflict(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    "Serializable transaction conflict",
    {
      code: "P2034",
      clientVersion: "test",
    },
  );
}

test("Free policy has the required server-owned limits", () => {
  assert.deepEqual(generationPolicies.free, {
    model: "gpt-4o-mini",
    maxGenerationsPerPeriod: 5,
    period: "day",
    maxOutputTokens: 1000,
    maxInputChars: 8000,
    requestsPerMinute: 1,
    maxConcurrentGenerations: 1,
  });
});

test("Pro policy has the required server-owned limits", () => {
  assert.deepEqual(generationPolicies.pro, {
    model: "gpt-4o",
    maxGenerationsPerPeriod: 100,
    period: "month",
    maxOutputTokens: 2000,
    maxInputChars: 12000,
    requestsPerMinute: 5,
    maxConcurrentGenerations: 1,
  });
});

test("Free requests 1 through 5 are allowed", async () => {
  const store = new MemoryReservationStore();
  const start = new Date("2026-07-03T00:00:00.000Z");

  for (let index = 0; index < 5; index += 1) {
    const now = new Date(start.getTime() + index * 61_000);
    const requestId = `free-${index + 1}`;
    await reserveGeneration(
      { requestId, userId: "user-1", plan: "free", now },
      store,
    );
    await finishReservation(store, requestId, now);
  }

  assert.equal(store.reservations.length, 5);
});

test("Free sixth request is rejected before provider invocation", async () => {
  const store = new MemoryReservationStore();
  const start = new Date("2026-07-03T00:00:00.000Z");

  for (let index = 0; index < 5; index += 1) {
    store.seed({
      requestId: `free-completed-${index}`,
      createdAt: new Date(start.getTime() + index * 61_000),
    });
  }

  const error = await expectPolicyError(
    () =>
      reserveGeneration(
        {
          requestId: "free-sixth",
          userId: "user-1",
          plan: "free",
          now: new Date(start.getTime() + 10 * 61_000),
        },
        store,
      ),
    "quota",
    "You’ve reached today’s free generation limit.",
  );
  assert.equal(error.status, 429);
});

test("Pro requests 1 through 100 are allowed", async () => {
  const store = new MemoryReservationStore();
  const start = new Date("2026-07-01T00:00:00.000Z");

  for (let index = 0; index < 100; index += 1) {
    const now = new Date(start.getTime() + index * 61_000);
    const requestId = `pro-${index + 1}`;
    await reserveGeneration(
      { requestId, userId: "user-1", plan: "pro", now },
      store,
    );
    await finishReservation(store, requestId, now);
  }

  assert.equal(store.reservations.length, 100);
});

test("Pro request 101 is rejected before provider invocation", async () => {
  const store = new MemoryReservationStore();
  const start = new Date("2026-07-01T00:00:00.000Z");

  for (let index = 0; index < 100; index += 1) {
    store.seed({
      requestId: `pro-completed-${index}`,
      plan: "pro",
      createdAt: new Date(start.getTime() + index * 61_000),
    });
  }

  await expectPolicyError(
    () =>
      reserveGeneration(
        {
          requestId: "pro-101",
          userId: "user-1",
          plan: "pro",
          now: new Date(start.getTime() + 200 * 61_000),
        },
        store,
      ),
    "quota",
    "You’ve reached your monthly generation limit.",
  );
});

test("serialized in-memory reservations cannot both become active", async () => {
  const store = new MemoryReservationStore();
  const now = new Date("2026-07-03T10:00:00.000Z");
  const results = await Promise.allSettled([
    reserveGeneration(
      { requestId: "parallel-1", userId: "user-1", plan: "pro", now },
      store,
    ),
    reserveGeneration(
      { requestId: "parallel-2", userId: "user-1", plan: "pro", now },
      store,
    ),
  ]);

  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  const rejected = results.find((result) => result.status === "rejected");
  assert.ok(rejected && rejected.status === "rejected");
  assert.ok(rejected.reason instanceof GenerationPolicyError);
  assert.equal(rejected.reason.code, "concurrent");
  assert.equal(rejected.reason.message, "A generation is already in progress.");
});

test("production reservation transactions request Serializable isolation", () => {
  assert.equal(
    GENERATION_TRANSACTION_ISOLATION_LEVEL,
    Prisma.TransactionIsolationLevel.Serializable,
  );
});

test("P2034 retries the serializable operation", async () => {
  let attempts = 0;
  const result = await runWithSerializationRetry(async () => {
    attempts += 1;
    if (attempts < 3) throw serializationConflict();
    return "reserved";
  });

  assert.equal(result, "reserved");
  assert.equal(attempts, 3);
});

test("maximum P2034 retries fail without creating a reservation", async () => {
  let attempts = 0;
  let reservationsCreated = 0;

  await assert.rejects(
    () =>
      runWithSerializationRetry(async () => {
        attempts += 1;
        if (attempts <= GENERATION_TRANSACTION_MAX_ATTEMPTS) {
          throw serializationConflict();
        }
        reservationsCreated += 1;
        return "reserved";
      }),
    (error) =>
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034",
  );

  assert.equal(attempts, GENERATION_TRANSACTION_MAX_ATTEMPTS);
  assert.equal(reservationsCreated, 0);
});

test("active duplicate requestId does not invoke the provider twice", async () => {
  const store = new MemoryReservationStore();
  const now = new Date("2026-07-03T10:00:00.000Z");
  let providerCalls = 0;

  const invoke = async () => {
    await reserveGeneration(
      { requestId: "same-request", userId: "user-1", plan: "pro", now },
      store,
    );
    providerCalls += 1;
  };

  await invoke();
  await expectPolicyError(invoke, "generation_in_progress");
  assert.equal(providerCalls, 1);
});

test("completed duplicate requestId does not invoke the provider twice", async () => {
  const store = new MemoryReservationStore();
  const now = new Date("2026-07-03T10:00:00.000Z");
  let providerCalls = 0;

  await reserveGeneration(
    { requestId: "completed-request", userId: "user-1", plan: "pro", now },
    store,
  );
  providerCalls += 1;
  await finishReservation(store, "completed-request", now);

  await expectPolicyError(
    () =>
      reserveGeneration(
        {
          requestId: "completed-request",
          userId: "user-1",
          plan: "pro",
          now,
        },
        store,
      ),
    "generation_already_completed",
  );
  assert.equal(providerCalls, 1);
});

test("failed duplicate requestId is rejected without a second provider call", async () => {
  const store = new MemoryReservationStore();
  const now = new Date("2026-07-03T10:00:00.000Z");
  let providerCalls = 0;

  await reserveGeneration(
    { requestId: "failed-request", userId: "user-1", plan: "pro", now },
    store,
  );
  await store.fail("user-1", "failed-request", {}, now);

  await expectPolicyError(
    async () => {
      await reserveGeneration(
        {
          requestId: "failed-request",
          userId: "user-1",
          plan: "pro",
          now,
        },
        store,
      );
      providerCalls += 1;
    },
    "generation_request_failed",
  );
  assert.equal(providerCalls, 0);
});

test("the same requestId is allowed for a different user", async () => {
  const store = new MemoryReservationStore();
  const now = new Date("2026-07-03T10:00:00.000Z");

  await reserveGeneration(
    { requestId: "shared-request", userId: "user-1", plan: "pro", now },
    store,
  );
  await assert.doesNotReject(() =>
    reserveGeneration(
      { requestId: "shared-request", userId: "user-2", plan: "pro", now },
      store,
    ),
  );

  assert.equal(store.reservations.length, 2);
});

test("Free rate limit rejects a second request inside one minute", async () => {
  const store = new MemoryReservationStore();
  const first = new Date("2026-07-03T10:00:00.000Z");
  await reserveGeneration(
    { requestId: "rate-free-1", userId: "user-1", plan: "free", now: first },
    store,
  );
  await finishReservation(store, "rate-free-1", first);

  await expectPolicyError(
    () =>
      reserveGeneration(
        {
          requestId: "rate-free-2",
          userId: "user-1",
          plan: "free",
          now: new Date(first.getTime() + 59_999),
        },
        store,
      ),
    "rate_limit",
    "Too many requests. Please wait and try again.",
  );
});

test("Pro rate limit rejects request 6 inside one minute", async () => {
  const store = new MemoryReservationStore();
  const start = new Date("2026-07-03T10:00:00.000Z");

  for (let index = 0; index < 5; index += 1) {
    const now = new Date(start.getTime() + index * 1_000);
    const requestId = `rate-pro-${index + 1}`;
    await reserveGeneration(
      { requestId, userId: "user-1", plan: "pro", now },
      store,
    );
    await finishReservation(store, requestId, now);
  }

  await expectPolicyError(
    () =>
      reserveGeneration(
        {
          requestId: "rate-pro-6",
          userId: "user-1",
          plan: "pro",
          now: new Date(start.getTime() + 5_000),
        },
        store,
      ),
    "rate_limit",
  );
});

test("direct API request without a session is rejected", async () => {
  const response = await POST(
    new Request("http://localhost/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: "template-1", values: {} }),
    }),
  );
  assert.equal(response.status, 401);
});

test("missing requestId maps to HTTP 400", () => {
  assert.throws(
    () => requireGenerationRequestId(undefined),
    (error) =>
      error instanceof GenerationPolicyError &&
      error.status === 400 &&
      error.code === "invalid_request",
  );
});

test("invalid requestId maps to HTTP 400", () => {
  assert.throws(
    () => requireGenerationRequestId("not-a-uuid"),
    (error) =>
      error instanceof GenerationPolicyError &&
      error.status === 400 &&
      error.code === "invalid_request",
  );
});

test("server route has no requestId fallback UUID", () => {
  const routeSource = readFileSync(
    "src/app/api/ai/generate/route.ts",
    "utf8",
  );

  assert.doesNotMatch(routeSource, /randomUUID/);
  assert.match(
    routeSource,
    /requestId = requireGenerationRequestId\(suppliedRequestId\)/,
  );
});

test("two fast client launches acquire one stable requestId", () => {
  let generatedIds = 0;
  const createRequestId = () => {
    generatedIds += 1;
    return "request-1";
  };

  const firstRequestId = acquireGenerationAttempt(
    null,
    false,
    createRequestId,
  );
  const secondRequestId = acquireGenerationAttempt(
    firstRequestId,
    true,
    createRequestId,
  );

  assert.equal(firstRequestId, "request-1");
  assert.equal(secondRequestId, null);
  assert.equal(generatedIds, 1);
});

test("network retry reuses the existing client requestId", () => {
  let generatedIds = 0;
  const createRequestId = () => {
    generatedIds += 1;
    return `request-${generatedIds}`;
  };

  const firstRequestId = acquireGenerationAttempt(
    null,
    false,
    createRequestId,
  );
  const retryRequestId = acquireGenerationAttempt(
    firstRequestId,
    false,
    createRequestId,
  );

  assert.equal(retryRequestId, firstRequestId);
  assert.equal(generatedIds, 1);
});

test("missing OpenAI API key disables generation before reservation", () => {
  assert.equal(isAIProviderConfigured(""), false);
  assert.equal(isAIProviderConfigured("   "), false);

  const routeSource = readFileSync(
    "src/app/api/ai/generate/route.ts",
    "utf8",
  );
  const configurationCheck = routeSource.indexOf(
    "if (!isAIProviderConfigured())",
  );
  const usageCheck = routeSource.indexOf(
    "await getRemainingGenerations(userId, user.plan)",
  );
  const reservation = routeSource.indexOf("await reserveGeneration");

  assert.ok(configurationCheck >= 0);
  assert.ok(usageCheck > configurationCheck);
  assert.ok(reservation > usageCheck);
  assert.match(routeSource, /code: "generation_disabled"/);
  assert.match(routeSource, /await incrementUsage\(userId, getUsagePeriodForPlan/);
});

test("successful generation usage is reconciled from the server", async () => {
  const usage = await fetchGenerationUsageSnapshot(async () =>
    Response.json({
      plan: "free",
      remaining: 1,
      limit: 5,
      period: "daily",
      resetAt: "2026-07-07T00:00:00.000Z",
    }),
  );

  assert.deepEqual(usage, {
    plan: "free",
    remaining: 1,
    limit: 5,
    period: "daily",
    resetAt: "2026-07-07T00:00:00.000Z",
    used: 4,
  });
});

test("client usage has no optimistic generation increment", () => {
  const workspaceSource = readFileSync(
    "src/components/generate/generate-workspace.tsx",
    "utf8",
  );

  assert.doesNotMatch(workspaceSource, /setGenerationsUsed/);
  assert.doesNotMatch(workspaceSource, /setGenerationUsage\s*\(\s*\(/);
  assert.match(workspaceSource, /fetchGenerationUsageSnapshot/);
  assert.match(workspaceSource, /setGenerationUsage\(usage\)/);
});

test("client-supplied plan is ignored while parsing the request", () => {
  const parsed = parseGenerationRequestBody({
    requestId: "request",
    templateId: "template",
    values: { topic: "safe" },
    plan: "pro",
  });
  assert.equal("plan" in parsed, false);
});

test("client-supplied model and max tokens are ignored", () => {
  const parsed = parseGenerationRequestBody({
    templateId: "template",
    values: { topic: "safe" },
    model: "expensive-model",
    maxTokens: 1_000_000,
    maxOutputTokens: 1_000_000,
  });
  assert.equal("model" in parsed, false);
  assert.equal("maxTokens" in parsed, false);
  assert.equal("maxOutputTokens" in parsed, false);
});

test("Free accepts exactly 8000 characters of user input", () => {
  assert.doesNotThrow(() =>
    validateUserInput("free", { topic: "x".repeat(8000) }),
  );
});

test("Free rejects more than 8000 characters of user input", () => {
  assert.throws(
    () => validateUserInput("free", { topic: "x".repeat(8001) }),
    (error) =>
      error instanceof GenerationPolicyError &&
      error.code === "input_too_long",
  );
});

test("Pro accepts exactly 12000 characters of user input", () => {
  assert.doesNotThrow(() =>
    validateUserInput("pro", { topic: "x".repeat(12000) }),
  );
});

test("Pro rejects more than 12000 characters of user input", () => {
  assert.throws(
    () => validateUserInput("pro", { topic: "x".repeat(12001) }),
    (error) =>
      error instanceof GenerationPolicyError &&
      error.code === "input_too_long",
  );
});

test("non-string input fields are rejected before provider invocation", () => {
  assert.throws(
    () => validateUserInput("free", { topic: 123 }),
    GenerationPolicyError,
  );
});

test("validation error does not create usage", async () => {
  const store = new MemoryReservationStore();
  const now = new Date("2026-07-03T10:00:00.000Z");

  assert.throws(
    () => validateUserInput("free", { topic: "x".repeat(8001) }),
    GenerationPolicyError,
  );

  const usage = await getGenerationUsage("user-1", "free", now, store);
  assert.equal(usage.used, 0);
  assert.equal(store.reservations.length, 0);
});

test("failure before provider start releases quota", async () => {
  const store = new MemoryReservationStore();
  const start = new Date("2026-07-03T00:00:00.000Z");
  await reserveGeneration(
    {
      requestId: "pre-start-failure",
      userId: "user-1",
      plan: "free",
      now: start,
    },
    store,
  );
  await store.fail("user-1", "pre-start-failure", {}, start);

  for (let index = 0; index < 5; index += 1) {
    const now = new Date(start.getTime() + (index + 1) * 61_000);
    const requestId = `after-failure-${index}`;
    await reserveGeneration(
      { requestId, userId: "user-1", plan: "free", now },
      store,
    );
    await finishReservation(store, requestId, now);
  }

  const usage = await getGenerationUsage("user-1", "free", start, store);
  assert.equal(usage.used, 5);
});

test("multiple failures before provider start do not increase usage", async () => {
  const store = new MemoryReservationStore();
  const start = new Date("2026-07-03T01:00:00.000Z");

  for (let index = 0; index < 4; index += 1) {
    const now = new Date(start.getTime() + index * 61_000);
    const requestId = `failed-before-start-${index}`;
    await reserveGeneration(
      { requestId, userId: "user-1", plan: "free", now },
      store,
    );
    await store.fail("user-1", requestId, {}, now);
  }

  const usage = await getGenerationUsage("user-1", "free", start, store);
  assert.equal(usage.used, 0);
});

test("failure after provider start consumes quota", async () => {
  const store = new MemoryReservationStore();
  const start = new Date("2026-07-03T00:00:00.000Z");
  await reserveGeneration(
    {
      requestId: "post-start-failure",
      userId: "user-1",
      plan: "free",
      now: start,
    },
    store,
  );
  await store.markStarted("user-1", "post-start-failure", start);
  await store.fail(
    "user-1",
    "post-start-failure",
    { inputTokens: 15 },
    start,
  );

  for (let index = 0; index < 4; index += 1) {
    store.seed({
      requestId: `successful-${index}`,
      createdAt: new Date(start.getTime() + (index + 1) * 61_000),
    });
  }

  await expectPolicyError(
    () =>
      reserveGeneration(
        {
          requestId: "over-quota",
          userId: "user-1",
          plan: "free",
          now: new Date(start.getTime() + 10 * 61_000),
        },
        store,
      ),
    "quota",
  );
});

test("expired reservation is retained but no longer blocks the user", async () => {
  const store = new MemoryReservationStore();
  const now = new Date("2026-07-03T10:00:00.000Z");
  store.seed({
    requestId: "expired",
    status: GENERATION_RESERVATION_STATUS.RESERVED,
    createdAt: new Date(now.getTime() - 11 * 60_000),
    startedAt: null,
    expiresAt: new Date(now.getTime() - 60_000),
  });

  await assert.doesNotReject(() =>
    reserveGeneration(
      { requestId: "after-expiry", userId: "user-1", plan: "free", now },
      store,
    ),
  );
  assert.equal(store.reservations.length, 2);

  const usage = await getGenerationUsage("user-1", "free", now, store);
  assert.equal(usage.used, 0);
});

test("expired started reservation still consumes quota", async () => {
  const store = new MemoryReservationStore();
  const now = new Date("2026-07-03T10:00:00.000Z");
  const startedAt = new Date(now.getTime() - 11 * 60_000);
  store.seed({
    requestId: "expired-started",
    status: GENERATION_RESERVATION_STATUS.STARTED,
    createdAt: startedAt,
    startedAt,
    expiresAt: new Date(now.getTime() - 60_000),
  });

  const usage = await getGenerationUsage("user-1", "free", now, store);
  assert.equal(usage.used, 1);
  await assert.doesNotReject(() =>
    reserveGeneration(
      {
        requestId: "after-expired-started",
        userId: "user-1",
        plan: "free",
        now,
      },
      store,
    ),
  );
});

test("Free usage resets at UTC midnight", async () => {
  const store = new MemoryReservationStore();
  store.seed({
    requestId: "yesterday",
    createdAt: new Date("2026-07-02T23:59:59.999Z"),
  });

  const usage = await getGenerationUsage(
    "user-1",
    "free",
    new Date("2026-07-03T00:00:00.000Z"),
    store,
  );
  assert.equal(usage.used, 0);
  assert.equal(usage.periodKey, "2026-07-03");
});

test("Pro usage resets at UTC calendar month boundary", async () => {
  const store = new MemoryReservationStore();
  store.seed({
    requestId: "last-month",
    plan: "pro",
    createdAt: new Date("2026-06-30T23:59:59.999Z"),
  });

  const usage = await getGenerationUsage(
    "user-1",
    "pro",
    new Date("2026-07-01T00:00:00.000Z"),
    store,
  );
  assert.equal(usage.used, 0);
  assert.equal(usage.periodKey, "2026-07");
});

test("page refresh restores usage from server reservation data", async () => {
  const store = new MemoryReservationStore();
  const now = new Date("2026-07-03T10:00:00.000Z");

  for (let index = 0; index < 3; index += 1) {
    store.seed({
      requestId: `server-usage-${index}`,
      createdAt: new Date(now.getTime() - (index + 1) * 61_000),
    });
  }

  const usage = await getGenerationUsage("user-1", "free", now, store);
  const pageSource = readFileSync(
    "src/app/(protected)/generate/page.tsx",
    "utf8",
  );

  assert.equal(usage.used, 3);
  assert.match(
    pageSource,
    /getUserUsageSnapshot\(session\.id, session\.plan\)/,
  );
});

test("actual input and output token usage is persisted", async () => {
  const store = new MemoryReservationStore();
  const now = new Date("2026-07-03T10:00:00.000Z");
  await reserveGeneration(
    { requestId: "tokens", userId: "user-1", plan: "pro", now },
    store,
  );
  await store.markStarted("user-1", "tokens", now);
  await store.complete(
    "user-1",
    "tokens",
    generation({ model: "gpt-4o", inputTokens: 321, outputTokens: 654 }),
    now,
  );

  assert.equal(store.reservations[0].actualInputTokens, 321);
  assert.equal(store.reservations[0].actualOutputTokens, 654);
});

test("successful generation content continues to be saved", async () => {
  const store = new MemoryReservationStore();
  const now = new Date("2026-07-03T10:00:00.000Z");
  await reserveGeneration(
    { requestId: "save-result", userId: "user-1", plan: "free", now },
    store,
  );
  await store.markStarted("user-1", "save-result", now);
  await store.complete(
    "user-1",
    "save-result",
    generation({ prompt: "Original prompt", result: "Generated result" }),
    now,
  );

  assert.equal(store.generations.length, 1);
  assert.equal(store.generations[0].prompt, "Original prompt");
  assert.equal(store.generations[0].result, "Generated result");
});

test("completion is idempotent and saves no duplicate generation", async () => {
  const store = new MemoryReservationStore();
  const now = new Date("2026-07-03T10:00:00.000Z");
  await reserveGeneration(
    { requestId: "complete-once", userId: "user-1", plan: "free", now },
    store,
  );
  await store.markStarted("user-1", "complete-once", now);
  await store.complete("user-1", "complete-once", generation(), now);
  await store.complete("user-1", "complete-once", generation(), now);

  assert.equal(store.generations.length, 1);
});

test("new reservations receive a ten-minute expiry", async () => {
  const store = new MemoryReservationStore();
  const now = new Date("2026-07-03T10:00:00.000Z");
  const reservation = await reserveGeneration(
    { requestId: "ttl", userId: "user-1", plan: "free", now },
    store,
  );

  assert.equal(
    reservation.expiresAt.getTime() - reservation.createdAt.getTime(),
    GENERATION_RESERVATION_TTL_MS,
  );
});

test("public generation-limit text matches Free and Pro policies", () => {
  const hero = readFileSync("src/components/landing/hero-section.tsx", "utf8");
  const dashboardMockup = readFileSync(
    "src/components/landing/mockups/dashboard-mockup.tsx",
    "utf8",
  );
  const productScreenshots = readFileSync(
    "src/components/landing/product-screenshots.tsx",
    "utf8",
  );
  const pricing = readFileSync("src/config/pricing-display.ts", "utf8");
  const publicLimitText = [
    hero,
    dashboardMockup,
    productScreenshots,
    pricing,
  ].join("\n");

  assert.match(hero, /5 free generations per day/);
  assert.match(dashboardMockup, /3 \/ 5/);
  assert.match(productScreenshots, /5 generations per day/);
  assert.match(productScreenshots, /100 generations per month/);
  assert.match(pricing, /Unlimited saved prompts/);
  assert.doesNotMatch(publicLimitText, /20 free generations/i);
  assert.doesNotMatch(publicLimitText, /3 \/ 20/);
  assert.doesNotMatch(publicLimitText, /Unlimited generations/i);
});
