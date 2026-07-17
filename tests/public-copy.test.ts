import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { pricingPlans } from "../src/config/pricing-display";

const publicCopyFiles = [
  "src/app/(public)/pricing/page.tsx",
  "src/app/(protected)/templates/page.tsx",
  "src/components/landing/early-access-banner.tsx",
  "src/components/landing/explore-templates-section.tsx",
  "src/components/landing/hero-section.tsx",
  "src/components/landing/how-it-works-section.tsx",
  "src/components/landing/pricing-section.tsx",
  "src/components/landing/showcase-section.tsx",
  "src/components/landing/social-proof-section.tsx",
  "src/components/pricing/pro-plan-pricing.tsx",
  "src/components/pricing/request-early-access-cta.tsx",
  "src/components/pricing/upgrade-button.tsx",
  "src/config/early-access.ts",
  "src/config/featured-templates.ts",
  "src/config/pricing-display.ts",
] as const;

function readPublicCopy(): string {
  return publicCopyFiles
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
}

test("public product copy contains no unsupported performance or social-proof claims", () => {
  const copy = readPublicCopy();

  for (const unsupported of [
    /10x/i,
    /battle-tested/i,
    /\bproven\b/i,
    /publish-ready/i,
    /under a minute/i,
    /priority support/i,
    /priority models/i,
    /unlimited generations/i,
    /creators signed up/i,
    /average rating/i,
    /testimonials/i,
    /trusted by/i,
    /loved by/i,
  ]) {
    assert.doesNotMatch(copy, unsupported);
  }
});

test("Early Access copy uses a neutral limited-time founding price", () => {
  const copy = readPublicCopy();

  assert.doesNotMatch(
    copy,
    /first 50|first users|50 spots|spots? left|spots? run out|claim your spot|countdown/i,
  );
  assert.match(
    copy,
    /Early Access founding price — available for a limited time\./,
  );
  assert.match(copy, /discountPercent: 50/);
});

test("public Pro CTA is request-early-access mailto, not live checkout", () => {
  const pricingPage = readFileSync("src/app/(public)/pricing/page.tsx", "utf8");
  const landingPricing = readFileSync(
    "src/components/landing/pricing-section.tsx",
    "utf8",
  );
  const cta = readFileSync(
    "src/components/pricing/request-early-access-cta.tsx",
    "utf8",
  );

  for (const source of [pricingPage, landingPricing]) {
    assert.match(source, /RequestEarlyAccessCta/);
    assert.doesNotMatch(source, /UpgradeButton/);
  }

  assert.match(cta, /Request Early Access/);
  assert.match(
    cta,
    /mailto:\$\{siteConfig\.legal\.billingEmail\}\?subject=CreatorNivo%20Early%20Access/,
  );
  assert.match(
    cta,
    /Paid checkout is temporarily unavailable while we finalize our payment provider/,
  );
  assert.doesNotMatch(cta, /Checkout powered by Paddle/i);
  assert.doesNotMatch(pricingPage, /Checkout powered by Paddle/i);
  assert.doesNotMatch(landingPricing, /Checkout powered by Paddle/i);
});

test("public plan copy matches implemented Free and Pro limits", () => {
  const pricing = readFileSync("src/config/pricing-display.ts", "utf8");
  const free = pricingPlans.find((plan) => plan.id === "free");
  const pro = pricingPlans.find((plan) => plan.id === "pro");

  assert.ok(free?.features.includes("5 generations per day"));
  assert.ok(pro?.features.includes("100 generations per month"));
  assert.match(pricing, /Up to \$\{planLimits\.free\.maxSavedPrompts\}/);
  assert.match(pricing, /Unlimited saved prompts/);
  assert.match(pricing, /GPT-5\.6 generation/);
  assert.doesNotMatch(pricing, /GPT-4o/i);
  assert.doesNotMatch(pricing, /\bSol\b/);
  assert.match(pricing, /Export to \.md and \.txt/);
  assert.match(pricing, /Email support/);
});
