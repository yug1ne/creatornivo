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

  // No fake marketing cookie CTA in public marketing surfaces.
  assert.doesNotMatch(copy, /Accept All Cookies/i);
  assert.doesNotMatch(copy, /CookieBanner|cookie-consent-banner/i);
});

test("Early Access copy uses a neutral limited-time founding price", () => {
  const copy = readPublicCopy();

  assert.doesNotMatch(
    copy,
    /first 50|first users|50 spots|spots? left|spots? run out|claim your spot|countdown/i,
  );
  // Disabled-mode founding lines are split by surface (top vs card).
  assert.match(copy, /Founding offer for the first 20 customers\./);
  assert.match(copy, /\$4\.90\/month for early customers\./);
  assert.match(copy, /Discount applied automatically at checkout\./);
  assert.doesNotMatch(copy, /Use code FOUNDING20 to get/i);
  assert.match(copy, /discountPercent: 50/);
  assert.match(copy, /price: "\$4\.90"/);
  assert.match(copy, /regularPrice: "\$9\.90"/);
});

test("checkout-disabled public Pro path shows $9.90 founding offer and Request Early Access", () => {
  const earlyAccess = readFileSync("src/config/early-access.ts", "utf8");
  const priceBlock = readFileSync(
    "src/components/pricing/pro-plan-price-block.tsx",
    "utf8",
  );
  const proCta = readFileSync("src/components/pricing/pro-plan-cta.tsx", "utf8");
  const proPricing = readFileSync(
    "src/components/pricing/pro-plan-pricing.tsx",
    "utf8",
  );
  const pricingPage = readFileSync(
    "src/app/(public)/pricing/page.tsx",
    "utf8",
  );

  assert.match(earlyAccess, /regularPrice: "\$9\.90"/);
  assert.match(earlyAccess, /price: "\$4\.90"/);
  assert.match(earlyAccess, /sectionTopLine: "Founding offer for the first 20/);
  assert.match(earlyAccess, /foundingCouponCopy: "\$4\.90\/month for early/);
  assert.match(earlyAccess, /Discount applied automatically at checkout\./);
  assert.doesNotMatch(earlyAccess, /Use code FOUNDING20 to get/i);
  assert.match(pricingPage, /sectionTopLine/);
  assert.match(priceBlock, /isAvailable:\s*true/);
  assert.match(proPricing, /status\.regularPrice/);
  assert.match(proPricing, /foundingCouponCopy/);
  assert.match(proCta, /RequestEarlyAccessCta/);
  assert.match(proCta, /if \(isPublicCheckoutEnabled\(\)\)/);
  assert.doesNotMatch(proCta, /FREEMIUS_RESTRICTED/);
});

test("public Pro CTA is request-early-access mailto when public checkout is disabled", () => {
  const pricingPage = readFileSync("src/app/(public)/pricing/page.tsx", "utf8");
  const landingPricing = readFileSync(
    "src/components/landing/pricing-section.tsx",
    "utf8",
  );
  const cta = readFileSync(
    "src/components/pricing/request-early-access-cta.tsx",
    "utf8",
  );
  const proPlanCta = readFileSync(
    "src/components/pricing/pro-plan-cta.tsx",
    "utf8",
  );

  // Pages use ProPlanCta switch (not raw UpgradeButton / Paddle).
  for (const source of [pricingPage, landingPricing]) {
    assert.match(source, /ProPlanCta/);
    assert.doesNotMatch(source, /UpgradeButton/);
    assert.doesNotMatch(source, /FREEMIUS_RESTRICTED_CHECKOUT/);
  }

  // Default path remains Request Early Access until PUBLIC_CHECKOUT_ENABLED=true.
  assert.match(proPlanCta, /isPublicCheckoutEnabled/);
  assert.match(proPlanCta, /RequestEarlyAccessCta/);
  assert.match(proPlanCta, /FreemiusCheckoutCta/);

  assert.match(cta, /Request Early Access/);
  assert.match(
    cta,
    /mailto:\$\{siteConfig\.legal\.billingEmail\}\?subject=CreatorNivo%20Early%20Access/,
  );
  assert.match(
    cta,
    /Founding access is available by request while we finish final rollout/,
  );
  assert.doesNotMatch(
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

  assert.ok(free?.features.includes("5 AI-assisted drafts per day"));
  assert.ok(pro?.features.includes("100 AI-assisted drafts per month"));
  assert.match(pricing, /Up to \$\{planLimits\.free\.maxSavedPrompts\}/);
  assert.match(pricing, /Unlimited saved drafts/);
  assert.match(pricing, /AI-assisted drafting \(GPT-5\.6\)/);
  assert.doesNotMatch(pricing, /GPT-4o/i);
  assert.doesNotMatch(pricing, /\bSol\b/);
  assert.match(pricing, /Export to \.md and \.txt/);
  assert.match(pricing, /Email support/);
});

test("public marketing copy frames AI-assisted template drafting, not open-ended generative AI", () => {
  const hero = readFileSync("src/components/landing/hero-section.tsx", "utf8");
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  const site = readFileSync("src/config/site.ts", "utf8");
  const social = readFileSync(
    "src/components/landing/social-proof-section.tsx",
    "utf8",
  );
  const screenshots = readFileSync(
    "src/components/landing/product-screenshots.tsx",
    "utf8",
  );
  const featured = readFileSync("src/config/featured-templates.ts", "utf8");
  const register = readFileSync("src/app/(public)/register/page.tsx", "utf8");

  assert.match(
    site,
    /AI-assisted text content SaaS for structured business drafts from predefined templates/,
  );
  assert.match(layout, /siteMetadata\.title/);
  assert.match(layout, /siteMetadata\.description/);
  assert.match(layout, /openGraph:/);
  assert.match(layout, /twitter:/);
  assert.match(
    hero,
    /AI-assisted text content workflow for marketers &amp; founders/,
  );
  assert.match(hero, /Draft business content faster/);
  assert.match(hero, /template-based/);
  assert.match(hero, /AI assistance/);
  assert.doesNotMatch(hero, /AI-native creators/);
  assert.doesNotMatch(hero, /Create content faster/);
  assert.match(social, /Less blank-page rewriting/);
  assert.match(social, /structured drafts you can finish/);
  assert.match(screenshots, /AI-assisted draft in progress/);
  assert.doesNotMatch(screenshots, /Streaming AI output/);
  assert.match(featured, /Template-Based Content Drafting for Marketers/);
  assert.doesNotMatch(featured, /AI Content Tools for Marketers/);
  assert.match(
    register,
    /start drafting with AI-assisted business templates/,
  );
});

test("homepage and root SEO/social metadata use CreatorNivo positioning title", () => {
  const site = readFileSync("src/config/site.ts", "utf8");
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  const home = readFileSync("src/app/(public)/page.tsx", "utf8");

  assert.match(
    site,
    /title: "CreatorNivo \| AI-assisted text content SaaS"/,
  );
  assert.match(
    site,
    /description:\s*"AI-assisted text content SaaS for structured business drafts from predefined templates\. Review, edit, and save drafts before use\."/,
  );
  assert.doesNotMatch(site, /AI Content Generator/i);
  assert.doesNotMatch(site, /Creative Generative AI/i);

  assert.match(layout, /openGraph:\s*\{[\s\S]*title: siteMetadata\.title/);
  assert.match(
    layout,
    /openGraph:\s*\{[\s\S]*description: siteMetadata\.description/,
  );
  assert.match(layout, /twitter:\s*\{[\s\S]*title: siteMetadata\.title/);
  assert.match(
    layout,
    /twitter:\s*\{[\s\S]*description: siteMetadata\.description/,
  );
  assert.match(layout, /default: siteMetadata\.title/);
  assert.match(layout, /description: siteMetadata\.description/);

  assert.match(home, /absolute: siteMetadata\.title/);
  assert.match(home, /description: siteMetadata\.description/);
  assert.match(home, /openGraph:/);
  assert.match(home, /twitter:/);
});
