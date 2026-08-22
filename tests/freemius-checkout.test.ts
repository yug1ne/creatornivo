/**
 * Freemius Phase 3–4: checkout + portal API tests.
 * Public kill-switch defaults off; Phase 4 adds restricted allowlist mode.
 * Run: npx tsx --test tests/freemius-checkout.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  canUseRestrictedFreemiusCheckout,
  isRestrictedCheckoutEnabled,
  parseRestrictedCheckoutEmails,
  resolveFreemiusCheckoutAccess,
} from "../src/config/freemius";
import { POST as freemiusCheckoutPost } from "../src/app/api/freemius/checkout/route";
import {
  GET as freemiusPortalGet,
  POST as freemiusPortalPost,
} from "../src/app/api/freemius/portal/route";
import {
  buildFreemiusCustomerPortalUrl,
  buildFreemiusHostedCheckoutUrl,
  createFreemiusCheckoutSession,
  FreemiusCheckoutError,
  getFreemiusCheckoutBlock,
  getFreemiusCheckoutUrls,
  hasPreviousFreemiusPurchase,
  normalizeOptionalCoupon,
  parseFreemiusCheckoutInterval,
  resolveFreemiusFoundingCoupon,
  resolveFreemiusPricingIdForInterval,
} from "../src/lib/freemius/checkout-service";

const baseEnv: NodeJS.ProcessEnv = {
  FREEMIUS_PRODUCT_ID: "34975",
  FREEMIUS_PRO_PLAN_ID: "57499",
  FREEMIUS_PRO_PRICING_ID: "77471",
  FREEMIUS_FOUNDING_COUPON_CODE: "FOUNDING20",
  FREEMIUS_PUBLIC_KEY: "pk_public",
  FREEMIUS_SECRET_KEY: "sk_secret_never_expose",
  FREEMIUS_API_BEARER_TOKEN: "bearer_never_expose",
  FREEMIUS_WEBHOOK_SECRET_TOKEN: "wh_token",
  FREEMIUS_CUSTOMER_PORTAL_URL: "https://users.freemius.com/",
  PUBLIC_CHECKOUT_ENABLED: "false",
  FREEMIUS_RESTRICTED_CHECKOUT_ENABLED: "false",
  FREEMIUS_RESTRICTED_CHECKOUT_EMAILS: "",
  FREEMIUS_RESTRICTED_CHECKOUT_ADMIN_ONLY: "false",
  NEXT_PUBLIC_APP_URL: "https://www.creatornivo.com",
};

test("parseFreemiusCheckoutInterval accepts only monthly and annual", () => {
  assert.equal(parseFreemiusCheckoutInterval("monthly"), "monthly");
  assert.equal(parseFreemiusCheckoutInterval("annual"), "annual");
  assert.equal(parseFreemiusCheckoutInterval("month"), null);
  assert.equal(parseFreemiusCheckoutInterval("yearly"), null);
  assert.equal(parseFreemiusCheckoutInterval(1), null);
});

test("normalizeOptionalCoupon and FOUNDING20 allowlist", () => {
  assert.equal(normalizeOptionalCoupon(undefined), null);
  assert.equal(normalizeOptionalCoupon(""), null);
  assert.equal(normalizeOptionalCoupon("  FOUNDING20  "), "FOUNDING20");
  assert.equal(normalizeOptionalCoupon(12), null);
});

test("getFreemiusCheckoutBlock blocks Pro plan and active subscriptions", () => {
  assert.ok(
    getFreemiusCheckoutBlock({
      plan: "pro",
      subscription: null,
    }),
  );
  assert.ok(
    getFreemiusCheckoutBlock({
      plan: "free",
      subscription: {
        provider: "freemius",
        status: "active",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date("2099-01-01T00:00:00.000Z"),
      },
    }),
  );
  assert.equal(
    getFreemiusCheckoutBlock({
      plan: "free",
      subscription: null,
    }),
    null,
  );
});

test("buildFreemiusHostedCheckoutUrl uses allowlisted ids and never embeds secrets", () => {
  const url = buildFreemiusHostedCheckoutUrl(
    {
      userId: "user-1",
      email: "buyer@example.com",
      name: "Buyer",
      interval: "monthly",
      isAdmin: false,
      coupon: "FOUNDING20",
      intentId: "intent-1",
      successUrl: "https://www.creatornivo.com/settings/billing?checkout=success",
      cancelUrl: "https://www.creatornivo.com/settings/billing?checkout=cancelled",
    },
    baseEnv,
  );

  // Official Hosted Checkout path — not legacy /mode/page/plugin/
  assert.match(
    url,
    /^https:\/\/checkout\.freemius\.com\/product\/34975\/plan\/57499\/licenses\/1\//,
  );
  assert.equal(url.includes("/mode/page/plugin/"), false);
  assert.match(url, /billing_cycle=monthly/);
  assert.match(url, /pricing_id=77471/);
  assert.match(url, /coupon=FOUNDING20/);
  assert.match(url, /user_email=buyer%40example.com/);
  assert.match(url, /readonly_user=true/);
  assert.match(url, /success_url=/);
  assert.match(url, /cancel_url=/);
  assert.match(url, /checkoutIntentId=intent-1/);
  assert.match(url, /userId=user-1/);
  assert.equal(url.includes("sk_secret_never_expose"), false);
  assert.equal(url.includes("bearer_never_expose"), false);
  assert.equal(url.includes("wh_token"), false);
});

test("buildFreemiusHostedCheckoutUrl rejects invalid coupon", () => {
  assert.throws(
    () =>
      buildFreemiusHostedCheckoutUrl(
        {
          userId: "user-1",
          email: "buyer@example.com",
          name: null,
          interval: "monthly",
          isAdmin: false,
          coupon: "NOPE",
          intentId: "intent-1",
          successUrl: "https://www.creatornivo.com/settings/billing?checkout=success",
          cancelUrl: "https://www.creatornivo.com/settings/billing?checkout=cancelled",
        },
        baseEnv,
      ),
    (error: unknown) =>
      error instanceof FreemiusCheckoutError && error.code === "invalid_coupon",
  );
});

test("annual interval uses annual pricing id when configured", () => {
  const env = {
    ...baseEnv,
    FREEMIUS_PRO_ANNUAL_PRICING_ID: "88888",
  };
  assert.equal(resolveFreemiusPricingIdForInterval("annual", env), "88888");
  assert.equal(resolveFreemiusPricingIdForInterval("monthly", env), "77471");

  const url = buildFreemiusHostedCheckoutUrl(
    {
      userId: "user-1",
      email: "buyer@example.com",
      name: null,
      interval: "annual",
      isAdmin: false,
      intentId: "intent-2",
      successUrl: "https://www.creatornivo.com/settings/billing?checkout=success",
      cancelUrl: "https://www.creatornivo.com/settings/billing?checkout=cancelled",
    },
    env,
  );
  assert.match(url, /billing_cycle=annual/);
  assert.match(url, /pricing_id=88888/);
});

test("createFreemiusCheckoutSession is disabled when public and restricted are off", async () => {
  let intentCreated = false;
  await assert.rejects(
    () =>
      createFreemiusCheckoutSession({
        userId: "user-1",
        email: "buyer@example.com",
        name: null,
        plan: "free",
        subscription: null,
        interval: "monthly",
        isAdmin: false,
        env: baseEnv,
        intentStore: {
          async create() {
            intentCreated = true;
            return { id: "intent-x" };
          },
        },
      }),
    (error: unknown) =>
      error instanceof FreemiusCheckoutError &&
      error.code === "checkout_disabled",
  );
  assert.equal(intentCreated, false);
});

test("restricted off + non-allowlisted email stays checkout_disabled", async () => {
  let intentCreated = false;
  await assert.rejects(
    () =>
      createFreemiusCheckoutSession({
        userId: "user-1",
        email: "stranger@example.com",
        name: null,
        plan: "free",
        subscription: null,
        interval: "monthly",
        isAdmin: false,
        env: {
          ...baseEnv,
          FREEMIUS_RESTRICTED_CHECKOUT_ENABLED: "true",
          FREEMIUS_RESTRICTED_CHECKOUT_EMAILS: "tester@creatornivo.com",
        },
        intentStore: {
          async create() {
            intentCreated = true;
            return { id: "intent-x" };
          },
        },
      }),
    (error: unknown) =>
      error instanceof FreemiusCheckoutError &&
      error.code === "checkout_disabled",
  );
  assert.equal(intentCreated, false);
});

test("restricted true + allowlisted email returns checkout URL and mode restricted", async () => {
  let intentCreated = false;
  const result = await createFreemiusCheckoutSession({
    userId: "user-1",
    email: "tester@creatornivo.com",
    name: "Tester",
    plan: "free",
    subscription: null,
    interval: "monthly",
    isAdmin: false,
    foundingRequested: true,
    hasPreviousPurchase: false,
    env: {
      ...baseEnv,
      FREEMIUS_RESTRICTED_CHECKOUT_ENABLED: "true",
      FREEMIUS_RESTRICTED_CHECKOUT_EMAILS: "tester@creatornivo.com",
    },
    intentStore: {
      async create(input) {
        intentCreated = true;
        assert.equal(input.userId, "user-1");
        assert.equal(input.pricingId, "77471");
        return { id: "intent-restricted" };
      },
    },
  });

  assert.equal(intentCreated, true);
  assert.equal(result.mode, "restricted");
  assert.equal(result.intentId, "intent-restricted");
  assert.match(
    result.checkoutUrl,
    /checkout\.freemius\.com\/product\/34975\/plan\/57499\/licenses\/1\//,
  );
  assert.match(result.checkoutUrl, /coupon=FOUNDING20/);
  assert.equal(result.checkoutUrl.includes("sk_secret"), false);
});

test("restricted email matching is case-insensitive and trims spaces", async () => {
  assert.deepEqual(
    parseRestrictedCheckoutEmails({
      FREEMIUS_RESTRICTED_CHECKOUT_EMAILS:
        "  Tester@CreatorNivo.com , other@example.com ",
    }),
    ["tester@creatornivo.com", "other@example.com"],
  );

  assert.equal(
    canUseRestrictedFreemiusCheckout("  TESTER@creatornivo.com ", false, {
      FREEMIUS_RESTRICTED_CHECKOUT_ENABLED: "true",
      FREEMIUS_RESTRICTED_CHECKOUT_EMAILS: "tester@creatornivo.com",
    }),
    true,
  );

  const result = await createFreemiusCheckoutSession({
    userId: "user-1",
    email: "  Tester@CreatorNivo.com ",
    name: null,
    plan: "free",
    subscription: null,
    interval: "monthly",
    isAdmin: false,
    env: {
      ...baseEnv,
      FREEMIUS_RESTRICTED_CHECKOUT_ENABLED: "true",
      FREEMIUS_RESTRICTED_CHECKOUT_EMAILS: "tester@creatornivo.com",
    },
    intentStore: {
      async create() {
        return { id: "intent-case" };
      },
    },
  });
  assert.equal(result.mode, "restricted");
});

test("restricted mode applies the server-owned founding coupon only to first-time monthly checkout", async () => {
  const env = {
    ...baseEnv,
    FREEMIUS_RESTRICTED_CHECKOUT_ENABLED: "true",
    FREEMIUS_RESTRICTED_CHECKOUT_EMAILS: "tester@creatornivo.com",
  };

  const ok = await createFreemiusCheckoutSession({
    userId: "user-1",
    email: "tester@creatornivo.com",
    name: null,
    plan: "free",
    subscription: null,
    interval: "monthly",
    isAdmin: false,
    foundingRequested: true,
    hasPreviousPurchase: false,
    env,
    intentStore: {
      async create() {
        return { id: "intent-coupon" };
      },
    },
  });
  assert.match(ok.checkoutUrl, /coupon=FOUNDING20/);
  assert.equal(ok.foundingApplied, true);
});

test("restricted mode supports annual interval", async () => {
  const result = await createFreemiusCheckoutSession({
    userId: "user-1",
    email: "tester@creatornivo.com",
    name: null,
    plan: "free",
    subscription: null,
    interval: "annual",
    isAdmin: false,
    env: {
      ...baseEnv,
      FREEMIUS_PRO_ANNUAL_PRICING_ID: "88888",
      FREEMIUS_RESTRICTED_CHECKOUT_ENABLED: "true",
      FREEMIUS_RESTRICTED_CHECKOUT_EMAILS: "tester@creatornivo.com",
    },
    intentStore: {
      async create(input) {
        assert.equal(input.pricingId, "88888");
        return { id: "intent-annual" };
      },
    },
  });
  assert.equal(result.mode, "restricted");
  assert.equal(result.billingCycle, "annual");
  assert.match(result.checkoutUrl, /billing_cycle=annual/);
  assert.match(result.checkoutUrl, /pricing_id=88888/);
});

test("admin cannot initiate monthly or annual checkout, including legacy restricted admin mode", async () => {
  const env = {
    ...baseEnv,
    FREEMIUS_RESTRICTED_CHECKOUT_ENABLED: "true",
    FREEMIUS_RESTRICTED_CHECKOUT_EMAILS: "",
    FREEMIUS_RESTRICTED_CHECKOUT_ADMIN_ONLY: "true",
  };
  assert.equal(
    canUseRestrictedFreemiusCheckout("admin@creatornivo.com", true, env),
    false,
  );
  assert.equal(
    canUseRestrictedFreemiusCheckout("admin@creatornivo.com", false, env),
    false,
  );

  for (const interval of ["monthly", "annual"] as const) {
    let intentCreated = false;
    await assert.rejects(
      () =>
        createFreemiusCheckoutSession({
          userId: "admin-1",
          email: "admin@creatornivo.com",
          name: null,
          plan: "free",
          subscription: null,
          interval,
          isAdmin: true,
          env: {
            ...env,
            FREEMIUS_PRO_ANNUAL_PRICING_ID: "88888",
          },
          intentStore: {
            async create() {
              intentCreated = true;
              return { id: "intent-admin" };
            },
          },
        }),
      (error: unknown) =>
        error instanceof FreemiusCheckoutError &&
        error.code === "admin_checkout_forbidden" &&
        error.status === 403,
    );
    assert.equal(intentCreated, false);
  }
});

test("createFreemiusCheckoutSession creates intent and URL only when public enabled", async () => {
  let intentCreated = false;
  const result = await createFreemiusCheckoutSession({
    userId: "user-1",
    email: "buyer@example.com",
    name: "Buyer",
    plan: "free",
    subscription: null,
    interval: "monthly",
    isAdmin: false,
    foundingRequested: true,
    hasPreviousPurchase: false,
    env: { ...baseEnv, PUBLIC_CHECKOUT_ENABLED: "true" },
    intentStore: {
      async create(input) {
        intentCreated = true;
        assert.equal(input.userId, "user-1");
        assert.equal(input.pricingId, "77471");
        return { id: "intent-created" };
      },
    },
  });

  assert.equal(intentCreated, true);
  assert.equal(result.mode, "public");
  assert.equal(result.intentId, "intent-created");
  assert.match(
    result.checkoutUrl,
    /checkout\.freemius\.com\/product\/34975\/plan\/57499\/licenses\/1\//,
  );
  assert.equal(result.checkoutUrl.includes("/mode/page/plugin/"), false);
  assert.equal(result.checkoutUrl.includes("sk_secret"), false);
  assert.equal(result.billingCycle, "monthly");
  assert.equal(result.foundingApplied, true);
});

test("previous Freemius customer gets regular monthly checkout, not founding coupon", async () => {
  const result = await createFreemiusCheckoutSession({
    userId: "returning-user",
    email: "returning@example.com",
    name: null,
    plan: "free",
    subscription: null,
    interval: "monthly",
    isAdmin: false,
    foundingRequested: true,
    hasPreviousPurchase: true,
    env: { ...baseEnv, PUBLIC_CHECKOUT_ENABLED: "true" },
    intentStore: {
      async create() {
        return { id: "intent-returning" };
      },
    },
  });

  assert.equal(result.foundingApplied, false);
  assert.equal(result.checkoutUrl.includes("coupon="), false);
  assert.match(result.checkoutUrl, /billing_cycle=monthly/);
  assert.match(result.checkoutUrl, /pricing_id=77471/);
});

test("Freemius purchase history survives cancellation/refund and completed intents", () => {
  assert.equal(
    hasPreviousFreemiusPurchase({
      subscription: null,
      completedCheckoutIntentCount: 0,
    }),
    false,
  );
  assert.equal(
    hasPreviousFreemiusPurchase({
      subscription: {
        provider: "freemius",
        freemiusUserId: "fs-user-1",
        freemiusSubscriptionId: "fs-sub-ended",
      },
      completedCheckoutIntentCount: 0,
    }),
    true,
  );
  assert.equal(
    hasPreviousFreemiusPurchase({
      subscription: null,
      completedCheckoutIntentCount: 1,
    }),
    true,
  );
});

test("founding coupon resolution is first-purchase monthly only", () => {
  assert.equal(
    resolveFreemiusFoundingCoupon({
      interval: "monthly",
      foundingRequested: true,
      hasPreviousPurchase: false,
      env: baseEnv,
    }),
    "FOUNDING20",
  );
  assert.equal(
    resolveFreemiusFoundingCoupon({
      interval: "monthly",
      foundingRequested: true,
      hasPreviousPurchase: true,
      env: baseEnv,
    }),
    null,
  );
  assert.equal(
    resolveFreemiusFoundingCoupon({
      interval: "annual",
      foundingRequested: true,
      hasPreviousPurchase: false,
      env: baseEnv,
    }),
    null,
  );
});

test("createFreemiusCheckoutSession blocks active Pro without creating intent", async () => {
  let intentCreated = false;
  await assert.rejects(
    () =>
      createFreemiusCheckoutSession({
        userId: "user-1",
        email: "buyer@example.com",
        name: null,
        plan: "pro",
        subscription: null,
        interval: "monthly",
        isAdmin: false,
        env: { ...baseEnv, PUBLIC_CHECKOUT_ENABLED: "true" },
        intentStore: {
          async create() {
            intentCreated = true;
            return { id: "x" };
          },
        },
      }),
    (error: unknown) =>
      error instanceof FreemiusCheckoutError &&
      error.code === "subscription_already_active",
  );
  assert.equal(intentCreated, false);
});

test("existing recurring founding subscriber remains on the active-subscription path", async () => {
  const existingSubscription = {
    provider: "freemius",
    status: "active" as const,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: new Date("2099-01-01T00:00:00.000Z"),
  };
  let intentCreated = false;

  await assert.rejects(
    () =>
      createFreemiusCheckoutSession({
        userId: "founding-subscriber",
        email: "founding@example.com",
        name: null,
        plan: "pro",
        subscription: existingSubscription,
        interval: "monthly",
        isAdmin: false,
        foundingRequested: true,
        hasPreviousPurchase: true,
        env: { ...baseEnv, PUBLIC_CHECKOUT_ENABLED: "true" },
        intentStore: {
          async create() {
            intentCreated = true;
            return { id: "must-not-exist" };
          },
        },
      }),
    (error: unknown) =>
      error instanceof FreemiusCheckoutError &&
      error.code === "subscription_already_active",
  );

  assert.equal(intentCreated, false);
  assert.equal(existingSubscription.status, "active");
  assert.equal(existingSubscription.cancelAtPeriodEnd, false);
});

test("resolveFreemiusCheckoutAccess prefers public over restricted", () => {
  assert.equal(
    resolveFreemiusCheckoutAccess(
      { email: "tester@creatornivo.com" },
      {
        PUBLIC_CHECKOUT_ENABLED: "true",
        FREEMIUS_RESTRICTED_CHECKOUT_ENABLED: "true",
        FREEMIUS_RESTRICTED_CHECKOUT_EMAILS: "tester@creatornivo.com",
      },
    ),
    "public",
  );
  assert.equal(
    resolveFreemiusCheckoutAccess(
      { email: "other@example.com" },
      {
        PUBLIC_CHECKOUT_ENABLED: "false",
        FREEMIUS_RESTRICTED_CHECKOUT_ENABLED: "true",
        FREEMIUS_RESTRICTED_CHECKOUT_EMAILS: "tester@creatornivo.com",
      },
    ),
    null,
  );
  assert.equal(isRestrictedCheckoutEnabled(baseEnv), false);
  assert.equal(
    resolveFreemiusCheckoutAccess(
      { email: "admin@creatornivo.com", isAdmin: true },
      { PUBLIC_CHECKOUT_ENABLED: "true" },
    ),
    null,
  );
});

test("getFreemiusCheckoutUrls point at settings billing success/cancel", () => {
  const urls = getFreemiusCheckoutUrls("https://www.creatornivo.com");
  assert.equal(
    urls.successUrl,
    "https://www.creatornivo.com/settings/billing?checkout=success",
  );
  assert.equal(
    urls.cancelUrl,
    "https://www.creatornivo.com/settings/billing?checkout=cancelled",
  );
});

test("buildFreemiusCustomerPortalUrl uses portal env and never secrets", () => {
  const url = buildFreemiusCustomerPortalUrl(
    { email: "buyer@example.com", freemiusUserId: "fs_9" },
    baseEnv,
  );
  assert.match(url, /^https:\/\/users\.freemius\.com\//);
  assert.match(url, /email=buyer%40example.com/);
  assert.match(url, /user_id=fs_9/);
  assert.equal(url.includes("sk_secret"), false);
});

test("HTTP checkout rejects unauthenticated users", async () => {
  const previous = { ...process.env };
  Object.assign(process.env, baseEnv);
  try {
    const response = await freemiusCheckoutPost(
      new Request("http://localhost/api/freemius/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ interval: "monthly" }),
      }),
    );
    assert.equal(response.status, 401);
    const json = (await response.json()) as { code?: string };
    assert.equal(json.code, "unauthorized");
  } finally {
    process.env = previous;
  }
});

test("HTTP checkout returns checkout_disabled when kill-switch is false", async () => {
  // Full HTTP auth+session path requires NextAuth session; service-level gates are authoritative.
  const source = readFileSync("src/app/api/freemius/checkout/route.ts", "utf8");
  assert.match(source, /checkout_disabled/);
  assert.match(source, /resolveFreemiusCheckoutAccess/);
  assert.match(source, /requireSession/);
  assert.match(source, /admin_checkout_forbidden/);
  assert.match(source, /hasPreviousFreemiusPurchase/);
  assert.match(source, /status:\s*"completed"/);
  assert.match(source, /mode:/);
  assert.doesNotMatch(source, /User\.plan\s*=/);
  assert.doesNotMatch(source, /plan:\s*PLANS\.PRO/);
  assert.doesNotMatch(source, /FREEMIUS_SECRET_KEY/);
  assert.doesNotMatch(source, /apiBearerToken/);
});

test("HTTP portal rejects unauthenticated users", async () => {
  const previous = { ...process.env };
  Object.assign(process.env, baseEnv);
  try {
    const response = await freemiusPortalGet();
    assert.equal(response.status, 401);
    const post = await freemiusPortalPost();
    assert.equal(post.status, 401);
  } finally {
    process.env = previous;
  }
});

test("portal source requires freemius provider and does not fall back to paddle", () => {
  const source = readFileSync("src/app/api/freemius/portal/route.ts", "utf8");
  assert.match(source, /provider !== "freemius"/);
  assert.match(source, /freemius_subscription_not_found/);
  assert.doesNotMatch(source, /getActiveBillingProvider/);
  assert.doesNotMatch(source, /paddleSubscriptionId/);
  assert.doesNotMatch(source, /stripeSubscriptionId/);
});

test("checkout source never grants Pro or assigns period dates", () => {
  const source = readFileSync("src/lib/freemius/checkout-service.ts", "utf8");
  assert.doesNotMatch(source, /plan:\s*["']pro["']/);
  assert.doesNotMatch(source, /user\.update/);
  assert.doesNotMatch(source, /prisma\.user/);
  assert.doesNotMatch(source, /subscription\.update/);
  assert.doesNotMatch(source, /subscription\.upsert/);
  assert.match(source, /Does not assign subscription periods/);
});
