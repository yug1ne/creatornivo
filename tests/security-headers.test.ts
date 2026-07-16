/**
 * Static verification of baseline security headers in next.config.
 * Run: npx tsx --test tests/security-headers.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const nextConfigSource = readFileSync("next.config.ts", "utf8");

test("next.config defines headers() for all paths", () => {
  assert.match(nextConfigSource, /async headers\s*\(/);
  assert.match(nextConfigSource, /source:\s*["']\/:path\*["']/);
});

test("baseline security headers are present", () => {
  assert.match(
    nextConfigSource,
    /X-Content-Type-Options["']\s*,\s*value:\s*["']nosniff["']/,
  );
  assert.match(
    nextConfigSource,
    /Referrer-Policy["']\s*,\s*value:\s*["']strict-origin-when-cross-origin["']/,
  );
  assert.match(
    nextConfigSource,
    /Permissions-Policy["']\s*,\s*value:\s*["']camera=\(\),\s*microphone=\(\),\s*geolocation=\(\)["']/,
  );
  assert.match(
    nextConfigSource,
    /X-Frame-Options["']\s*,\s*value:\s*["']DENY["']/,
  );
});

test("strict Content-Security-Policy is not enabled yet", () => {
  assert.doesNotMatch(
    nextConfigSource,
    /Content-Security-Policy|content-security-policy/,
  );
});

test("security headers are not applied only in middleware (config-level coverage)", () => {
  const middleware = readFileSync("src/middleware.ts", "utf8");
  // Headers live in next.config so early middleware returns still get them from Next.
  assert.doesNotMatch(middleware, /X-Content-Type-Options|Permissions-Policy/);
  assert.match(nextConfigSource, /securityHeaders/);
});
