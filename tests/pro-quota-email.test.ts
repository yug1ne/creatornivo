import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildProConfirmationEmailText } from "../src/lib/email/send-pro-confirmation";
import { buildQuotaExhaustedEmailText } from "../src/lib/email/send-quota-exhausted";
import { buildQuotaWarningEmailText } from "../src/lib/email/send-quota-warning";

test("buildProConfirmationEmailText includes Pro benefits and action links", () => {
  const text = buildProConfirmationEmailText({
    name: "Alex",
    baseUrl: "https://www.creatornivo.com",
  });

  assert.match(text, /^Hi Alex,/);
  assert.match(text, /Pro subscription is active/i);
  assert.match(text, /100 generations per month/i);
  assert.match(text, /all templates/i);
  assert.match(text, /\.md.*plain text/i);
  assert.match(text, /\/generate/);
  assert.match(text, /\/settings#subscription/);
  assert.match(text, /support@creatornivo\.com/);
});

test("buildProConfirmationEmailText uses a generic greeting without a name", () => {
  const text = buildProConfirmationEmailText({
    name: null,
    baseUrl: "https://www.creatornivo.com",
  });

  assert.match(text, /^Hi there,/);
});

test("buildQuotaExhaustedEmailText states daily limit and reset countdown", () => {
  const now = new Date("2026-07-07T18:00:00.000Z");
  const resetAt = "2026-07-08T00:00:00.000Z";

  const text = buildQuotaExhaustedEmailText({
    name: "Alex",
    resetAt,
    baseUrl: "https://www.creatornivo.com",
    now,
  });

  assert.match(text, /^Hi Alex,/);
  assert.match(text, /used all 5 free generations today/i);
  assert.match(text, /Resets at 00:00 UTC/i);
  assert.match(text, /in about 6 hours/i);
  assert.match(text, /100 generations per month/i);
  assert.match(text, /no pressure/i);
  assert.match(text, /\/pricing/);
  assert.match(text, /\/dashboard/);
  assert.doesNotMatch(text, /Upgrade to Pro for 100 generations per month\./);
});

test("buildQuotaExhaustedEmailText uses a generic greeting without a name", () => {
  const text = buildQuotaExhaustedEmailText({
    name: "",
    resetAt: "2026-07-08T00:00:00.000Z",
    baseUrl: "https://www.creatornivo.com",
    now: new Date("2026-07-07T12:00:00.000Z"),
  });

  assert.match(text, /^Hi there,/);
});

test("pro confirmation email is triggered after Paddle webhook commit", () => {
  const source = readFileSync(
    "src/lib/paddle/subscription-service.ts",
    "utf8",
  );

  assert.match(source, /sendProConfirmationEmail/);
  assert.match(source, /previousPlan === PLANS\.FREE && plan === PLANS\.PRO/);
  assert.match(source, /work\.proActivation/);
});

test("buildQuotaWarningEmailText states one generation left and reset countdown", () => {
  const now = new Date("2026-07-07T18:00:00.000Z");
  const resetAt = "2026-07-08T00:00:00.000Z";

  const text = buildQuotaWarningEmailText({
    name: "Alex",
    resetAt,
    baseUrl: "https://www.creatornivo.com",
    now,
  });

  assert.match(text, /^Hi Alex,/);
  assert.match(text, /1 generation left today/i);
  assert.match(text, /5 generations per day/i);
  assert.match(text, /Resets at 00:00 UTC on Jul 8/i);
  assert.match(text, /in about 6 hours/i);
  assert.match(text, /totally optional/i);
  assert.match(text, /\/generate/);
  assert.match(text, /\/pricing/);
  assert.doesNotMatch(text, /hurry|urgent|last chance/i);
});

test("quota exhausted email is triggered after incrementUsage on Free plan", () => {
  const source = readFileSync("src/app/api/ai/generate/route.ts", "utf8");

  assert.match(source, /maybeSendQuotaExhaustedEmail/);
  assert.match(source, /snapshot\.remaining === 0/);
  assert.match(source, /user\.plan === PLANS\.FREE/);
});

test("quota warning email is triggered when one generation remains", () => {
  const source = readFileSync("src/app/api/ai/generate/route.ts", "utf8");

  assert.match(source, /maybeSendQuotaWarningEmail/);
  assert.match(source, /snapshot\.remaining === 1/);
});

test("pro and quota email senders use dedupe columns", () => {
  const proSource = readFileSync(
    "src/lib/email/send-pro-confirmation.ts",
    "utf8",
  );
  const quotaSource = readFileSync(
    "src/lib/email/send-quota-exhausted.ts",
    "utf8",
  );
  const warningSource = readFileSync(
    "src/lib/email/send-quota-warning.ts",
    "utf8",
  );

  assert.match(proSource, /proConfirmationEmailSentAt/);
  assert.match(quotaSource, /quotaExhaustedEmailSentAt/);
  assert.match(warningSource, /quotaWarningEmailSentAt/);
});