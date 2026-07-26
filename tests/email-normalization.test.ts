/**
 * Email identity normalization + HMAC hash.
 * Run: npx tsx --test tests/email-normalization.test.ts
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  createEmailIdentityHash,
  getEmailDomain,
  isAccountIdentityHashConfigured,
  normalizeEmailForIdentity,
  tryCreateEmailIdentityHash,
} from "../src/lib/security/email-normalization";

test("normalizeEmailForIdentity lowercases and trims", () => {
  assert.equal(
    normalizeEmailForIdentity("  User@Example.COM  "),
    "user@example.com",
  );
});

test("gmail strips dots and plus-tag; googlemail maps to gmail", () => {
  assert.equal(
    normalizeEmailForIdentity("User.Name+test@gmail.com"),
    "username@gmail.com",
  );
  assert.equal(
    normalizeEmailForIdentity("User.Name+tag@googlemail.com"),
    "username@gmail.com",
  );
  assert.equal(
    normalizeEmailForIdentity("a.b.c@gmail.com"),
    "abc@gmail.com",
  );
});

test("outlook-style plus-tag is stripped but dots kept", () => {
  assert.equal(
    normalizeEmailForIdentity("first.last+promo@outlook.com"),
    "first.last@outlook.com",
  );
});

test("custom domains are not dot-stripped", () => {
  assert.equal(
    normalizeEmailForIdentity("User.Name+tag@company.io"),
    "user.name+tag@company.io",
  );
  assert.equal(
    normalizeEmailForIdentity("a.b@creatornivo.com"),
    "a.b@creatornivo.com",
  );
});

test("getEmailDomain extracts domain", () => {
  assert.equal(getEmailDomain("  A@Mailinator.COM "), "mailinator.com");
  assert.equal(getEmailDomain("bad"), null);
});

test("createEmailIdentityHash uses HMAC secret and is stable", () => {
  const a = createEmailIdentityHash("username@gmail.com", "test-secret-key");
  const b = createEmailIdentityHash("username@gmail.com", "test-secret-key");
  const c = createEmailIdentityHash("username@gmail.com", "other-secret");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^[a-f0-9]{64}$/);
});

test("gmail aliases collide on identity hash", () => {
  const secret = "collision-secret";
  const h1 = createEmailIdentityHash(
    normalizeEmailForIdentity("u.s.e.r+1@gmail.com"),
    secret,
  );
  const h2 = createEmailIdentityHash(
    normalizeEmailForIdentity("user@googlemail.com"),
    secret,
  );
  assert.equal(h1, h2);
});

test("tryCreateEmailIdentityHash returns null without secret", () => {
  assert.equal(
    tryCreateEmailIdentityHash("a@b.com", { ACCOUNT_IDENTITY_HASH_SECRET: "" }),
    null,
  );
  assert.equal(isAccountIdentityHashConfigured({}), false);
  assert.equal(
    isAccountIdentityHashConfigured({
      ACCOUNT_IDENTITY_HASH_SECRET: "x",
    }),
    true,
  );
});
