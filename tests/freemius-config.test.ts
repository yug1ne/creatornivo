/**
 * Freemius Phase 1: config + schema foundation tests.
 * Run: npx tsx --test tests/freemius-config.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PaymentProvider, Prisma } from "@prisma/client";

import {
  FREEMIUS_PAID_PRO_PERIOD_POLICY,
  canUseRestrictedFreemiusCheckout,
  getFreemiusConfigStatus,
  getFreemiusEnvSnapshot,
  getFreemiusPublicAllowlistConfig,
  isAllowedFreemiusFoundingCoupon,
  isAllowedFreemiusPlanId,
  isAllowedFreemiusPricingId,
  isAllowedFreemiusProductId,
  isPublicCheckoutEnabled,
  isRestrictedCheckoutEnabled,
  parseRestrictedCheckoutEmails,
  resolveFreemiusCheckoutAccess,
} from "../src/config/freemius";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readProject(...parts: string[]): string {
  return readFileSync(path.join(root, ...parts), "utf8");
}

const completeEnv: NodeJS.ProcessEnv = {
  FREEMIUS_PRODUCT_ID: "34975",
  FREEMIUS_PRO_PLAN_ID: "57499",
  FREEMIUS_PRO_PRICING_ID: "77471",
  FREEMIUS_FOUNDING_COUPON_CODE: "FOUNDING20",
  FREEMIUS_PUBLIC_KEY: "pk_test_public",
  FREEMIUS_SECRET_KEY: "sk_test_secret",
  FREEMIUS_API_BEARER_TOKEN: "bearer_test",
  FREEMIUS_WEBHOOK_SECRET_TOKEN: "whsec_url_token",
  PUBLIC_CHECKOUT_ENABLED: "false",
  FREEMIUS_RESTRICTED_CHECKOUT_ENABLED: "false",
  FREEMIUS_RESTRICTED_CHECKOUT_EMAILS: "",
  FREEMIUS_RESTRICTED_CHECKOUT_ADMIN_ONLY: "false",
};

test("PaymentProvider enum includes freemius alongside paddle and stripe", () => {
  assert.equal(PaymentProvider.freemius, "freemius");
  assert.equal(PaymentProvider.paddle, "paddle");
  assert.equal(PaymentProvider.stripe, "stripe");

  const schema = readProject("prisma", "schema.prisma");
  assert.match(schema, /enum PaymentProvider \{[\s\S]*freemius/);
  assert.match(schema, /freemiusUserId/);
  assert.match(schema, /freemiusLicenseId/);
  assert.match(schema, /freemiusSubscriptionId/);
  assert.match(schema, /currentPeriodStart/);
  assert.match(schema, /model FreemiusWebhookEvent/);
  assert.match(schema, /model FreemiusCheckoutIntent/);
});

test("Prisma Subscription model documents provider period fields for Freemius", () => {
  const fields = Prisma.dmmf.datamodel.models.find(
    (model) => model.name === "Subscription",
  )?.fields;
  assert.ok(fields);

  const names = new Set(fields.map((field) => field.name));
  for (const required of [
    "freemiusUserId",
    "freemiusLicenseId",
    "freemiusSubscriptionId",
    "freemiusPlanId",
    "freemiusPricingId",
    "freemiusProductId",
    "billingInterval",
    "currentPeriodStart",
    "currentPeriodEnd",
    "lastFreemiusEventAt",
    "paddleCustomerId",
    "stripeCustomerId",
  ]) {
    assert.ok(names.has(required), `Subscription missing ${required}`);
  }
});

test("PUBLIC_CHECKOUT_ENABLED defaults to false unless exactly true", () => {
  assert.equal(isPublicCheckoutEnabled({}), false);
  assert.equal(isPublicCheckoutEnabled({ PUBLIC_CHECKOUT_ENABLED: "" }), false);
  assert.equal(
    isPublicCheckoutEnabled({ PUBLIC_CHECKOUT_ENABLED: "false" }),
    false,
  );
  assert.equal(
    isPublicCheckoutEnabled({ PUBLIC_CHECKOUT_ENABLED: "TRUE" }),
    false,
  );
  assert.equal(
    isPublicCheckoutEnabled({ PUBLIC_CHECKOUT_ENABLED: "1" }),
    false,
  );
  assert.equal(
    isPublicCheckoutEnabled({ PUBLIC_CHECKOUT_ENABLED: "true" }),
    true,
  );
});

test("restricted checkout defaults off and parses allowlisted emails safely", () => {
  assert.equal(isRestrictedCheckoutEnabled({}), false);
  assert.equal(
    isRestrictedCheckoutEnabled({ FREEMIUS_RESTRICTED_CHECKOUT_ENABLED: "true" }),
    true,
  );
  assert.equal(
    isRestrictedCheckoutEnabled({ FREEMIUS_RESTRICTED_CHECKOUT_ENABLED: "TRUE" }),
    false,
  );

  assert.deepEqual(
    parseRestrictedCheckoutEmails({
      FREEMIUS_RESTRICTED_CHECKOUT_EMAILS:
        " A@Example.com, b@example.com,, A@example.com ",
    }),
    ["a@example.com", "b@example.com"],
  );

  assert.equal(
    canUseRestrictedFreemiusCheckout("a@example.com", false, {
      FREEMIUS_RESTRICTED_CHECKOUT_ENABLED: "false",
      FREEMIUS_RESTRICTED_CHECKOUT_EMAILS: "a@example.com",
    }),
    false,
  );
  assert.equal(
    canUseRestrictedFreemiusCheckout("a@example.com", false, {
      FREEMIUS_RESTRICTED_CHECKOUT_ENABLED: "true",
      FREEMIUS_RESTRICTED_CHECKOUT_EMAILS: "a@example.com",
    }),
    true,
  );
  assert.equal(
    canUseRestrictedFreemiusCheckout("other@example.com", false, {
      FREEMIUS_RESTRICTED_CHECKOUT_ENABLED: "true",
      FREEMIUS_RESTRICTED_CHECKOUT_EMAILS: "a@example.com",
    }),
    false,
  );
  assert.equal(
    canUseRestrictedFreemiusCheckout("admin@example.com", true, {
      FREEMIUS_RESTRICTED_CHECKOUT_ENABLED: "true",
      FREEMIUS_RESTRICTED_CHECKOUT_ADMIN_ONLY: "true",
      FREEMIUS_RESTRICTED_CHECKOUT_EMAILS: "",
    }),
    false,
  );

  assert.equal(
    resolveFreemiusCheckoutAccess(
      { email: "a@example.com" },
      {
        PUBLIC_CHECKOUT_ENABLED: "false",
        FREEMIUS_RESTRICTED_CHECKOUT_ENABLED: "true",
        FREEMIUS_RESTRICTED_CHECKOUT_EMAILS: "a@example.com",
      },
    ),
    "restricted",
  );
  assert.equal(
    resolveFreemiusCheckoutAccess(
      { email: "a@example.com" },
      { PUBLIC_CHECKOUT_ENABLED: "false" },
    ),
    null,
  );
  assert.equal(
    resolveFreemiusCheckoutAccess(
      { email: "admin@example.com", isAdmin: true },
      {
        PUBLIC_CHECKOUT_ENABLED: "true",
        FREEMIUS_RESTRICTED_CHECKOUT_ENABLED: "true",
        FREEMIUS_RESTRICTED_CHECKOUT_ADMIN_ONLY: "true",
      },
    ),
    null,
  );
});

test("Freemius config detects complete webhook foundation envs", () => {
  const status = getFreemiusConfigStatus(completeEnv);
  assert.equal(status.allowlistConfigured, true);
  assert.equal(status.secretKeyConfigured, true);
  assert.equal(status.apiBearerConfigured, true);
  assert.equal(status.webhookTokenConfigured, true);
  assert.equal(status.publicCheckoutEnabled, false);
  assert.equal(status.restrictedCheckoutEnabled, false);
  assert.equal(status.restrictedCheckoutEmailCount, 0);
  assert.equal(status.restrictedCheckoutAdminOnly, false);
  assert.equal(status.webhookFoundationReady, true);
  assert.equal(status.checkoutFoundationReady, true);
  assert.deepEqual(status.missingRequiredForWebhook, []);
});

test("Freemius config reports missing secret and allowlist envs", () => {
  const status = getFreemiusConfigStatus({
    FREEMIUS_PRODUCT_ID: "34975",
    // missing plan, pricing, secrets
  });
  assert.equal(status.allowlistConfigured, false);
  assert.equal(status.secretKeyConfigured, false);
  assert.equal(status.webhookFoundationReady, false);
  assert.ok(status.missingRequiredForWebhook.includes("FREEMIUS_PRO_PLAN_ID"));
  assert.ok(
    status.missingRequiredForWebhook.includes("FREEMIUS_PRO_PRICING_ID"),
  );
  assert.ok(status.missingRequiredForWebhook.includes("FREEMIUS_SECRET_KEY"));
  assert.ok(
    status.missingRequiredForWebhook.includes("FREEMIUS_WEBHOOK_SECRET_TOKEN"),
  );
});

test("hosted checkout foundation needs product/plan/pricing only (not API bearer)", () => {
  const status = getFreemiusConfigStatus({
    ...completeEnv,
    FREEMIUS_API_BEARER_TOKEN: "",
  });
  assert.equal(status.webhookFoundationReady, true);
  assert.equal(status.checkoutFoundationReady, true);
  assert.equal(status.apiBearerConfigured, false);
});

test("portal foundation requires FREEMIUS_CUSTOMER_PORTAL_URL", () => {
  const withoutPortal = getFreemiusConfigStatus(completeEnv);
  assert.equal(withoutPortal.portalFoundationReady, false);
  assert.ok(
    withoutPortal.missingRequiredForPortal.includes(
      "FREEMIUS_CUSTOMER_PORTAL_URL",
    ),
  );

  const withPortal = getFreemiusConfigStatus({
    ...completeEnv,
    FREEMIUS_CUSTOMER_PORTAL_URL: "https://users.freemius.com/",
  });
  assert.equal(withPortal.portalFoundationReady, true);
});

test("allowlist helpers match configured product plan pricing coupon", () => {
  assert.equal(isAllowedFreemiusProductId("34975", completeEnv), true);
  assert.equal(isAllowedFreemiusProductId("00000", completeEnv), false);
  assert.equal(isAllowedFreemiusPlanId("57499", completeEnv), true);
  assert.equal(isAllowedFreemiusPricingId("77471", completeEnv), true);
  assert.equal(isAllowedFreemiusPricingId("99999", completeEnv), false);
  assert.equal(isAllowedFreemiusFoundingCoupon("FOUNDING20", completeEnv), true);
  assert.equal(isAllowedFreemiusFoundingCoupon("founding20", completeEnv), true);
  assert.equal(isAllowedFreemiusFoundingCoupon("OTHER", completeEnv), false);
});

test("annual pricing id is optional and allowlisted when set", () => {
  const env = {
    ...completeEnv,
    FREEMIUS_PRO_ANNUAL_PRICING_ID: "88888",
  };
  assert.equal(isAllowedFreemiusPricingId("88888", env), true);
  assert.equal(isAllowedFreemiusPricingId("77471", env), true);
});

test("public allowlist config never includes secret key or bearer token values", () => {
  const publicConfig = getFreemiusPublicAllowlistConfig(completeEnv);
  const serialized = JSON.stringify(publicConfig);
  assert.equal(serialized.includes("sk_test_secret"), false);
  assert.equal(serialized.includes("bearer_test"), false);
  assert.equal(serialized.includes("whsec_url_token"), false);
  assert.equal(publicConfig.productId, "34975");
  assert.equal(publicConfig.publicCheckoutEnabled, false);
  assert.equal(publicConfig.restrictedCheckoutEnabled, false);
  assert.equal(publicConfig.paidProPeriodPolicy.usesProviderBillingPeriod, true);
  assert.equal(publicConfig.paidProPeriodPolicy.usesUtcCalendarMonth, false);
  // Never expose allowlisted emails on public config surface
  assert.equal("restrictedCheckoutEmails" in publicConfig, false);
  assert.equal(serialized.includes("tester@"), false);
});

test("env snapshot does not invent Store keys as required Freemius fields", () => {
  const snap = getFreemiusEnvSnapshot(completeEnv);
  assert.equal("storeId" in snap, false);
  assert.equal("FREEMIUS_STORE_ID" in completeEnv, false);
  const source = readProject("src", "config", "freemius.ts");
  assert.doesNotMatch(source, /FREEMIUS_STORE/);
  assert.doesNotMatch(source, /STORE_ID/);
});

test("paid Freemius Pro period policy is provider-based not calendar month", () => {
  assert.equal(FREEMIUS_PAID_PRO_PERIOD_POLICY.source, "freemius_provider");
  assert.equal(FREEMIUS_PAID_PRO_PERIOD_POLICY.usesProviderBillingPeriod, true);
  assert.equal(FREEMIUS_PAID_PRO_PERIOD_POLICY.usesUtcCalendarMonth, false);
  assert.deepEqual(
    [...FREEMIUS_PAID_PRO_PERIOD_POLICY.fields],
    ["currentPeriodStart", "currentPeriodEnd"],
  );

  // Phase 1 must not wire paid Freemius into calendar-month usage helpers.
  const usage = readProject("src", "lib", "usage.ts");
  assert.doesNotMatch(usage, /freemius/i);
  assert.doesNotMatch(usage, /FREEMIUS/);

  const freemiusConfig = readProject("src", "config", "freemius.ts");
  assert.match(freemiusConfig, /provider-based/);
  assert.match(freemiusConfig, /not UTC calendar months/);
  assert.doesNotMatch(
    freemiusConfig,
    /paid Freemius Pro.*calendar month reset on the 1st/i,
  );
});

test("Phase 5-pre wires Freemius pricing only behind PUBLIC_CHECKOUT_ENABLED", () => {
  const pricing = readProject("src", "app", "(public)", "pricing", "page.tsx");
  const proCta = readProject("src", "components", "pricing", "pro-plan-cta.tsx");
  assert.match(pricing, /isPublicCheckoutEnabled/);
  assert.match(pricing, /ProPlanCta/);
  assert.doesNotMatch(pricing, /FREEMIUS_RESTRICTED_CHECKOUT/);
  assert.match(proCta, /isPublicCheckoutEnabled\(\)/);
  assert.match(proCta, /RequestEarlyAccessCta/);
  assert.match(proCta, /FreemiusCheckoutCta/);

  const envExample = readProject(".env.example");
  assert.match(envExample, /PUBLIC_CHECKOUT_ENABLED="false"/);
  assert.match(envExample, /FREEMIUS_RESTRICTED_CHECKOUT_ENABLED="false"/);
  assert.match(envExample, /FREEMIUS_RESTRICTED_CHECKOUT_EMAILS=/);
});
