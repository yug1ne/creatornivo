import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createPaddleCheckoutOptions,
} from "../src/hooks/use-paddle-checkout";
import {
  CHECKOUT_PENDING_MESSAGE,
  getPostCheckoutMessage,
  PRO_ACTIVE_MESSAGE,
  shouldShowPaddlePortalActions,
} from "../src/components/settings/subscription-manager";

test("checkout keeps transactionId and prefills the authenticated session email", () => {
  const options = createPaddleCheckoutOptions(
    "txn_01test",
    "account@example.com",
    "https://www.creatornivo.com",
  );

  assert.equal(options.transactionId, "txn_01test");
  assert.deepEqual(options.customer, { email: "account@example.com" });
  assert.equal("items" in options, false);
  assert.equal("customData" in options, false);
});

test("billing email is not used to bind the Paddle subscription owner", () => {
  const checkoutService = readFileSync(
    "src/lib/paddle/checkout-service.ts",
    "utf8",
  );
  const subscriptionService = readFileSync(
    "src/lib/paddle/subscription-service.ts",
    "utf8",
  );

  assert.match(checkoutService, /custom_data: \{ checkoutIntentId: intent\.id \}/);
  assert.doesNotMatch(checkoutService, /custom_data:[^{]*\{[^}]*userId/);
  assert.match(subscriptionService, /findIntentByTransaction/);
  assert.doesNotMatch(subscriptionService, /where: \{ email:/);
});

test("pending checkout message is shown only before Pro confirmation", () => {
  assert.equal(getPostCheckoutMessage(false, true), CHECKOUT_PENDING_MESSAGE);
  assert.equal(getPostCheckoutMessage(true, true), PRO_ACTIVE_MESSAGE);
  assert.doesNotMatch(
    getPostCheckoutMessage(true, true) ?? "",
    /webhook confirmation/,
  );
});

test("Pro shows active state and refresh does not restore stale pending state", () => {
  assert.equal(getPostCheckoutMessage(true, false), PRO_ACTIVE_MESSAGE);
  assert.equal(getPostCheckoutMessage(false, false), null);
});

test("Paddle portal actions remain visible for confirmed Pro", () => {
  assert.equal(
    shouldShowPaddlePortalActions({
      isPro: true,
      isBillingConfigured: true,
      billingProvider: "paddle",
    }),
    true,
  );

  const source = readFileSync(
    "src/components/settings/subscription-manager.tsx",
    "utf8",
  );
  assert.match(source, /Update payment method/);
  assert.match(source, /Cancel subscription/);
  assert.match(
    source,
    /This subscription management action is unavailable\./,
  );
});
