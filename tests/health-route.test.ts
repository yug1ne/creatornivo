import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("health route exposes auth rate limit config signal without secrets", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/app/api/health/route.ts"),
    "utf8",
  );

  assert.match(source, /isAuthRateLimitEnabled/);
  assert.match(source, /authRateLimit/);
  assert.match(source, /configured/);
  assert.match(source, /not_configured/);
  assert.doesNotMatch(source, /UPSTASH_REDIS_REST_TOKEN/);
  assert.doesNotMatch(source, /UPSTASH_REDIS_REST_URL/);
  assert.doesNotMatch(source, /process\.env\.UPSTASH/);
});

test("health route does not degrade overall status solely for missing rate limit config", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/app/api/health/route.ts"),
    "utf8",
  );

  // Overall status remains driven by database probe only.
  assert.match(
    source,
    /const status: HealthStatus = databaseOk \? "ok" : "degraded"/,
  );
  assert.match(source, /const httpStatus = databaseOk \? 200 : 503/);
});
