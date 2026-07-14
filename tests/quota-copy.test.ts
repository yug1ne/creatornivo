import assert from "node:assert/strict";
import test from "node:test";

import {
  formatHumanUtcDate,
  formatQuotaResetUtcDate,
  GENERATION_DISABLED_MESSAGE,
  getGenerateDisabledHint,
  getQuotaExceededCopy,
  getQuotaExhaustedBannerMessage,
  getQuotaResetCountdown,
  getQuotaResetHint,
} from "../src/lib/usage/quota-copy";
import {
  getGenerationLimitMessage,
  getRemainingGenerationsLabel,
} from "../src/lib/subscriptions/messages";
import {
  formatSubscriptionAccessDate,
  QUOTA_RESETS_SEPARATELY_MESSAGE,
} from "../src/components/settings/subscription-manager";
import { parseGenerationApiError } from "../src/lib/usage/quota-exceeded";

const now = new Date("2026-07-07T20:00:00.000Z");
const freeResetAt = "2026-07-08T00:00:00.000Z";
const proResetAt = "2026-08-01T00:00:00.000Z";
const billingPeriodEnd = "2026-08-10T12:00:00.000Z";

test("getQuotaResetCountdown formats hours until reset", () => {
  assert.equal(getQuotaResetCountdown(freeResetAt, now), "in about 4 hours");
});

test("formatHumanUtcDate uses Aug 10, 2026 style not 8/10/2026", () => {
  assert.equal(formatHumanUtcDate(billingPeriodEnd), "Aug 10, 2026");
  assert.equal(formatQuotaResetUtcDate(proResetAt), "Aug 1");
  assert.equal(formatSubscriptionAccessDate(billingPeriodEnd), "Aug 10, 2026");
  assert.doesNotMatch(formatHumanUtcDate(billingPeriodEnd), /^\d{1,2}\/\d{1,2}\/\d{4}$/);
});

test("getQuotaResetHint for Free includes UTC time and countdown", () => {
  const hint = getQuotaResetHint("daily", freeResetAt, now);
  assert.match(hint, /Quota resets at 00:00 UTC on Jul 8/i);
  assert.match(hint, /in about 4 hours/i);
});

test("getQuotaResetHint for Pro uses calendar-month wording without billing confusion", () => {
  const hint = getQuotaResetHint("monthly", proResetAt, now);
  assert.equal(hint, "Quota resets on Aug 1 UTC");
  assert.doesNotMatch(hint, /billing period/i);
});

test("Pro remaining label says calendar month", () => {
  assert.equal(
    getRemainingGenerationsLabel("pro", 70),
    "70 generations left this calendar month",
  );
  assert.equal(
    getRemainingGenerationsLabel("free", 3),
    "3 generations left today",
  );
});

test("Pro exhausted and exceeded copy name calendar month and Quota resets", () => {
  const exhausted = getQuotaExhaustedBannerMessage("pro", proResetAt, now);
  assert.match(exhausted, /calendar month/i);
  assert.match(exhausted, /Quota resets on Aug 1 UTC/i);

  const exceeded = getQuotaExceededCopy("pro", proResetAt, now);
  assert.equal(exceeded.error, "Calendar-month generation limit reached");
  assert.match(exceeded.message, /100 Pro generations this calendar month/i);
  assert.match(exceeded.message, /Quota resets on Aug 1 UTC/i);

  const freeExceeded = getQuotaExceededCopy("free", freeResetAt, now);
  assert.match(freeExceeded.message, /UTC calendar month/i);
});

test("low remaining Pro warning uses calendar month wording", () => {
  const message = getGenerationLimitMessage("pro", 98, proResetAt, now);
  assert.equal(message, "2 generations left this calendar month.");
});

test("settings helper separates access period from generation quota", () => {
  assert.equal(
    QUOTA_RESETS_SEPARATELY_MESSAGE,
    "Generation quota resets separately by UTC calendar month.",
  );
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
