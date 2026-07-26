import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createPaddleCheckoutOptions,
} from "../src/hooks/use-paddle-checkout";
import {
  CHECKOUT_CANCELLED_MESSAGE,
  CHECKOUT_PENDING_MESSAGE,
  getPostCheckoutMessage,
  PRO_ACTIVE_MESSAGE,
  shouldShowFreemiusPortalActions,
  shouldShowPaddlePortalActions,
  shouldShowStripePortalActions,
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
  assert.equal(
    getPostCheckoutMessage(false, "success"),
    CHECKOUT_PENDING_MESSAGE,
  );
  assert.doesNotMatch(
    getPostCheckoutMessage(true, true) ?? "",
    /webhook confirmation/,
  );
  // Does not claim plan is granted from the return URL alone.
  assert.match(CHECKOUT_PENDING_MESSAGE, /payment confirmation/i);
  assert.doesNotMatch(CHECKOUT_PENDING_MESSAGE, /you now have Pro/i);
});

test("cancelled checkout shows neutral message and does not claim Pro", () => {
  assert.equal(
    getPostCheckoutMessage(false, "cancelled"),
    CHECKOUT_CANCELLED_MESSAGE,
  );
  assert.equal(
    getPostCheckoutMessage(true, "cancelled"),
    CHECKOUT_CANCELLED_MESSAGE,
  );
  assert.doesNotMatch(CHECKOUT_CANCELLED_MESSAGE, /Pro access/i);
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

test("Freemius portal only for Freemius-linked Pro; Paddle/Stripe not broken", () => {
  assert.equal(
    shouldShowFreemiusPortalActions({
      isPro: true,
      subscriptionProvider: "freemius",
      hasFreemiusIds: true,
    }),
    true,
  );
  assert.equal(
    shouldShowFreemiusPortalActions({
      isPro: true,
      subscriptionProvider: "paddle",
      hasFreemiusIds: false,
    }),
    false,
  );
  assert.equal(
    shouldShowFreemiusPortalActions({
      isPro: true,
      subscriptionProvider: "freemius",
      hasFreemiusIds: false,
    }),
    false,
  );
  assert.equal(
    shouldShowStripePortalActions({
      isPro: true,
      isBillingConfigured: true,
      billingProvider: "stripe",
      subscriptionProvider: "stripe",
    }),
    true,
  );
  assert.equal(
    shouldShowPaddlePortalActions({
      isPro: true,
      isBillingConfigured: true,
      billingProvider: "paddle",
      subscriptionProvider: "paddle",
    }),
    true,
  );

  const source = readFileSync(
    "src/components/settings/subscription-manager.tsx",
    "utf8",
  );
  assert.match(source, /\/api\/freemius\/portal/);
  assert.match(source, /Manage subscription/);
  assert.doesNotMatch(source, /plan:\s*["']pro["']/);
});
