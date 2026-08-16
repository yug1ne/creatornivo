import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  APPSUMO_CODE_LENGTH,
  APPSUMO_TIER1_GENERATION_LIMIT,
  APPSUMO_TIER2_GENERATION_LIMIT,
  getAppSumoGenerationPolicy,
  getAppSumoPeriodKey,
  getAppSumoMonthWindow,
} from "../src/config/appsumo";
import {
  generateUniqueAppSumoCodes,
  normalizeAppSumoCode,
} from "../src/lib/appsumo/codes";
import { shouldShowAppSumoLifetimePresentation } from "../src/components/settings/subscription-manager";
import { resolveUserAccess } from "../src/lib/trial/access";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

test("AppSumo period key is prefixed and never YYYY-MM alone", () => {
  const now = new Date("2026-09-15T12:00:00.000Z");
  assert.equal(getAppSumoPeriodKey(now), "appsumo:2026-09");
  const window = getAppSumoMonthWindow(now);
  assert.equal(window.start.toISOString(), "2026-09-01T00:00:00.000Z");
  assert.equal(window.end.toISOString(), "2026-10-01T00:00:00.000Z");
});

test("AppSumo compute policy is Luna with reasoning none and no auto-repair", () => {
  const policy = getAppSumoGenerationPolicy({
    OPENAI_MODEL_PRO: "gpt-5.6-terra",
    OPENAI_MODEL_APPSUMO: "",
    APPSUMO_REASONING_EFFORT: "medium",
    ENABLE_GENERATION_AUTO_REPAIR: "true",
  });
  assert.equal(policy.model, "gpt-5.6-luna");
  assert.equal(policy.reasoningEffort, "none");
  assert.equal(policy.autoRepair, false);
  assert.equal(policy.maxInputChars, 12000);
});

test("AppSumo codes are 20 Crockford characters and normalize separators", () => {
  const codes = generateUniqueAppSumoCodes(5);
  assert.equal(codes.length, 5);
  assert.equal(new Set(codes).size, 5);
  for (const code of codes) {
    assert.equal(code.length, APPSUMO_CODE_LENGTH);
    assert.equal(normalizeAppSumoCode(code), code);
    assert.equal(
      normalizeAppSumoCode(
        `${code.slice(0, 5)}-${code.slice(5, 10)}-${code.slice(10, 15)}-${code.slice(15)}`.toLowerCase(),
      ),
      code,
    );
  }
  assert.equal(normalizeAppSumoCode("short"), null);
});

test("resolver grants AppSumo save/export without upgrading Trial", () => {
  const now = new Date("2026-08-13T10:00:00.000Z");
  const trial = resolveUserAccess(
    {
      plan: "free",
      emailVerified: now,
      trialStartedAt: new Date("2026-08-12T10:00:00.000Z"),
      trialEndsAt: new Date("2026-08-15T10:00:00.000Z"),
    },
    { now },
  );
  assert.equal(trial.canExport, false);
  assert.equal(trial.maxSavedPrompts, 10);

  const t1 = resolveUserAccess(
    {
      plan: "free",
      emailVerified: now,
      trialStartedAt: null,
      trialEndsAt: null,
    },
    { now, activeAppSumoCodeCount: 1 },
  );
  assert.equal(t1.mode, "appsumo_t1");
  assert.equal(t1.canExport, true);
  assert.equal(t1.quota.limit, APPSUMO_TIER1_GENERATION_LIMIT);

  const t2 = resolveUserAccess(
    {
      plan: "free",
      emailVerified: now,
      trialStartedAt: null,
      trialEndsAt: null,
    },
    { now, activeAppSumoCodeCount: 2 },
  );
  assert.equal(t2.mode, "appsumo_t2");
  assert.equal(t2.quota.limit, APPSUMO_TIER2_GENERATION_LIMIT);
});

test("public marketing surfaces do not advertise AppSumo", () => {
  const surfaces = [
    "src/app/(public)/pricing/page.tsx",
    "src/components/landing/pricing-section.tsx",
    "src/components/layout/header.tsx",
    "src/components/layout/footer.tsx",
    "src/lib/seo/public-site.ts",
  ]
    .map((path) => source(path))
    .join("\n");

  assert.doesNotMatch(surfaces, /href=["'{`]\/appsumo/);
  const seo = source("src/lib/seo/public-site.ts");
  assert.match(seo, /PUBLIC_ROBOTS_DISALLOW[\s\S]*\/appsumo/);
  const sitemapBlock = seo.slice(
    seo.indexOf("PUBLIC_SITEMAP_STATIC_PATHS"),
    seo.indexOf("getPublicSitemapPaths"),
  );
  assert.doesNotMatch(sitemapBlock, /appsumo/);
});

test("Freemius files stay billing-only and Plan enum has no AppSumo", () => {
  const planEnum = source("prisma/schema.prisma").match(/enum Plan\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.doesNotMatch(planEnum, /appsumo/i);
  assert.match(source("prisma/schema.prisma"), /model AppSumoCode/);
  assert.match(source("prisma/schema.prisma"), /onDelete: SetNull/);
  assert.doesNotMatch(source("src/config/freemius.ts"), /appsumo/i);
  assert.doesNotMatch(
    source("src/lib/freemius/subscription-service.ts"),
    /appsumo/i,
  );
});

test("generate route skips UserUsage for AppSumo and uses Luna policy", () => {
  const route = source("src/app/api/ai/generate/route.ts");
  assert.match(route, /isAppSumoAccessMode\(access\.mode\)/);
  assert.match(route, /appsumoPeriod:/);
  assert.match(route, /reasoningEffort:/);
  assert.match(route, /access\.generationPolicy\.autoRepair/);
});

test("AppSumo Settings and sidebar do not treat lifetime users as ordinary Free", () => {
  const settings = source("src/app/(protected)/settings/page.tsx");
  const manager = source("src/components/settings/subscription-manager.tsx");
  const sidebar = source("src/components/layout/sidebar.tsx");
  const layout = source("src/app/(protected)/layout.tsx");
  const redeem = source("src/components/appsumo/appsumo-redeem-form.tsx");

  assert.match(settings, /Billing plan/);
  assert.match(settings, /Lifetime access/);
  assert.match(settings, /appSumoTier=\{access\?\.appSumo\.tier/);
  assert.match(manager, /AppSumo Lifetime Access is your active entitlement/);
  assert.match(manager, /Optional subscription/);
  assert.match(manager, /View Pro options/);
  assert.match(manager, /showAppSumoLifetime/);
  assert.doesNotMatch(
    manager,
    /showAppSumoLifetime[\s\S]{0,80}Upgrade to Pro/,
  );
  assert.match(sidebar, /showUpgradeCard/);
  assert.match(layout, /isAppSumoAccessMode\(access\.mode\)/);
  assert.match(layout, /showUpgradeCard=\{showUpgradeCard\}/);
  assert.match(redeem, /router\.push\(APPSUMO_REDEEM_SUCCESS_REDIRECT_HREF\)/);
  assert.match(redeem, /if \(!response\.ok\)/);
  assert.doesNotMatch(redeem, /if \(!response\.ok\)[\s\S]{0,200}router\.push/);

  assert.equal(
    shouldShowAppSumoLifetimePresentation({
      isPro: false,
      appSumoTier: 1,
      appSumoDormant: false,
    }),
    true,
  );
  assert.equal(
    shouldShowAppSumoLifetimePresentation({
      isPro: false,
      appSumoTier: 2,
      appSumoDormant: false,
    }),
    true,
  );
  assert.equal(
    shouldShowAppSumoLifetimePresentation({
      isPro: false,
      appSumoTier: 0,
    }),
    false,
  );
  assert.equal(
    shouldShowAppSumoLifetimePresentation({
      isPro: true,
      appSumoTier: 1,
      appSumoDormant: true,
    }),
    false,
  );
});

test("AppSumo migration is additive and revokes Data API access", () => {
  const migration = source(
    "prisma/migrations/20260816120000_add_appsumo_lifetime_codes/migration.sql",
  );
  assert.match(migration, /CREATE TABLE "AppSumoCode"/);
  assert.match(migration, /CREATE TABLE "AppSumoRedemption"/);
  assert.match(migration, /CREATE TABLE "AppSumoAuditEvent"/);
  assert.match(migration, /ON DELETE SET NULL/);
  assert.match(migration, /REVOKE ALL ON TABLE public\."AppSumoCode"/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.doesNotMatch(
    migration,
    /(?:^|\n)\s*(?:DROP|DELETE|TRUNCATE|UPDATE)\b/,
  );
});
