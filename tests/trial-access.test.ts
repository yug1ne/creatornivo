import assert from "node:assert/strict";
import test from "node:test";

import {
  isActiveTrial,
  resolveUserAccess,
} from "../src/lib/trial/access";
import {
  TRIAL_DURATION_HOURS,
  TRIAL_DURATION_MS,
  TRIAL_GENERATION_LIMIT,
  getTrialPeriodKey,
} from "../src/config/trial";

const startedAt = new Date("2026-08-12T10:00:00.000Z");
const endsAt = new Date(startedAt.getTime() + TRIAL_DURATION_MS);

test("trial configuration is exactly 72 hours and 30 completions", () => {
  assert.equal(TRIAL_DURATION_HOURS, 72);
  assert.equal(TRIAL_DURATION_MS, 72 * 60 * 60 * 1000);
  assert.equal(TRIAL_GENERATION_LIMIT, 30);
  assert.equal(
    getTrialPeriodKey(startedAt),
    "trial:2026-08-12T10:00:00.000Z",
  );
});

test("verified Free user has trial access only inside the fixed window", () => {
  const user = {
    plan: "free" as const,
    emailVerified: new Date("2026-08-12T09:59:00.000Z"),
    trialStartedAt: startedAt,
    trialEndsAt: endsAt,
  };

  assert.equal(isActiveTrial(user, startedAt), true);
  assert.equal(
    isActiveTrial(user, new Date(endsAt.getTime() - 1)),
    true,
  );
  assert.equal(isActiveTrial(user, endsAt), false);

  const active = resolveUserAccess(user, {
    now: new Date("2026-08-13T10:00:00.000Z"),
  });
  assert.equal(active.billingPlan, "free");
  assert.equal(active.mode, "trial");
  assert.equal(active.canUseProTemplates, true);

  const expired = resolveUserAccess(user, { now: endsAt });
  assert.equal(expired.mode, "free");
  assert.equal(expired.canUseProTemplates, false);
});

test("unverified accounts cannot start trial access", () => {
  const access = resolveUserAccess(
    {
      plan: "free",
      emailVerified: null,
      trialStartedAt: startedAt,
      trialEndsAt: endsAt,
    },
    { now: startedAt },
  );

  assert.equal(access.mode, "free");
  assert.equal(access.canUseProTemplates, false);
});

test("paid Pro always takes precedence over an overlapping trial window", () => {
  const access = resolveUserAccess(
    {
      plan: "pro",
      emailVerified: startedAt,
      trialStartedAt: startedAt,
      trialEndsAt: endsAt,
    },
    { now: new Date("2026-08-13T10:00:00.000Z") },
  );

  assert.equal(access.billingPlan, "pro");
  assert.equal(access.mode, "paid_pro");
  assert.equal(access.canUseProTemplates, true);
  assert.equal(access.canExport, true);
});

test("trial keeps Free save/export while unlocking Pro templates", () => {
  const access = resolveUserAccess(
    {
      plan: "free",
      emailVerified: startedAt,
      trialStartedAt: startedAt,
      trialEndsAt: endsAt,
    },
    { now: new Date("2026-08-13T10:00:00.000Z") },
  );

  assert.equal(access.mode, "trial");
  assert.equal(access.canUseProTemplates, true);
  assert.equal(access.canExport, false);
  assert.equal(access.maxSavedPrompts, 10);
});

test("AppSumo precedes trial and stays dormant under paid Pro", () => {
  const trialUser = {
    plan: "free" as const,
    emailVerified: startedAt,
    trialStartedAt: startedAt,
    trialEndsAt: endsAt,
  };

  const appsumo = resolveUserAccess(trialUser, {
    now: new Date("2026-08-13T10:00:00.000Z"),
    activeAppSumoCodeCount: 1,
  });
  assert.equal(appsumo.mode, "appsumo_t1");
  assert.equal(appsumo.canExport, true);
  assert.equal(appsumo.maxSavedPrompts, Number.POSITIVE_INFINITY);
  assert.equal(appsumo.quota.periodKey.startsWith("appsumo:"), true);
  assert.equal(appsumo.generationPolicy.model.includes("luna"), true);
  assert.equal(appsumo.generationPolicy.reasoningEffort, "none");
  assert.equal(appsumo.generationPolicy.autoRepair, false);

  const stacked = resolveUserAccess(trialUser, {
    now: new Date("2026-08-13T10:00:00.000Z"),
    activeAppSumoCodeCount: 2,
  });
  assert.equal(stacked.mode, "appsumo_t2");
  assert.equal(stacked.quota.limit, 100);

  const pro = resolveUserAccess(
    {
      plan: "pro",
      emailVerified: startedAt,
      trialStartedAt: startedAt,
      trialEndsAt: endsAt,
    },
    { activeAppSumoCodeCount: 2 },
  );
  assert.equal(pro.mode, "paid_pro");
  assert.equal(pro.appSumo.dormant, true);
  assert.equal(pro.appSumo.tier, 2);
});
