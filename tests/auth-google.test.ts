import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getOAuthErrorMessage,
  isGoogleAuthConfigured,
  isGoogleSignInAllowed,
  shouldSetEmailVerifiedFromGoogle,
} from "../src/lib/auth/google";
import {
  shouldMarkEmailVerifiedOnGoogleSignIn,
  shouldSendWelcomeOnCreateUser,
} from "../src/lib/auth/google-auth-events";

test("isGoogleAuthConfigured is false when either env var is missing or blank", () => {
  assert.equal(isGoogleAuthConfigured({}), false);
  assert.equal(
    isGoogleAuthConfigured({ AUTH_GOOGLE_ID: "id-only" } as NodeJS.ProcessEnv),
    false,
  );
  assert.equal(
    isGoogleAuthConfigured({
      AUTH_GOOGLE_SECRET: "secret-only",
    } as NodeJS.ProcessEnv),
    false,
  );
  assert.equal(
    isGoogleAuthConfigured({
      AUTH_GOOGLE_ID: "  ",
      AUTH_GOOGLE_SECRET: "secret",
    } as NodeJS.ProcessEnv),
    false,
  );
  assert.equal(
    isGoogleAuthConfigured({
      AUTH_GOOGLE_ID: "client-id",
      AUTH_GOOGLE_SECRET: "client-secret",
    } as NodeJS.ProcessEnv),
    true,
  );
});

test("verified Google profile is allowed; unverified or incomplete is rejected", () => {
  assert.equal(
    isGoogleSignInAllowed({
      email: "user@example.com",
      email_verified: true,
    }),
    true,
  );
  assert.equal(
    isGoogleSignInAllowed({
      email: "  User@Example.com ",
      email_verified: true,
    }),
    true,
  );

  assert.equal(
    isGoogleSignInAllowed({
      email: "user@example.com",
      email_verified: false,
    }),
    false,
  );
  assert.equal(
    isGoogleSignInAllowed({
      email: "user@example.com",
      email_verified: null,
    }),
    false,
  );
  assert.equal(
    isGoogleSignInAllowed({
      email: "user@example.com",
    }),
    false,
  );
  assert.equal(isGoogleSignInAllowed({ email_verified: true }), false);
  assert.equal(isGoogleSignInAllowed(null), false);
  assert.equal(isGoogleSignInAllowed(undefined), false);
  assert.equal(
    isGoogleSignInAllowed({ email: "not-an-email", email_verified: true }),
    false,
  );
});

test("shouldSetEmailVerifiedFromGoogle matches verified-email gate", () => {
  assert.equal(
    shouldSetEmailVerifiedFromGoogle({
      email: "a@b.co",
      email_verified: true,
    }),
    true,
  );
  assert.equal(
    shouldSetEmailVerifiedFromGoogle({
      email: "a@b.co",
      email_verified: false,
    }),
    false,
  );
});

test("existing verified-email link path: Google verified marks emailVerified on google provider only", () => {
  assert.equal(
    shouldMarkEmailVerifiedOnGoogleSignIn({
      provider: "google",
      profile: { email: "owner@example.com", email_verified: true },
    }),
    true,
  );
  assert.equal(
    shouldMarkEmailVerifiedOnGoogleSignIn({
      provider: "google",
      profile: { email: "owner@example.com", email_verified: false },
    }),
    false,
  );
  assert.equal(
    shouldMarkEmailVerifiedOnGoogleSignIn({
      provider: "credentials",
      profile: { email: "owner@example.com", email_verified: true },
    }),
    false,
  );
});

test("welcome email on createUser requires user id and email", () => {
  assert.equal(
    shouldSendWelcomeOnCreateUser({
      userId: "u1",
      email: "u@example.com",
    }),
    true,
  );
  assert.equal(
    shouldSendWelcomeOnCreateUser({ userId: "u1", email: null }),
    false,
  );
  assert.equal(
    shouldSendWelcomeOnCreateUser({ userId: null, email: "u@example.com" }),
    false,
  );
});

test("OAuth error messages are calm and non-leaky", () => {
  assert.equal(getOAuthErrorMessage(null), null);
  assert.equal(getOAuthErrorMessage(undefined), null);

  const notLinked = getOAuthErrorMessage("OAuthAccountNotLinked");
  assert.ok(notLinked);
  assert.match(notLinked, /email and password/i);
  assert.doesNotMatch(notLinked, /does not exist|not found|no account/i);

  const denied = getOAuthErrorMessage("AccessDenied");
  assert.ok(denied);
  assert.match(denied, /Google/i);

  const unknown = getOAuthErrorMessage("SomeFutureError");
  assert.ok(unknown);
  assert.match(unknown, /try again|email and password/i);
});

test("auth.ts registers Google only when configured and enables safe email linking", () => {
  const source = readFileSync("src/auth.ts", "utf8");

  assert.match(source, /isGoogleAuthConfigured/);
  assert.match(source, /from "next-auth\/providers\/google"/);
  assert.match(source, /allowDangerousEmailAccountLinking:\s*true/);
  assert.match(source, /isGoogleSignInAllowed/);
  assert.match(source, /shouldMarkEmailVerifiedOnGoogleSignIn/);
  assert.match(source, /sendWelcomeEmail/);
  assert.match(source, /emailVerified/);

  // Credentials provider must remain.
  assert.match(source, /Credentials\(/);
  assert.match(source, /authorizeCredentials/);
});

test("edge auth.config does not register Google provider", () => {
  const source = readFileSync("src/auth.config.ts", "utf8");
  assert.doesNotMatch(source, /google|Google|AUTH_GOOGLE/i);
  assert.match(source, /providers:\s*\[\]/);
});

test("login and register show Google button only when enabled via prop", () => {
  const login = readFileSync("src/components/auth/login-form.tsx", "utf8");
  const register = readFileSync(
    "src/components/auth/register-form.tsx",
    "utf8",
  );
  const button = readFileSync(
    "src/components/auth/google-sign-in-button.tsx",
    "utf8",
  );

  assert.match(login, /googleEnabled/);
  assert.match(register, /googleEnabled/);
  assert.match(login, /GoogleSignInButton/);
  assert.match(register, /GoogleSignInButton/);
  assert.match(button, /signIn\("google"/);
  assert.match(login, /getOAuthErrorMessage/);
});

test(".env.example documents Google OAuth placeholders without real secrets", () => {
  const example = readFileSync(".env.example", "utf8");
  assert.match(example, /AUTH_GOOGLE_ID/);
  assert.match(example, /AUTH_GOOGLE_SECRET/);
  assert.doesNotMatch(example, /AUTH_GOOGLE_ID="[^"]{20,}"/);
  assert.doesNotMatch(example, /GOCSPX-/);
});
