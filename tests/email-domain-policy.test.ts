/**
 * Email domain registration policy.
 * Run: npx tsx --test tests/email-domain-policy.test.ts
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  EMAIL_DOMAIN_BLOCKED_DISPOSABLE_MESSAGE,
  evaluateEmailDomainPolicy,
  getEmailDomainPolicyMode,
} from "../src/config/email-domain-policy";

test("default policy mode is block_disposable", () => {
  assert.equal(getEmailDomainPolicyMode({}), "block_disposable");
  assert.equal(
    getEmailDomainPolicyMode({ EMAIL_DOMAIN_POLICY: "trusted_only" }),
    "trusted_only",
  );
});

test("block_disposable blocks known temporary domains", () => {
  const r = evaluateEmailDomainPolicy("abuse@mailinator.com", {
    EMAIL_DOMAIN_POLICY: "block_disposable",
  });
  assert.equal(r.allowed, false);
  if (!r.allowed) {
    assert.equal(r.message, EMAIL_DOMAIN_BLOCKED_DISPOSABLE_MESSAGE);
  }
});

test("block_disposable allows gmail outlook proton and custom domains", () => {
  const env = { EMAIL_DOMAIN_POLICY: "block_disposable" };
  for (const email of [
    "user@gmail.com",
    "user@outlook.com",
    "user@proton.me",
    "founder@creatornivo.com",
    "dev@my-startup.io",
  ]) {
    assert.equal(
      evaluateEmailDomainPolicy(email, env).allowed,
      true,
      email,
    );
  }
});

test("trusted_only allows common providers and blocks custom domains", () => {
  const env = { EMAIL_DOMAIN_POLICY: "trusted_only" };
  assert.equal(evaluateEmailDomainPolicy("a@gmail.com", env).allowed, true);
  assert.equal(evaluateEmailDomainPolicy("a@protonmail.com", env).allowed, true);
  assert.equal(
    evaluateEmailDomainPolicy("a@random-startup.xyz", env).allowed,
    false,
  );
});

test("open mode allows disposable (not recommended for prod)", () => {
  assert.equal(
    evaluateEmailDomainPolicy("x@yopmail.com", {
      EMAIL_DOMAIN_POLICY: "open",
    }).allowed,
    true,
  );
});

test("BLOCKED_EMAIL_DOMAINS always applies", () => {
  const r = evaluateEmailDomainPolicy("me@evil.example", {
    EMAIL_DOMAIN_POLICY: "open",
    BLOCKED_EMAIL_DOMAINS: "evil.example",
  });
  assert.equal(r.allowed, false);
});
