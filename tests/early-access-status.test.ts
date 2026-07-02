import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEarlyAccessClaimWhere,
  buildEarlyAccessStatus,
} from "../src/lib/early-access/status";

test("the counter only includes confirmed claims for the Paddle Early Access price", () => {
  assert.deepEqual(buildEarlyAccessClaimWhere("pri_early"), {
    paddlePriceId: "pri_early",
    earlyAccessClaimedAt: { not: null },
  });
});

test("Early Access is available at 49 confirmed claims", () => {
  const status = buildEarlyAccessStatus(49, true);

  assert.equal(status.isAvailable, true);
  assert.equal(status.spotsRemaining, 1);
});

test("at 50 confirmed claims checkout must fall back to the Pro price", () => {
  const status = buildEarlyAccessStatus(50, true);
  const selectedPriceId = status.isAvailable ? "pri_early" : "pri_pro";

  assert.equal(status.isAvailable, false);
  assert.equal(status.spotsRemaining, 0);
  assert.equal(selectedPriceId, "pri_pro");
});
