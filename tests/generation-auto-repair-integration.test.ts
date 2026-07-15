/**
 * Integration-style tests for generation auto-repair orchestration.
 *
 * Mirrors the buffered repair path in src/app/api/ai/generate/route.ts using:
 * - real reserveGeneration + in-memory reservation store
 * - real sanitize/validate/repair helpers
 * - mocked provider calls (no OpenAI)
 * - tracked usage increments
 *
 * Structural assertions lock the real route source so the harness cannot drift
 * from production control flow without failing this suite.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { Plan } from "../src/config/plans";
import { getGenerationPolicy } from "../src/config/plans";
import {
  GENERATION_RESERVATION_STATUS,
  GENERATION_RESERVATION_TTL_MS,
  getGenerationPeriodWindow,
  reserveGeneration,
  type CompletedGenerationInput,
  type FailedGenerationUsage,
  type GenerationReservationStore,
  type GenerationReservationTransaction,
  type ReservationRecord,
} from "../src/lib/generation/usage-service";
import {
  getAutoRepairFailureMessage,
  isGeneratedOutputValidAfterRepair,
  isGenerationAutoRepairEnabled,
  repairGeneratedOutputOnce,
  type GeneratedOutputRepairResult,
} from "../src/lib/templates/output-repair";
import {
  sanitizeGeneratedOutput,
  validateGeneratedOutput,
} from "../src/lib/templates/output-validation";
import type { TemplateVariable } from "../src/types/template";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readProjectFile(...parts: string[]): string {
  return readFileSync(path.join(root, ...parts), "utf8");
}

function optionalField(key: string, label = key): TemplateVariable {
  return {
    key,
    label,
    required: false,
    type: "textarea",
  };
}

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
              (reservation.status === GENERATION_RESERVATION_STATUS.COMPLETED ||
                reservation.startedAt !== null),
          ).length,
        countRecent: async (userId, since) =>
          this.reservations.filter(
            (reservation) =>
              reservation.userId === userId && reservation.createdAt >= since,
          ).length,
        countActive: async (userId, now) =>
          this.reservations.filter(
            (reservation) =>
              reservation.userId === userId &&
              (reservation.status === GENERATION_RESERVATION_STATUS.RESERVED ||
                reservation.status === GENERATION_RESERVATION_STATUS.STARTED) &&
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
    assert.equal(reservation.status, GENERATION_RESERVATION_STATUS.RESERVED);
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

  private find(userId: string, requestId: string): ReservationRecord {
    const reservation = this.reservations.find(
      (candidate) =>
        candidate.userId === userId && candidate.requestId === requestId,
    );
    assert.ok(reservation, `Missing reservation ${requestId}`);
    return reservation;
  }
}

type ProviderTextResult = {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

type BufferedOrchestrationResult = {
  status: number;
  body: string;
  code?: string;
  error?: string;
  contentType: string | null;
  providerCallCount: number;
  providerPrompts: string[];
  repairCalls: number;
  reservationCount: number;
  usageIncrements: number;
  reservationStatus: string | null;
  savedResult: string | null;
};

/**
 * Mirrors the flag-enabled buffered path in generate/route.ts:
 * reserve once → main text → sanitize/validate → optional single repair →
 * complete+increment OR fail with 422 (no usage).
 */
async function runBufferedAutoRepairPath(input: {
  requestId: string;
  userId?: string;
  plan?: Plan;
  variables: TemplateVariable[];
  values: Record<string, string>;
  mainText: string;
  repairText?: string;
  now?: Date;
}): Promise<BufferedOrchestrationResult> {
  const userId = input.userId ?? "user-repair-1";
  const plan = input.plan ?? "free";
  const now = input.now ?? new Date("2026-07-14T12:00:00.000Z");
  const store = new MemoryReservationStore();
  let usageIncrements = 0;
  const providerPrompts: string[] = [];
  let repairCalls = 0;

  const createContentText = async (call: {
    prompt: string;
    onStart?: () => Promise<void>;
  }): Promise<ProviderTextResult> => {
    providerPrompts.push(call.prompt);
    await call.onStart?.();

    // Second provider call is always the repair pass (no onStart in route).
    if (providerPrompts.length === 1) {
      return {
        text: input.mainText,
        model: getGenerationPolicy(plan).model,
        inputTokens: 11,
        outputTokens: 22,
      };
    }

    repairCalls += 1;
    return {
      text: input.repairText ?? input.mainText,
      model: getGenerationPolicy(plan).model,
      inputTokens: 7,
      outputTokens: 9,
    };
  };

  const reservation = await reserveGeneration(
    {
      requestId: input.requestId,
      userId,
      plan,
      now,
    },
    store,
  );

  const markGenerationStarted = () =>
    store.markStarted(userId, input.requestId, now);

  const completeAndRecordUsage = async ({
    content,
    usedModel,
    inputTokens,
    outputTokens,
  }: {
    content: string;
    usedModel: string;
    inputTokens: number;
    outputTokens: number;
  }) => {
    await store.complete(
      userId,
      input.requestId,
      {
        userId,
        templateId: "template-repair-test",
        prompt: "filled-prompt",
        result: content,
        model: usedModel,
        inputTokens,
        outputTokens,
      },
      now,
    );
    usageIncrements += 1;
  };

  const generated = await createContentText({
    prompt: "filled-prompt",
    onStart: markGenerationStarted,
  });

  const sanitizedOutput = sanitizeGeneratedOutput(
    generated.text,
    input.variables,
    input.values,
  );
  const outputValidation = validateGeneratedOutput(
    sanitizedOutput.content,
    input.variables,
    input.values,
  );

  let finalContent = sanitizedOutput.content;
  let finalValidation = outputValidation;
  let finalInputTokens = generated.inputTokens;
  let finalOutputTokens = generated.outputTokens;
  let repairResult: GeneratedOutputRepairResult | null = null;

  if (
    !isGeneratedOutputValidAfterRepair(
      sanitizedOutput.content,
      outputValidation,
    )
  ) {
    repairResult = await repairGeneratedOutputOnce({
      content: sanitizedOutput.content,
      validation: outputValidation,
      variables: input.variables,
      values: input.values,
      repairModel: (repairPrompt) =>
        createContentText({
          prompt: repairPrompt,
        }),
    });

    finalContent = repairResult.content;
    finalValidation = repairResult.validation;
    finalInputTokens += repairResult.repairInputTokens;
    finalOutputTokens += repairResult.repairOutputTokens;

    if (!repairResult.repaired) {
      await store.fail(
        userId,
        input.requestId,
        {
          inputTokens: finalInputTokens,
          outputTokens: finalOutputTokens,
        },
        now,
      );

      return {
        status: 422,
        body: JSON.stringify({
          error: getAutoRepairFailureMessage(finalContent, finalValidation),
          code: "output_validation_failed",
        }),
        code: "output_validation_failed",
        error: getAutoRepairFailureMessage(finalContent, finalValidation),
        contentType: "application/json",
        providerCallCount: providerPrompts.length,
        providerPrompts,
        repairCalls,
        reservationCount: store.reservations.length,
        usageIncrements,
        reservationStatus: store.reservations[0]?.status ?? null,
        savedResult: null,
      };
    }
  }

  if (!isGeneratedOutputValidAfterRepair(finalContent, finalValidation)) {
    await store.fail(
      userId,
      input.requestId,
      {
        inputTokens: finalInputTokens,
        outputTokens: finalOutputTokens,
      },
      now,
    );

    return {
      status: 422,
      body: JSON.stringify({
        error: getAutoRepairFailureMessage(finalContent, finalValidation),
        code: "output_validation_failed",
      }),
      code: "output_validation_failed",
      error: getAutoRepairFailureMessage(finalContent, finalValidation),
      contentType: "application/json",
      providerCallCount: providerPrompts.length,
      providerPrompts,
      repairCalls,
      reservationCount: store.reservations.length,
      usageIncrements,
      reservationStatus: store.reservations[0]?.status ?? null,
      savedResult: null,
    };
  }

  await completeAndRecordUsage({
    content: finalContent,
    usedModel: generated.model,
    inputTokens: finalInputTokens,
    outputTokens: finalOutputTokens,
  });

  assert.equal(reservation.requestId, input.requestId);

  return {
    status: 200,
    body: finalContent,
    contentType: "text/plain",
    providerCallCount: providerPrompts.length,
    providerPrompts,
    repairCalls,
    reservationCount: store.reservations.length,
    usageIncrements,
    reservationStatus: store.reservations[0]?.status ?? null,
    savedResult: store.generations[0]?.result ?? null,
  };
}

// ---------------------------------------------------------------------------
// 1. Feature flag
// ---------------------------------------------------------------------------

test("auto-repair is disabled unless ENABLE_GENERATION_AUTO_REPAIR is exact true", () => {
  assert.equal(isGenerationAutoRepairEnabled(undefined), false);
  assert.equal(isGenerationAutoRepairEnabled(""), false);
  assert.equal(isGenerationAutoRepairEnabled("false"), false);
  assert.equal(isGenerationAutoRepairEnabled("FALSE"), false);
  assert.equal(isGenerationAutoRepairEnabled("True"), false);
  assert.equal(isGenerationAutoRepairEnabled("TRUE"), false);
  assert.equal(isGenerationAutoRepairEnabled("1"), false);
  assert.equal(isGenerationAutoRepairEnabled("yes"), false);
  assert.equal(isGenerationAutoRepairEnabled(" true"), false);
  assert.equal(isGenerationAutoRepairEnabled("true "), false);
  assert.equal(isGenerationAutoRepairEnabled("true"), true);
});

test("route gates buffered repair exclusively behind isGenerationAutoRepairEnabled()", () => {
  const route = readProjectFile("src", "app", "api", "ai", "generate", "route.ts");
  const flagCheck = route.indexOf("if (isGenerationAutoRepairEnabled())");
  const bufferedMain = route.indexOf("await createContentText", flagCheck);
  const repairOnce = route.indexOf("repairGeneratedOutputOnce", flagCheck);
  const streamCall = route.indexOf("await createContentStream", flagCheck);

  assert.ok(flagCheck >= 0);
  assert.ok(bufferedMain > flagCheck);
  assert.ok(repairOnce > bufferedMain);
  assert.ok(streamCall > repairOnce);
  assert.equal(route.match(/await reserveGeneration\(/g)?.length, 1);
  assert.equal(
    (route.match(/await incrementUsage\(/g) ?? []).length,
    1,
    "usage must increment in one shared complete path only",
  );
});

// ---------------------------------------------------------------------------
// 2–5. Success / fail orchestration with reservation + usage
// ---------------------------------------------------------------------------

test("repair success: one reservation, one usage increment, final repaired body only", async () => {
  const variables = [
    optionalField("claimsRestrictions", "Claims and restrictions"),
  ];
  const values = { claimsRestrictions: "Avoid streamline." };
  const invalidMain = "This planner helps teams streamline planning.";
  const repaired = "This planner helps teams organize weekly planning.";

  const result = await runBufferedAutoRepairPath({
    requestId: "11111111-1111-4111-8111-111111111111",
    variables,
    values,
    mainText: invalidMain,
    repairText: repaired,
  });

  assert.equal(result.status, 200);
  assert.equal(result.body, repaired);
  assert.doesNotMatch(result.body, /\bstreamline\b/i);
  assert.equal(result.savedResult, repaired);
  assert.notEqual(result.savedResult, invalidMain);

  assert.equal(result.reservationCount, 1, "exactly one reservation");
  assert.equal(result.reservationStatus, GENERATION_RESERVATION_STATUS.COMPLETED);
  assert.equal(result.usageIncrements, 1, "usage incremented once");

  assert.equal(result.providerCallCount, 2, "main + single repair");
  assert.equal(result.repairCalls, 1);
  // First prompt is the filled template; second is the repair prompt.
  assert.equal(result.providerPrompts[0], "filled-prompt");
  assert.match(result.providerPrompts[1]!, /Do not add new facts/);
  assert.match(result.providerPrompts[1]!, /streamline/i);
});

test("transform headline smoke: repair once, no second reservation or usage, validated body", async () => {
  const variables = [
    optionalField("restrictionsAndDisclosures", "Restrictions and disclosures"),
  ];
  const values = {
    restrictionsAndDisclosures: "Do not use the phrases: transform",
  };
  const invalidMain = "Headline: Transform Ideas into Structured Content";
  const repaired = "Headline: Turn Ideas into Structured Content";

  const result = await runBufferedAutoRepairPath({
    requestId: "66666666-6666-4666-8666-666666666666",
    variables,
    values,
    mainText: invalidMain,
    repairText: repaired,
  });

  assert.equal(result.status, 200);
  assert.equal(result.body, repaired);
  assert.doesNotMatch(result.body, /\btransform\b/i);
  assert.match(result.body, /Turn Ideas into Structured Content/);
  assert.equal(result.savedResult, repaired);

  assert.equal(result.reservationCount, 1, "no second reservation");
  assert.equal(result.reservationStatus, GENERATION_RESERVATION_STATUS.COMPLETED);
  assert.equal(result.usageIncrements, 1, "no second usage increment");
  assert.equal(result.providerCallCount, 2, "main + one repair only");
  assert.equal(result.repairCalls, 1);
  assert.match(result.providerPrompts[1]!, /case-insensitive/i);
  assert.match(result.providerPrompts[1]!, /transform/i);
});

test("failed repair: 422, reservation failed, usage not incremented", async () => {
  const variables = [optionalField("wordsToAvoid", "Words to avoid")];
  const values = { wordsToAvoid: 'Avoid "streamline".' };
  const invalidMain = "This planner helps teams streamline weekly planning.";

  const result = await runBufferedAutoRepairPath({
    requestId: "22222222-2222-4222-8222-222222222222",
    variables,
    values,
    mainText: invalidMain,
    // Repair still contains the prohibited phrase.
    repairText: "This planner helps teams streamline weekly planning.",
  });

  assert.equal(result.status, 422);
  assert.equal(result.code, "output_validation_failed");
  assert.match(result.error ?? "", /Output validation failed|prohibited|streamline/i);
  assert.doesNotMatch(result.body, /^This planner/); // JSON error, not raw content

  assert.equal(result.reservationCount, 1);
  assert.equal(result.reservationStatus, GENERATION_RESERVATION_STATUS.FAILED);
  assert.equal(result.usageIncrements, 0);
  assert.equal(result.savedResult, null);

  assert.equal(result.providerCallCount, 2);
  assert.equal(result.repairCalls, 1);
});

test("unrepairable commercial invent: repair model is not called", async () => {
  const variables = [optionalField("priceOfferInfo", "Price or offer details")];
  const values = { priceOfferInfo: "" };
  const invalidMain = "Launch price: $19. Early bird ends tomorrow.";

  const result = await runBufferedAutoRepairPath({
    requestId: "33333333-3333-4333-8333-333333333333",
    variables,
    values,
    mainText: invalidMain,
    repairText: "Should never be requested",
  });

  assert.equal(result.status, 422);
  assert.equal(result.code, "output_validation_failed");
  assert.equal(result.providerCallCount, 1, "main only — no repair provider call");
  assert.equal(result.repairCalls, 0);
  assert.equal(result.usageIncrements, 0);
  assert.equal(result.reservationCount, 1);
  assert.equal(result.reservationStatus, GENERATION_RESERVATION_STATUS.FAILED);
  assert.equal(result.savedResult, null);
});

test("unrepairable proof/testimonial invent: repair model is not called", async () => {
  const variables = [optionalField("proofPoints", "Proof points")];
  const values = { proofPoints: "" };
  const invalidMain =
    'Testimonial: "It doubled our pipeline in two weeks." According to research this is proven.';

  const result = await runBufferedAutoRepairPath({
    requestId: "44444444-4444-4444-8444-444444444444",
    variables,
    values,
    mainText: invalidMain,
    repairText: "Should never be requested",
  });

  assert.equal(result.status, 422);
  assert.equal(result.providerCallCount, 1);
  assert.equal(result.repairCalls, 0);
  assert.equal(result.usageIncrements, 0);
  assert.equal(result.reservationStatus, GENERATION_RESERVATION_STATUS.FAILED);
});

test("valid main output skips repair and still increments usage once", async () => {
  const variables = [
    optionalField("claimsRestrictions", "Claims and restrictions"),
  ];
  const values = { claimsRestrictions: "Avoid streamline." };
  const validMain = "This planner helps teams organize weekly planning.";

  const result = await runBufferedAutoRepairPath({
    requestId: "55555555-5555-4555-8555-555555555555",
    variables,
    values,
    mainText: validMain,
    repairText: "Should never be requested",
  });

  assert.equal(result.status, 200);
  assert.equal(result.body, validMain);
  assert.equal(result.providerCallCount, 1);
  assert.equal(result.repairCalls, 0);
  assert.equal(result.reservationCount, 1);
  assert.equal(result.usageIncrements, 1);
  assert.equal(result.reservationStatus, GENERATION_RESERVATION_STATUS.COMPLETED);
});

// ---------------------------------------------------------------------------
// 6–7. Prompt safety + route streaming contract
// ---------------------------------------------------------------------------

test("repair prompt forbids facts, URLs, proof, metrics, prices, dates, credentials", async () => {
  const variables = [optionalField("wordsToAvoid", "Words to avoid")];
  const values = { wordsToAvoid: 'Avoid "streamline".' };
  let capturedPrompt = "";

  const original = "This will streamline planning.";
  const validation = validateGeneratedOutput(original, variables, values);

  await repairGeneratedOutputOnce({
    content: original,
    validation,
    variables,
    values,
    repairModel: async (prompt) => {
      capturedPrompt = prompt;
      return {
        text: "This will organize planning.",
        model: "gpt-4o-mini",
        inputTokens: 1,
        outputTokens: 1,
      };
    },
  });

  assert.match(capturedPrompt, /Do not add new claims/);
  assert.match(capturedPrompt, /Do not add new facts/);
  assert.match(capturedPrompt, /Do not add URLs/);
  assert.match(
    capturedPrompt,
    /Do not invent proof, testimonials, metrics, prices, dates, deadlines, discounts, credentials, approvals, or sources/,
  );
  assert.match(capturedPrompt, /Output only the repaired final content/);
});

test("route streaming path stays outside repair branch; repair path is buffered only", () => {
  const route = readProjectFile("src", "app", "api", "ai", "generate", "route.ts");

  const flagCheck = route.indexOf("if (isGenerationAutoRepairEnabled())");
  const bufferedText = route.indexOf("await createContentText(", flagCheck);
  // Second createContentText is the repairModel callback
  const repairModelText = route.indexOf(
    "createContentText({\n                prompt: repairPrompt",
    bufferedText,
  );
  const finalContentResponse = route.indexOf(
    "return new Response(finalContent",
    flagCheck,
  );
  const validationFailed = route.indexOf(
    'code: "output_validation_failed"',
    flagCheck,
  );
  const streamPath = route.indexOf("await createContentStream(", flagCheck);
  const streamResponse = route.indexOf("return new Response(stream,", streamPath);

  assert.ok(flagCheck >= 0);
  assert.ok(bufferedText > flagCheck);
  assert.ok(repairModelText > bufferedText);
  assert.ok(finalContentResponse > repairModelText);
  assert.ok(validationFailed > bufferedText && validationFailed < streamPath);
  assert.ok(finalContentResponse < streamPath);
  assert.ok(streamPath > finalContentResponse);
  assert.ok(streamResponse > streamPath);

  // Streaming branch must not call repair helpers.
  const streamSlice = route.slice(streamPath);
  assert.doesNotMatch(streamSlice, /repairGeneratedOutputOnce/);
  assert.doesNotMatch(streamSlice, /isGeneratedOutputValidAfterRepair/);

  // Flag-off path still streams raw chunks to the client (by design; loop lives in provider).
  const provider = readProjectFile("src", "lib", "ai", "provider.ts");
  assert.match(provider, /for await \(const chunk of result\.textStream\)/);
  assert.match(route, /return new Response\(stream,/);
});

test("repair success path does not surface invalid main text in response body", async () => {
  const variables = [
    optionalField("claimsRestrictions", "Claims and restrictions"),
  ];
  const values = { claimsRestrictions: "Avoid streamline." };

  const result = await runBufferedAutoRepairPath({
    requestId: "66666666-6666-4666-8666-666666666666",
    variables,
    values,
    mainText: "Invalid streamline draft that must never reach the UI.",
    repairText: "Clean repaired draft without banned wording.",
  });

  assert.equal(result.status, 200);
  assert.equal(result.body, "Clean repaired draft without banned wording.");
  assert.doesNotMatch(result.body, /streamline|Invalid/);
  assert.equal(result.usageIncrements, 1);
  assert.equal(result.reservationCount, 1);
});

// Keep MemoryReservationStore TTL constant referenced so unused-import lint stays quiet
// if tooling checks the file in isolation (value is used by period window helpers).
test("reservation period window is calendar-based (harness smoke)", () => {
  const window = getGenerationPeriodWindow("free", new Date("2026-07-14T12:00:00.000Z"));
  assert.equal(window.period, "day");
  assert.ok(GENERATION_RESERVATION_TTL_MS > 0);
});
