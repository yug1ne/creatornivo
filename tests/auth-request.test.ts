import assert from "node:assert/strict";
import test from "node:test";

import {
  getClientIp,
  getRateLimitClientKey,
} from "../src/lib/auth/request";

test("getClientIp prefers the first forwarded address", () => {
  const request = new Request("https://www.creatornivo.com/api/auth/register", {
    headers: {
      "x-forwarded-for": "203.0.113.10, 198.51.100.20",
    },
  });

  assert.equal(getClientIp(request), "203.0.113.10");
});

test("getClientIp reads x-vercel-forwarded-for before x-forwarded-for", () => {
  const request = new Request("https://www.creatornivo.com/api/auth/register", {
    headers: {
      "x-vercel-forwarded-for": "203.0.113.44",
      "x-forwarded-for": "198.51.100.20",
    },
  });

  assert.equal(getClientIp(request), "203.0.113.44");
});

test("getRateLimitClientKey falls back to unknown-ip", () => {
  const request = new Request("https://www.creatornivo.com/api/auth/register");
  assert.equal(getRateLimitClientKey(request), "unknown-ip");
});