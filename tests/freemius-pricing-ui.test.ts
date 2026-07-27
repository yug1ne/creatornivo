/**
 * Freemius Phase 5-pre: public billing UI wiring behind flags.
 * Run: npx tsx --test tests/freemius-pricing-ui.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { earlyAccessConfig } from "../src/config/early-access";
import {
  freemiusFoundingOfferActive,
  freemiusPricingDisplay,
} from "../src/config/freemius-pricing-display";
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
  assert.equal(earlyAccessConfig.foundingCouponCode, "FOUNDING20");
  assert.equal(
    earlyAccessConfig.sectionTopLine,
    "Founding offer for the first 20 customers.",
  );
  assert.equal(
    earlyAccessConfig.foundingCouponCopy,
    "$4.90/month for early customers.",
  );
  assert.equal(
    earlyAccessConfig.limitLabel,
    "Discount applied automatically at checkout.",
  );
  // Card line does not restate first-20 (top line owns that).
  assert.doesNotMatch(
    earlyAccessConfig.foundingCouponCopy,
    /first 20/i,
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
  assert.match(status.foundingCouponCopy, /\$4\.90\/month for early customers/);

  const pricingPage = read("src/app/(public)/pricing/page.tsx");
  const proPricing = read("src/components/pricing/pro-plan-pricing.tsx");
  assert.match(pricingPage, /sectionTopLine/);
  assert.doesNotMatch(
    pricingPage,
    /foundingCouponCopy\}[\s\S]*limitLabel/,
  );
  assert.match(proPricing, /status\.regularPrice/);
  assert.match(proPricing, /foundingCouponCopy/);
  assert.match(
    read("src/components/pricing/request-early-access-cta.tsx"),
    /Founding access is available by request while we finish final rollout/,
  );
});

test("pricing page does not expose Freemius checkout buttons when disabled by default", () => {
  const checkoutCta = read("src/components/pricing/freemius-checkout-cta.tsx");
  const proCta = read("src/components/pricing/pro-plan-cta.tsx");
  assert.match(checkoutCta, /\/api\/freemius\/checkout/);
  assert.match(checkoutCta, /foundingCtaLabel|monthlyCtaLabel/);
  assert.match(checkoutCta, /annualCtaLabel/);
  assert.equal(freemiusPricingDisplay.annualCtaLabel.includes("Annual"), true);

  assert.equal(isPublicCheckoutEnabled(process.env), false);
  assert.equal(
    isPublicCheckoutEnabled({ PUBLIC_CHECKOUT_ENABLED: "false" }),
    false,
  );
  assert.match(proCta, /return <RequestEarlyAccessCta/);
});

test("checkout enabled + founding active shows Founding + Annual CTAs only", () => {
  assert.equal(freemiusFoundingOfferActive, true);
  assert.equal(
    freemiusPricingDisplay.foundingCtaLabel,
    "Get Founding Pro — $4.90/month",
  );
  assert.equal(
    freemiusPricingDisplay.annualCtaLabel,
    "Get Pro Annual — $99/year",
  );
  assert.equal(
    freemiusPricingDisplay.sectionTopLine,
    "Founding offer for the first 20 customers.",
  );
  assert.equal(
    freemiusPricingDisplay.billingOptionFoundingPrice,
    "$4.90/month",
  );
  assert.equal(
    freemiusPricingDisplay.billingOptionFoundingDetail,
    "First 20 customers. Discount applied automatically.",
  );
  assert.equal(freemiusPricingDisplay.billingOptionAnnualPrice, "$99/year");
  assert.equal(freemiusPricingDisplay.billingOptionAnnualDetail, "Save 16%");
  assert.equal(
    freemiusPricingDisplay.regularMonthlyLabel,
    "Regular monthly price",
  );

  const checkoutCta = read("src/components/pricing/freemius-checkout-cta.tsx");
  const proPricing = read("src/components/pricing/freemius-pro-pricing.tsx");
  const pricingPage = read("src/app/(public)/pricing/page.tsx");
  const landing = read("src/components/landing/pricing-section.tsx");
  const pricingDisplay = read("src/config/pricing-display.ts");

  assert.match(pricingPage, /sectionTopLine/);
  assert.match(landing, /sectionTopLine/);
  assert.match(checkoutCta, /foundingCtaLabel/);
  assert.match(checkoutCta, /annualCtaLabel/);
  assert.match(checkoutCta, /startCheckout\("founding", "monthly", true\)/);
  assert.match(checkoutCta, /startCheckout\("annual", "annual"\)/);
  assert.match(checkoutCta, /foundingPrimary/);
  // Buttons only — no pricing subcopy under CTAs.
  assert.doesNotMatch(checkoutCta, /billingOptionFoundingDetail/);
  assert.doesNotMatch(checkoutCta, /foundingOfferCopy/);
  assert.match(
    checkoutCta,
    /foundingPrimary \? \([\s\S]*foundingCtaLabel[\s\S]*\) : \([\s\S]*monthlyCtaLabel/,
  );

  // Compact billing-options block (not floating “or $99” line).
  assert.match(proPricing, /data-billing-options/);
  assert.match(proPricing, /billingOptionFoundingTitle/);
  assert.match(proPricing, /billingOptionFoundingPrice/);
  assert.match(proPricing, /billingOptionFoundingDetail/);
  assert.match(proPricing, /billingOptionAnnualTitle/);
  assert.match(proPricing, /billingOptionAnnualPrice/);
  assert.match(proPricing, /billingOptionAnnualDetail/);
  assert.match(proPricing, /regularMonthlyLabel/);
  assert.doesNotMatch(proPricing, /or \{\s*$|or&nbsp;|or \{"/);
  assert.doesNotMatch(proPricing, />or </);

  assert.match(
    pricingDisplay,
    /For creators and indie makers who need more drafts, templates, and export tools/,
  );

  assert.equal(freemiusPricingDisplay.monthlyPrice, "$9.90");
  assert.equal(freemiusPricingDisplay.annualPrice, "$99");
  assert.equal(freemiusPricingDisplay.foundingMonthlyPrice, "$4.90");
});

test("enabled founding copy is split by surface without duplication noise", () => {
  const top = freemiusPricingDisplay.sectionTopLine;
  const card =
    freemiusPricingDisplay.regularMonthlyLabel +
    freemiusPricingDisplay.monthlyPrice +
    freemiusPricingDisplay.billingOptionFoundingTitle +
    freemiusPricingDisplay.billingOptionFoundingPrice +
    freemiusPricingDisplay.billingOptionFoundingDetail +
    freemiusPricingDisplay.billingOptionAnnualTitle +
    freemiusPricingDisplay.billingOptionAnnualPrice +
    freemiusPricingDisplay.billingOptionAnnualDetail;
  const ctas =
    freemiusPricingDisplay.foundingCtaLabel +
    freemiusPricingDisplay.annualCtaLabel;

  assert.match(top, /first 20 customers/i);
  assert.doesNotMatch(top, /Discount applied automatically/i);
  assert.match(card, /\$9\.90/);
  assert.match(card, /Regular monthly price/);
  assert.match(card, /Founding monthly/);
  assert.match(card, /\$4\.90\/month/);
  assert.match(card, /First 20 customers\. Discount applied automatically\./);
  assert.match(card, /Annual/);
  assert.match(card, /\$99\/year/);
  assert.match(card, /Save 16%/);
  assert.doesNotMatch(card, /or \$99 \/ per year/i);
  assert.match(ctas, /Get Founding Pro — \$4\.90\/month/);
  assert.match(ctas, /Get Pro Annual — \$99\/year/);
  assert.doesNotMatch(ctas, /Get Pro Monthly — \$9\.90/);
  assert.doesNotMatch(ctas, /first 20|Discount applied automatically|Save 16%/i);
  assert.doesNotMatch(top + card + ctas, /spots? left|Use code FOUNDING20/i);
});

test("checkout client builds founding coupon only for founding; annual has no coupon", () => {
  assert.deepEqual(buildFreemiusCheckoutRequestBody("monthly"), {
    interval: "monthly",
  });
  assert.deepEqual(buildFreemiusCheckoutRequestBody("annual"), {
    interval: "annual",
  });
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
  assert.deepEqual(
    buildFreemiusCheckoutRequestBody("annual", { founding: true }),
    { interval: "annual" },
  );

  const checkoutCta = read("src/components/pricing/freemius-checkout-cta.tsx");
  assert.match(checkoutCta, /fetch\("\/api\/freemius\/checkout"/);
  assert.match(checkoutCta, /startCheckout\("founding", "monthly", true\)/);
  assert.match(checkoutCta, /startCheckout\("annual", "annual"\)/);
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
  assert.match(billingPage, /Freemius Customer Portal/);
  assert.match(billingPage, /Never received your password/);

  const manager = read("src/components/settings/subscription-manager.tsx");
  assert.match(manager, /Manage billing in Freemius/);
  assert.match(manager, /Freemius Customer Portal/);
  assert.match(manager, /separate Freemius password/i);
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
