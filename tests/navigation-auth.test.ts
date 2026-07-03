import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getSafeCallbackUrl } from "../src/lib/auth/callback-url";
import { mapCheckoutError } from "../src/hooks/use-paddle-checkout";

test("dashboard to pricing navigation is relative and keeps the hostname", () => {
  for (const file of [
    "src/app/(protected)/dashboard/page.tsx",
    "src/components/layout/sidebar.tsx",
    "src/components/settings/subscription-manager.tsx",
    "src/components/generate/usage-banner.tsx",
  ]) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /href=["']https?:\/\//);
  }
  assert.match(
    readFileSync("src/components/layout/sidebar.tsx", "utf8"),
    /href="\/pricing"/,
  );
});

test("public header is session-aware for authenticated users", () => {
  const source = readFileSync("src/components/layout/header.tsx", "utf8");
  assert.match(source, /useSession/);
  assert.match(source, /href="\/dashboard"/);
  assert.match(source, /href="\/settings"/);
  assert.match(source, /Sign out/);
});

test("checkout request uses the current origin and same-origin cookies", () => {
  const source = readFileSync("src/hooks/use-paddle-checkout.ts", "utf8");
  assert.match(source, /fetch\("\/api\/paddle\/checkout"/);
  assert.match(source, /credentials: "same-origin"/);
  assert.doesNotMatch(source, /fetch\("https?:\/\//);
  assert.match(source, /if \(inFlightRef\.current\) return/);
});

test("checkout errors are mapped to actionable safe messages", () => {
  assert.equal(mapCheckoutError(401, {}).code, "session_expired");
  assert.match(mapCheckoutError(401, {}).message, /sign in again/i);
  assert.equal(
    mapCheckoutError(503, { code: "billing_not_configured" }).code,
    "billing_not_configured",
  );
  assert.match(
    mapCheckoutError(503, { code: "billing_not_configured" }).message,
    /temporarily unavailable/i,
  );
  assert.match(
    mapCheckoutError(502, { code: "paddle_forbidden" }).message,
    /permissions/i,
  );
  assert.equal(
    mapCheckoutError(409, {
      code: "subscription_already_active",
    }).code,
    "subscription_already_active",
  );
  assert.match(
    readFileSync("src/app/api/paddle/checkout/route.ts", "utf8"),
    /code: "paddle_forbidden"/,
  );
});

test("login callback only accepts internal relative paths", () => {
  assert.equal(getSafeCallbackUrl("/pricing"), "/pricing");
  assert.equal(
    getSafeCallbackUrl("https://attacker.example/pricing"),
    "/dashboard",
  );
  assert.equal(getSafeCallbackUrl("//attacker.example"), "/dashboard");
});

test("canonical host redirect is permanent without redirecting API POST", () => {
  const source = readFileSync("src/middleware.ts", "utf8");
  assert.match(source, /CANONICAL_HOST = "www\.creatornivo\.com"/);
  assert.match(source, /request\.method === "GET"/);
  assert.match(source, /NextResponse\.redirect\(canonicalUrl, 308\)/);
});

test("sandbox card text is environment-gated", () => {
  const source = readFileSync(
    "src/components/pricing/upgrade-button.tsx",
    "utf8",
  );
  assert.match(source, /paddleEnvironment === "sandbox"/);
});
