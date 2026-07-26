import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  buildEarlyAccessStatus,
} from "../src/lib/early-access/status";
import { ProPlanPricing } from "../src/components/pricing/pro-plan-pricing";
import {
  getGuestUpgradeLabel,
  getUpgradeButtonLabel,
} from "../src/components/pricing/upgrade-button";

test("a configured Early Access price is available without a scarcity cap", () => {
  const status = buildEarlyAccessStatus(true);

  assert.equal(status.isAvailable, true);
  assert.equal("spotsTaken" in status, false);
  assert.equal("spotsRemaining" in status, false);
  assert.equal("maxSpots" in status, false);
});

test("Early Access is unavailable only when its Price ID is not configured", () => {
  const status = buildEarlyAccessStatus(false);
  const selectedPriceId = status.isAvailable ? "pri_early" : "pri_pro";

  assert.equal(status.isAvailable, false);
  assert.equal(selectedPriceId, "pri_pro");
});

test("available Early Access renders regular $9.90 with visible FOUNDING20 offer", () => {
  const status = buildEarlyAccessStatus(true);
  const markup = renderToStaticMarkup(
    createElement(ProPlanPricing, { status }),
  );

  assert.match(markup, /Early Access/);
  assert.match(markup, /Limited founding offer/);
  assert.match(markup, /\$9\.90/);
  assert.match(markup, /FOUNDING20/);
  assert.match(markup, /\$4\.90\/month/);
  assert.match(markup, /Use code FOUNDING20 to get \$5 off/);
  assert.match(markup, /first 20 customers only/i);
  // Main list price is regular — not a struck-through comparison layout.
  assert.doesNotMatch(markup, /line-through/);
});

test("unavailable Early Access renders only the standard Pro price", () => {
  const status = buildEarlyAccessStatus(false);
  const markup = renderToStaticMarkup(
    createElement(ProPlanPricing, { status }),
  );

  assert.match(markup, /\$9\.90/);
  assert.doesNotMatch(
    markup,
    /\$4\.90|Early Access|FOUNDING20|Limited founding offer/,
  );
});

test("guest and authenticated Early Access CTAs show the founding price", () => {
  assert.equal(
    getGuestUpgradeLabel(true, "$4.90"),
    "Sign in to get Pro — $4.90/mo",
  );
  assert.equal(getUpgradeButtonLabel(true, "$4.90"), "Get Pro — $4.90/mo");
  assert.equal(getGuestUpgradeLabel(false, "$4.90"), "Sign in to get Pro");
  assert.equal(getUpgradeButtonLabel(false, "$4.90"), "Upgrade to Pro");
});

test("the UI availability flag selects the configured Paddle Early Access Price ID", () => {
  const status = buildEarlyAccessStatus(true);
  const checkoutPrice = readFileSync(
    "src/lib/billing/checkout-price.ts",
    "utf8",
  );

  assert.equal(status.isAvailable, true);
  assert.match(
    checkoutPrice,
    /status\.isAvailable && paddleConfig\.earlyAccessPriceId/,
  );
  assert.match(checkoutPrice, /return paddleConfig\.earlyAccessPriceId/);
});
