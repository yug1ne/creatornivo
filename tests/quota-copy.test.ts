import assert from "node:assert/strict";
import test from "node:test";

import {
  GENERATION_DISABLED_MESSAGE,
  getGenerateDisabledHint,
  getQuotaExceededCopy,
  getQuotaResetCountdown,
  getQuotaResetHint,
} from "../src/lib/usage/quota-copy";
import { parseGenerationApiError } from "../src/lib/usage/quota-exceeded";

const now = new Date("2026-07-07T20:00:00.000Z");
const freeResetAt = "2026-07-08T00:00:00.000Z";
const proResetAt = "2026-08-01T00:00:00.000Z";

test("getQuotaResetCountdown formats hours until reset", () => {
  assert.equal(getQuotaResetCountdown(freeResetAt, now), "in about 4 hours");
});

test("getQuotaResetHint for Free includes UTC time and countdown", () => {
  const hint = getQuotaResetHint("daily", freeResetAt, now);
  assert.match(hint, /Resets at 00:00 UTC on Jul 8/i);
  assert.match(hint, /in about 4 hours/i);
});

test("getQuotaResetHint for Pro includes next month date", () => {
  const hint = getQuotaResetHint("monthly", proResetAt, now);
  assert.match(hint, /Resets on Aug 1 UTC/i);
  assert.match(hint, /in about/i);
});

test("getQuotaExceededCopy for Free includes upgrade guidance", () => {
  const copy = getQuotaExceededCopy("free", freeResetAt, now);
  assert.equal(copy.error, "Daily generation limit reached");
  assert.match(copy.message, /5 free generations today/i);
  assert.match(copy.message, /00:00 UTC/i);
  assert.match(copy.message, /Upgrade to Pro/i);
});

test("getGenerateDisabledHint suggests topic when all fields are empty", () => {
  const hint = getGenerateDisabledHint({
    hasTemplate: true,
    values: { topic: "", tone: "" },
    variableCount: 2,
    isFormValid: false,
    canGenerate: true,
    isStreaming: false,
  });

  assert.equal(hint, "Add a topic in Parameters to continue.");
});

test("getGenerateDisabledHint suggests required fields when partially filled", () => {
  const hint = getGenerateDisabledHint({
    hasTemplate: true,
    values: { topic: "AI tools", tone: "" },
    variableCount: 2,
    isFormValid: false,
    canGenerate: true,
    isStreaming: false,
  });

  assert.equal(hint, "Fill in all required fields above to generate.");
});

test("parseGenerationApiError handles generation_disabled", () => {
  const parsed = parseGenerationApiError({
    code: "generation_disabled",
    error: "AI generation is temporarily unavailable.",
  });

  assert.equal(parsed.code, "generation_disabled");
  assert.equal(parsed.message, GENERATION_DISABLED_MESSAGE);
  assert.equal(parsed.showUpgradeLink, false);
});