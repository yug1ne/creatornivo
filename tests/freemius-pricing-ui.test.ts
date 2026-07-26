/**
 * Freemius Phase 5-pre: public billing UI wiring behind flags.
 * Run: npx tsx --test tests/freemius-pricing-ui.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { earlyAccessConfig } from "../src/config/early-access";
import { freemiusPricingDisplay } from "../src/config/freemius-pricing-display";
import { isPublicCheckoutEnabled } from "../src/config/freemius";
import {
  buildFreemiusCheckoutRequestBody,
  resolveFreemiusCheckoutRedirect,
} from "../src/components/pricing/freemius-checkout-cta";
import {
  CHECKOUT_CANCELLED_MESSAGE,
  CHECKOUT_PENDING_MESSAGE,
  getPostCheckoutMessage,
  shouldShowFreemiusPortalActions,
} from "../src/components/settings/subscription-manager";
import { getEarlyAccessStatus } from "../src/lib/early-access/status";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

test("PUBLIC_CHECKOUT_ENABLED remains false by default", () => {
  assert.equal(isPublicCheckoutEnabled({}), false);
  assert.equal(
    isPublicCheckoutEnabled({ PUBLIC_CHECKOUT_ENABLED: "false" }),
    false,
  );
  const envExample = read(".env.example");
  assert.match(envExample, /PUBLIC_CHECKOUT_ENABLED="false"/);
});

test("pricing page keeps Request Early Access path when checkout disabled", () => {
  const proCta = read("src/components/pricing/pro-plan-cta.tsx");
  const pricing = read("src/app/(public)/pricing/page.tsx");
  const landing = read("src/components/landing/pricing-section.tsx");

  assert.match(proCta, /RequestEarlyAccessCta/);
  assert.match(proCta, /isPublicCheckoutEnabled\(\)/);
  // Freemius CTAs only when flag is true — not unconditional render.
  assert.match(
    proCta,
    /if \(isPublicCheckoutEnabled\(\)\) \{\s*return <FreemiusCheckoutCta/,
  );

  for (const source of [pricing, landing]) {
    assert.match(source, /ProPlanCta/);
    assert.doesNotMatch(source, /FREEMIUS_RESTRICTED/);
    assert.doesNotMatch(source, /UpgradeButton/);
  }
});

test("checkout disabled shows regular $9.90 and auto-applied founding offer (no use-code UX)", async () => {
  assert.equal(earlyAccessConfig.regularPrice, "$9.90");
  assert.equal(earlyAccessConfig.price, "$4.90");
  // Server coupon id may exist; public disabled copy must not say "use code".
  assert.equal(earlyAccessConfig.foundingCouponCode, "FOUNDING20");
  assert.equal(
    earlyAccessConfig.foundingCouponCopy,
    "Founding offer: $4.90/month for the first 20 customers.",
  );
  assert.equal(
    earlyAccessConfig.limitLabel,
    "Applied automatically at checkout.",
  );
  assert.doesNotMatch(
    earlyAccessConfig.foundingCouponCopy + earlyAccessConfig.limitLabel,
    /Use code FOUNDING20/i,
  );

  const status = await getEarlyAccessStatus({
    PUBLIC_CHECKOUT_ENABLED: "false",
  });
  assert.equal(status.isAvailable, true);
  assert.equal(status.regularPrice, "$9.90");
  assert.equal(status.price, "$4.90");
  assert.match(status.foundingCouponCopy, /\$4\.90\/month for the first 20/);
  assert.doesNotMatch(status.foundingCouponCopy, /Use code FOUNDING20/i);

  // Display is not gated on Paddle early-access price IDs.
  const statusWithoutPaddleEa = await getEarlyAccessStatus({
    PUBLIC_CHECKOUT_ENABLED: "false",
    PADDLE_EARLY_ACCESS_PRICE_ID: "",
  });
  assert.equal(statusWithoutPaddleEa.isAvailable, true);
  assert.equal(statusWithoutPaddleEa.regularPrice, "$9.90");

  const priceBlock = read("src/components/pricing/pro-plan-price-block.tsx");
  const proPricing = read("src/components/pricing/pro-plan-pricing.tsx");
  const ctaNote = read("src/components/pricing/request-early-access-cta.tsx");
  assert.match(priceBlock, /isAvailable:\s*true/);
  assert.match(priceBlock, /foundingCouponCopy/);
  assert.match(priceBlock, /return <ProPlanPricing status=\{foundingStatus\}/);
  assert.match(
    priceBlock,
    /if \(isPublicCheckoutEnabled\(\)\) \{\s*return <FreemiusProPricing/,
  );
  assert.match(proPricing, /status\.regularPrice/);
  assert.match(proPricing, /foundingCouponCopy/);
  // User-facing strings (config values), not source comments.
  assert.doesNotMatch(
    earlyAccessConfig.foundingCouponCopy +
      earlyAccessConfig.limitLabel +
      earlyAccessConfig.foundingBadgeLabel,
    /Use code FOUNDING20/i,
  );
  assert.match(
    ctaNote,
    /Founding access is available by request while we finish final rollout/,
  );
});

test("pricing page does not expose Freemius checkout buttons when disabled by default", () => {
  // Component exists for enabled mode, but public pages gate via ProPlanCta.
  const checkoutCta = read("src/components/pricing/freemius-checkout-cta.tsx");
  const proCta = read("src/components/pricing/pro-plan-cta.tsx");
  assert.match(checkoutCta, /\/api\/freemius\/checkout/);
  assert.match(checkoutCta, /monthlyCtaLabel/);
  assert.match(checkoutCta, /annualCtaLabel/);
  assert.equal(
    freemiusPricingDisplay.monthlyCtaLabel.includes("Monthly"),
    true,
  );
  assert.equal(freemiusPricingDisplay.annualCtaLabel.includes("Annual"), true);

  // Default env: isPublicCheckoutEnabled is false → ProPlanCta returns Request Early Access.
  assert.equal(isPublicCheckoutEnabled(process.env), false);
  assert.equal(isPublicCheckoutEnabled({ PUBLIC_CHECKOUT_ENABLED: "false" }), false);
  // Freemius CTA is not the default branch.
  assert.match(proCta, /return <RequestEarlyAccessCta/);
});

test("enabled-mode components include Monthly and Annual Freemius CTAs", () => {
  const checkoutCta = read("src/components/pricing/freemius-checkout-cta.tsx");
  const proPricing = read("src/components/pricing/freemius-pro-pricing.tsx");

  assert.match(checkoutCta, /monthlyCtaLabel/);
  assert.match(checkoutCta, /annualCtaLabel/);
  assert.match(checkoutCta, /"monthly"/);
  assert.match(checkoutCta, /"annual"/);
  assert.match(proPricing, /monthlyPrice/);
  assert.match(proPricing, /annualPrice/);
  assert.equal(freemiusPricingDisplay.monthlyPrice, "$9.90");
  assert.equal(freemiusPricingDisplay.annualPrice, "$99");
});

test("enabled founding copy is honest; auto-apply CTA; no live seats", () => {
  assert.equal(
    freemiusPricingDisplay.foundingOfferCopy,
    "First 20 customers. Discount applied automatically.",
  );
  assert.equal(
    freemiusPricingDisplay.foundingCtaLabel,
    "Founding Pro — $4.90/month",
  );
  assert.equal(freemiusPricingDisplay.foundingCouponCode, "FOUNDING20");
  assert.equal(freemiusPricingDisplay.monthlyPrice, "$9.90");
  assert.equal(freemiusPricingDisplay.annualPrice, "$99");
  assert.equal(freemiusPricingDisplay.foundingMonthlyPrice, "$4.90");

  const display = read("src/config/freemius-pricing-display.ts");
  const proPricing = read("src/components/pricing/freemius-pro-pricing.tsx");
  const userFacing =
    freemiusPricingDisplay.foundingOfferCopy +
    freemiusPricingDisplay.foundingCtaLabel +
    freemiusPricingDisplay.monthlyCtaLabel +
    freemiusPricingDisplay.annualCtaLabel;

  assert.doesNotMatch(userFacing, /spots? left|only \d+ left/i);
  assert.doesNotMatch(userFacing, /countdown|claim your spot/i);
  assert.doesNotMatch(userFacing, /Use code FOUNDING20/i);
  assert.doesNotMatch(display, /spots? left|only \d+ left/i);
  assert.match(proPricing, /foundingOfferCopy/);
  assert.match(userFacing, /First 20 customers/);
  assert.match(userFacing, /applied automatically/i);
  assert.match(userFacing, /Founding Pro — \$4\.90\/month/);
});

test("checkout client builds monthly/annual bodies and founding coupon only when founding", () => {
  assert.deepEqual(buildFreemiusCheckoutRequestBody("monthly"), {
    interval: "monthly",
  });
  assert.deepEqual(buildFreemiusCheckoutRequestBody("annual"), {
    interval: "annual",
  });
  // Founding CTA auto-applies FOUNDING20; regular paths do not.
  assert.deepEqual(
    buildFreemiusCheckoutRequestBody("monthly", { founding: true }),
    { interval: "monthly", coupon: "FOUNDING20" },
  );
  assert.equal(
    "coupon" in buildFreemiusCheckoutRequestBody("monthly"),
    false,
  );
  assert.equal(
    "coupon" in buildFreemiusCheckoutRequestBody("annual"),
    false,
  );
  // Annual founding flag must not invent a coupon.
  assert.deepEqual(
    buildFreemiusCheckoutRequestBody("annual", { founding: true }),
    { interval: "annual" },
  );

  const checkoutCta = read("src/components/pricing/freemius-checkout-cta.tsx");
  assert.match(checkoutCta, /fetch\("\/api\/freemius\/checkout"/);
  assert.match(checkoutCta, /founding:\s*true|startCheckout\("founding"/);
  assert.doesNotMatch(checkoutCta, /plan:\s*["']pro["']/);
  assert.doesNotMatch(checkoutCta, /user\.update|User\.plan/);
});

test("checkout redirect helper never treats disabled as success", () => {
  const disabled = resolveFreemiusCheckoutRedirect(
    { code: "checkout_disabled", error: "disabled" },
    false,
  );
  assert.equal(disabled.type, "error");

  const ok = resolveFreemiusCheckoutRedirect(
    {
      checkoutUrl:
        "https://checkout.freemius.com/product/34975/plan/57499/licenses/1/",
    },
    true,
  );
  assert.equal(ok.type, "redirect");
  if (ok.type === "redirect") {
    assert.match(ok.url, /\/product\/34975\/plan\/57499\/licenses\/1\//);
  }
});

test("success and cancel messages do not mutate plan", () => {
  assert.match(CHECKOUT_PENDING_MESSAGE, /payment confirmation/i);
  assert.match(CHECKOUT_CANCELLED_MESSAGE, /cancelled/i);
  assert.equal(getPostCheckoutMessage(false, "success"), CHECKOUT_PENDING_MESSAGE);
  assert.equal(
    getPostCheckoutMessage(false, "cancelled"),
    CHECKOUT_CANCELLED_MESSAGE,
  );

  const billingPage = read("src/app/(protected)/settings/billing/page.tsx");
  const manager = read("src/components/settings/subscription-manager.tsx");
  assert.match(billingPage, /Does not grant Pro from query params/);
  assert.doesNotMatch(billingPage, /plan:\s*["']pro["']/);
  assert.doesNotMatch(manager, /plan:\s*["']pro["']/);
  assert.doesNotMatch(manager, /prisma\.user\.update/);
});

test("settings billing shows portal only for Freemius-linked Pro", () => {
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
      isPro: false,
      subscriptionProvider: "freemius",
      hasFreemiusIds: true,
    }),
    false,
  );
  assert.equal(
    shouldShowFreemiusPortalActions({
      isPro: true,
      subscriptionProvider: "paddle",
      hasFreemiusIds: true,
    }),
    false,
  );

  const billingPage = read("src/app/(protected)/settings/billing/page.tsx");
  assert.match(billingPage, /SubscriptionManager/);
  assert.match(billingPage, /freemiusUserId/);
  assert.match(billingPage, /publicCheckoutEnabled/);
});

test("restricted checkout is never exposed on public pricing surfaces", () => {
  for (const path of [
    "src/app/(public)/pricing/page.tsx",
    "src/components/landing/pricing-section.tsx",
    "src/components/pricing/pro-plan-cta.tsx",
    "src/components/pricing/freemius-checkout-cta.tsx",
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /RESTRICTED_CHECKOUT/);
    assert.doesNotMatch(source, /canUseRestrictedFreemiusCheckout/);
  }
});
