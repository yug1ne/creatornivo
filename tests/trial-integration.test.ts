import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { postVerifyEmail } from "../src/app/api/auth/verify-email/route";
import { fetchGenerationUsageSnapshot } from "../src/components/generate/generate-workspace";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

test("email verification activates an already claimed invite", async () => {
  let activatedUserId = "";
  const response = await postVerifyEmail(
    new Request("http://localhost/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "verification-token" }),
    }),
    {
      verify: async () => ({
        userId: "user-1",
        email: "person@example.com",
        alreadyVerified: false,
      }),
      activateClaimedTrial: async (userId) => {
        activatedUserId = userId;
        return {
          status: "activated",
          trialStartedAt: new Date("2026-08-12T10:00:00.000Z"),
          trialEndsAt: new Date("2026-08-15T10:00:00.000Z"),
        };
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(activatedUserId, "user-1");
  assert.equal((await response.json()).trialStatus, "activated");
});

test("Generate restores the trial quota and deadline from the server", async () => {
  const usage = await fetchGenerationUsageSnapshot(async () =>
    Response.json({
      plan: "free",
      accessMode: "trial",
      remaining: 19,
      limit: 30,
      period: "trial",
      resetAt: "2026-08-15T10:00:00.000Z",
      trialEndsAt: "2026-08-15T10:00:00.000Z",
      used: 11,
      quotaBasis: "trial",
    }),
  );

  assert.deepEqual(usage, {
    plan: "free",
    accessMode: "trial",
    remaining: 19,
    limit: 30,
    period: "trial",
    resetAt: "2026-08-15T10:00:00.000Z",
    trialEndsAt: "2026-08-15T10:00:00.000Z",
    used: 11,
    quotaBasis: "trial",
  });
});

test("registration preserves the private activation callback for credentials and Google", () => {
  const register = source("src/components/auth/register-form.tsx");
  assert.match(register, /getSafeCallbackUrl\(/);
  assert.match(register, /searchParams\.get\("callbackUrl"\)/);
  assert.match(register, /router\.push\(callbackUrl\)/);
  assert.match(register, /<GoogleSignInButton[\s\S]*callbackUrl=\{callbackUrl\}/);
  assert.doesNotMatch(register, /callbackUrl="\/dashboard\?onboarding=start"/);
});

test("private invite route uses a secure HttpOnly Lax cookie and clean redirect", () => {
  const route = source("src/app/(public)/try/[inviteCode]/route.ts");
  assert.match(route, /validateTrialInviteToken/);
  assert.match(route, /new URL\("\/try", request\.url\)/);
  assert.match(route, /httpOnly:\s*true/);
  assert.match(route, /sameSite:\s*"lax"/);
  assert.match(route, /secure:\s*process\.env\.NODE_ENV === "production"/);
  assert.match(route, /X-Robots-Tag[\s\S]*noindex, nofollow, noarchive/);
  assert.doesNotMatch(route, /console\.(?:log|info|warn|error).*token/i);
});

test("trial is not a billing Plan and migration is additive", () => {
  const schema = source("prisma/schema.prisma");
  const migration = source(
    "prisma/migrations/20260812120000_add_invite_only_trials/migration.sql",
  );

  const planEnum = schema.match(/enum Plan\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.doesNotMatch(planEnum, /trial/i);
  assert.match(schema, /model TrialInvite/);
  assert.match(schema, /tokenHash\s+String\s+@unique/);
  assert.match(schema, /claimedByUserId\s+String\?\s+@unique/);
  assert.doesNotMatch(
    migration,
    /(?:^|\n)\s*(?:DROP|DELETE|TRUNCATE|UPDATE)\b|ALTER\s+(?:COLUMN|TYPE)/i,
  );
  assert.match(migration, /ADD COLUMN "trialStartedAt"/);
  assert.match(migration, /CREATE TABLE "TrialInvite"/);
});

test("trial entitlements are isolated from billing and Free capabilities", () => {
  const generateRoute = source("src/app/api/ai/generate/route.ts");
  const access = source("src/lib/trial/access.ts");
  const workspacePage = source("src/app/(protected)/generate/page.tsx");

  assert.match(access, /billingPlan:\s*user\.plan/);
  assert.match(access, /canUseProTemplates:/);
  assert.match(generateRoute, /plan:\s*user\.plan/);
  assert.match(generateRoute, /trialPeriod:/);
  assert.match(
    generateRoute,
    /if \(access\.mode === "trial"\) \{\s*return;\s*\}/,
  );
  assert.match(workspacePage, /userPlan=\{user\.plan\}/);
  assert.match(workspacePage, /canExport=\{canExportContent\(serverSession\)\}/);
});

test("trial UI is minimal and remains absent from public promotion surfaces", () => {
  const settings = source("src/app/(protected)/settings/page.tsx");
  const usageBanner = source("src/components/generate/usage-banner.tsx");
  const publicSurfaces = [
    "src/app/sitemap.ts",
    "src/components/layout/header.tsx",
    "src/components/layout/footer.tsx",
    "src/components/landing/pricing-section.tsx",
  ]
    .map((path) => source(path))
    .join("\n");

  assert.match(settings, /Plan/);
  assert.match(settings, /Trial/);
  assert.match(settings, /Active until/);
  assert.match(usageBanner, /Trial active/);
  assert.doesNotMatch(publicSurfaces, /href=["'{`]\/try(?:\/|["'}`])/i);
});

test("owner CLI prints the private URL once and can revoke or inspect", () => {
  const script = source("scripts/trial-invite.ts");
  const packageJson = JSON.parse(source("package.json")) as {
    scripts: Record<string, string>;
  };

  assert.match(packageJson.scripts["trial:invite"], /scripts\/trial-invite\.ts/);
  assert.match(script, /Private URL \(shown once\)/);
  assert.match(script, /revokeUnusedTrialInviteById/);
  assert.match(script, /Trial generations used/);
  assert.doesNotMatch(script, /console\.log\([^\n]*token\b/i);
});
