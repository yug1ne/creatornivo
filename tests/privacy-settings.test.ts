import assert from "node:assert/strict";
import test from "node:test";

import { AUTH_RATE_LIMIT_GENERIC_MESSAGE } from "../src/config/auth-rate-limit";
import { ACCOUNT_DELETION_CONFIRMATION_TEXT } from "../src/lib/privacy/account-deletion-constants";
import { getPrivacyActionError } from "../src/lib/privacy/privacy-api-errors";

test("getPrivacyActionError maps rate-limit responses consistently", () => {
  assert.equal(
    getPrivacyActionError(429, {}, "Failed"),
    AUTH_RATE_LIMIT_GENERIC_MESSAGE,
  );
  assert.equal(
    getPrivacyActionError(429, { error: "Custom rate limit" }, "Failed"),
    "Custom rate limit",
  );
  assert.equal(
    getPrivacyActionError(403, { error: "Invalid password" }, "Failed"),
    "Invalid password",
  );
  assert.equal(getPrivacyActionError(500, {}, "Failed to export account data"), "Failed to export account data");
});

test("delete confirmation text remains DELETE for inline unlock UX", () => {
  assert.equal(ACCOUNT_DELETION_CONFIRMATION_TEXT, "DELETE");
});