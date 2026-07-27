import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  getQuotaResetsSettingsMessage,
  QUOTA_RESETS_SEPARATELY_MESSAGE,
  QUOTA_RESETS_WITH_BILLING_PERIOD_MESSAGE,
} from "../src/components/settings/subscription-manager";
import { parseGenerationApiError } from "../src/lib/usage/quota-exceeded";
import {
  isUsableProviderBillingPeriod,
  resolveQuotaPeriod,
} from "../src/lib/usage/quota-period";

const now = new Date("2026-07-07T20:00:00.000Z");
const freeResetAt = "2026-07-08T00:00:00.000Z";
const proResetAt = "2026-08-01T00:00:00.000Z";
const billingPeriodEnd = "2026-08-10T12:00:00.000Z";
const freemiusResetAt = "2026-08-28T12:00:00.000Z";

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
  const hint = getQuotaResetHint(
    "monthly",
    proResetAt,
    now,
    "utc_calendar_month",
  );
  assert.equal(hint, "Quota resets on Aug 1 UTC");
  assert.doesNotMatch(hint, /billing period/i);
});

test("Freemius Pro remaining label and reset hint use billing period", () => {
  assert.equal(
    getRemainingGenerationsLabel("pro", 99, "provider_billing"),
    "99 generations left in this billing period",
  );
  const hint = getQuotaResetHint(
    "monthly",
    freemiusResetAt,
    new Date("2026-07-28T15:00:00.000Z"),
    "provider_billing",
  );
  assert.equal(hint, "Quota resets on Aug 28, 2026");
  assert.doesNotMatch(hint, /calendar month/i);
});

test("Pro remaining label says calendar month", () => {
  assert.equal(
    getRemainingGenerationsLabel("pro", 70),
    "70 generations left this calendar month",
  );
  assert.equal(
    getRemainingGenerationsLabel("pro", 70, "utc_calendar_month"),
    "70 generations left this calendar month",
  );
  assert.equal(
    getRemainingGenerationsLabel("free", 3),
    "3 generations left today",
  );
});

test("Pro exhausted and exceeded copy name calendar month and Quota resets", () => {
  const exhausted = getQuotaExhaustedBannerMessage(
    "pro",
    proResetAt,
    now,
    "utc_calendar_month",
  );
  assert.match(exhausted, /calendar month/i);
  assert.match(exhausted, /Quota resets on Aug 1 UTC/i);

  const exceeded = getQuotaExceededCopy(
    "pro",
    proResetAt,
    now,
    "utc_calendar_month",
  );
  assert.equal(exceeded.error, "Calendar-month generation limit reached");
  assert.match(exceeded.message, /100 Pro generations this calendar month/i);
  assert.match(exceeded.message, /Quota resets on Aug 1 UTC/i);

  const freeExceeded = getQuotaExceededCopy("free", freeResetAt, now);
  assert.match(freeExceeded.message, /UTC calendar month/i);
});

test("Freemius Pro exhausted and exceeded copy use billing period", () => {
  const exhausted = getQuotaExhaustedBannerMessage(
    "pro",
    freemiusResetAt,
    new Date("2026-07-28T15:00:00.000Z"),
    "provider_billing",
  );
  assert.match(exhausted, /billing period/i);
  assert.doesNotMatch(exhausted, /calendar month/i);
  assert.match(exhausted, /Aug 28, 2026/);

  const exceeded = getQuotaExceededCopy(
    "pro",
    freemiusResetAt,
    new Date("2026-07-28T15:00:00.000Z"),
    "provider_billing",
  );
  assert.equal(exceeded.error, "Billing-period generation limit reached");
  assert.match(exceeded.message, /this billing period/i);
  assert.doesNotMatch(exceeded.message, /calendar month/i);
});

test("low remaining Pro warning uses calendar month wording", () => {
  const message = getGenerationLimitMessage(
    "pro",
    98,
    proResetAt,
    now,
    "utc_calendar_month",
  );
  assert.equal(message, "2 generations left this calendar month.");
});

test("low remaining Freemius Pro warning uses billing period wording", () => {
  const message = getGenerationLimitMessage(
    "pro",
    98,
    freemiusResetAt,
    new Date("2026-07-28T15:00:00.000Z"),
    "provider_billing",
  );
  assert.equal(message, "2 generations left in this billing period.");
});

test("settings helper separates access period from generation quota", () => {
  assert.equal(
    QUOTA_RESETS_SEPARATELY_MESSAGE,
    "Generation quota resets separately by UTC calendar month.",
  );
  assert.equal(
    QUOTA_RESETS_WITH_BILLING_PERIOD_MESSAGE,
    "Generation quota resets with your billing period.",
  );
  assert.equal(
    getQuotaResetsSettingsMessage({
      currentPeriodStart: "2026-07-28T12:00:00.000Z",
      currentPeriodEnd: "2026-08-28T12:00:00.000Z",
      now: new Date("2026-07-29T10:00:00.000Z"),
    }),
    QUOTA_RESETS_WITH_BILLING_PERIOD_MESSAGE,
  );
  // End-only (or missing start) → UTC calendar month fallback (manual Pro).
  assert.equal(
    getQuotaResetsSettingsMessage({
      currentPeriodStart: null,
      currentPeriodEnd: "2026-08-28T12:00:00.000Z",
    }),
    QUOTA_RESETS_SEPARATELY_MESSAGE,
  );
  assert.equal(
    getQuotaResetsSettingsMessage({
      currentPeriodStart: undefined,
      currentPeriodEnd: "2026-08-28T12:00:00.000Z",
    }),
    QUOTA_RESETS_SEPARATELY_MESSAGE,
  );
});

test("settings main page and billing page both pass currentPeriodStart for quota copy", () => {
  const settingsPage = readFileSync(
    "src/app/(protected)/settings/page.tsx",
    "utf8",
  );
  const billingPage = readFileSync(
    "src/app/(protected)/settings/billing/page.tsx",
    "utf8",
  );
  const manager = readFileSync(
    "src/components/settings/subscription-manager.tsx",
    "utf8",
  );

  assert.match(settingsPage, /currentPeriodStart:\s*true/);
  assert.match(settingsPage, /currentPeriodStart:\s*\n?\s*subscription\.currentPeriodStart/);
  assert.match(billingPage, /currentPeriodStart:\s*true/);
  assert.match(billingPage, /currentPeriodStart:\s*\n?\s*subscription\.currentPeriodStart/);
  assert.match(manager, /getQuotaResetsSettingsMessage/);
  assert.match(manager, /currentPeriodStart:\s*subscription\?\.currentPeriodStart/);
  assert.match(manager, /cancels at end of period/);
});

test("resolveQuotaPeriod maps Freemius Pro to billing window Jul 28–Aug 28", () => {
  const resolved = resolveQuotaPeriod("pro", new Date("2026-07-29T10:00:00.000Z"), {
    currentPeriodStart: new Date("2026-07-28T12:00:00.000Z"),
    currentPeriodEnd: new Date("2026-08-28T12:00:00.000Z"),
  });
  assert.equal(resolved.basis, "provider_billing");
  assert.equal(resolved.resetAt.toISOString(), "2026-08-28T12:00:00.000Z");
  assert.equal(resolved.start.toISOString(), "2026-07-28T12:00:00.000Z");
  assert.ok(
    isUsableProviderBillingPeriod(
      {
        currentPeriodStart: resolved.start,
        currentPeriodEnd: resolved.end,
      },
      new Date("2026-07-29T10:00:00.000Z"),
    ),
  );
});

test("resolveQuotaPeriod Free stays UTC day and Pro null period is calendar month", () => {
  const free = resolveQuotaPeriod("free", new Date("2026-07-28T15:00:00.000Z"));
  assert.equal(free.basis, "utc_day");
  assert.equal(free.periodKey, "2026-07-28");

  const proFallback = resolveQuotaPeriod(
    "pro",
    new Date("2026-07-28T15:00:00.000Z"),
    null,
  );
  assert.equal(proFallback.basis, "utc_calendar_month");
  assert.equal(proFallback.periodKey, "2026-07");
  assert.equal(proFallback.resetAt.toISOString(), "2026-08-01T00:00:00.000Z");
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
