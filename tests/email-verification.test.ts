import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EMAIL_VERIFICATION_ALREADY_VERIFIED_MESSAGE,
  EMAIL_VERIFICATION_INVALID_MESSAGE,
  EMAIL_VERIFICATION_REQUIRED_CODE,
  EMAIL_VERIFICATION_REQUIRED_MESSAGE,
  EMAIL_VERIFICATION_RESEND_SUCCESS_MESSAGE,
  EMAIL_VERIFICATION_SUCCESS_MESSAGE,
  EMAIL_VERIFICATION_TTL_MS,
  EmailVerificationError,
  generateEmailVerificationToken,
  hashEmailVerificationToken,
  isEmailVerified,
  getEmailVerificationUrl,
  issueEmailVerificationToken,
  resendEmailVerificationForUser,
  verifyEmailWithToken,
  type EmailVerificationStore,
  type EmailVerificationTokenRecord,
  type EmailVerificationUser,
} from "../src/lib/auth/email-verification";
import { parseGenerationApiError } from "../src/lib/usage/quota-exceeded";
import VerifyEmailPage from "../src/app/(public)/verify-email/page";
import { postVerifyEmail } from "../src/app/api/auth/verify-email/route";
import { postResendVerification } from "../src/app/api/auth/resend-verification/route";
import { authRateLimitPolicies } from "../src/config/auth-rate-limit";
import {
  buildEmailVerificationHtml,
  buildEmailVerificationText,
} from "../src/lib/email/send-email-verification";

class MemoryEmailVerificationStore implements EmailVerificationStore {
  users = new Map<string, EmailVerificationUser>();
  tokens: EmailVerificationTokenRecord[] = [];

  seedUser(user: EmailVerificationUser) {
    this.users.set(user.id, { ...user });
    return user;
  }

  async findUserById(userId: string) {
    return this.users.get(userId) ?? null;
  }

  async findUserByEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    return (
      Array.from(this.users.values()).find(
        (user) => user.email.toLowerCase() === normalized,
      ) ?? null
    );
  }

  async deleteTokensForIdentifier(identifier: string) {
    this.tokens = this.tokens.filter(
      (token) => token.identifier !== identifier,
    );
  }

  async createToken(data: {
    identifier: string;
    token: string;
    expires: Date;
  }) {
    const record = {
      identifier: data.identifier,
      token: data.token,
      expires: data.expires,
    };
    this.tokens.push(record);
    return record;
  }

  async findValidToken(tokenHash: string, now: Date) {
    return (
      this.tokens.find(
        (token) => token.token === tokenHash && token.expires > now,
      ) ?? null
    );
  }

  async deleteToken(identifier: string, token: string) {
    this.tokens = this.tokens.filter(
      (record) =>
        !(record.identifier === identifier && record.token === token),
    );
  }

  async markEmailVerified(userId: string, verifiedAt: Date) {
    const user = this.users.get(userId);
    if (!user) throw new Error("user missing");
    user.emailVerified = verifiedAt;
  }
}

test("isEmailVerified treats null/invalid as unverified", () => {
  assert.equal(isEmailVerified(null), false);
  assert.equal(isEmailVerified(undefined), false);
  assert.equal(isEmailVerified(new Date("invalid")), false);
  assert.equal(isEmailVerified(new Date("2026-07-15T00:00:00.000Z")), true);
});

test("issueEmailVerificationToken stores hashed single-use token", async () => {
  const store = new MemoryEmailVerificationStore();
  store.seedUser({
    id: "u1",
    email: "person@example.com",
    name: "Person",
    emailVerified: null,
  });

  const now = () => new Date("2026-07-15T12:00:00.000Z");
  const issued = await issueEmailVerificationToken(
    " Person@Example.COM ",
    store,
    now,
  );

  assert.equal(issued.email, "person@example.com");
  assert.ok(issued.plainToken.length >= 32);
  assert.equal(store.tokens.length, 1);
  assert.equal(
    store.tokens[0]?.token,
    hashEmailVerificationToken(issued.plainToken),
  );
  assert.notEqual(store.tokens[0]?.token, issued.plainToken);
  assert.equal(
    store.tokens[0]?.expires.getTime(),
    now().getTime() + EMAIL_VERIFICATION_TTL_MS,
  );

  // Re-issue invalidates previous tokens.
  const second = await issueEmailVerificationToken(
    "person@example.com",
    store,
    now,
  );
  assert.equal(store.tokens.length, 1);
  assert.equal(
    store.tokens[0]?.token,
    hashEmailVerificationToken(second.plainToken),
  );
});

test("verifyEmailWithToken sets emailVerified and consumes token", async () => {
  const store = new MemoryEmailVerificationStore();
  store.seedUser({
    id: "u1",
    email: "verify@example.com",
    name: "Verify",
    emailVerified: null,
  });

  const now = () => new Date("2026-07-15T12:00:00.000Z");
  const issued = await issueEmailVerificationToken(
    "verify@example.com",
    store,
    now,
  );

  const result = await verifyEmailWithToken(issued.plainToken, store, now);
  assert.equal(result.userId, "u1");
  assert.equal(result.alreadyVerified, false);
  assert.equal(store.users.get("u1")?.emailVerified?.toISOString(), now().toISOString());
  assert.equal(store.tokens.length, 0);

  await assert.rejects(
    verifyEmailWithToken(issued.plainToken, store, now),
    (error: unknown) => {
      assert.ok(error instanceof EmailVerificationError);
      assert.equal(error.code, "invalid_or_expired_token");
      return true;
    },
  );
});

test("verifyEmailWithToken rejects expired and missing tokens", async () => {
  const store = new MemoryEmailVerificationStore();
  store.seedUser({
    id: "u1",
    email: "expire@example.com",
    name: null,
    emailVerified: null,
  });

  let current = new Date("2026-07-15T12:00:00.000Z");
  const issued = await issueEmailVerificationToken(
    "expire@example.com",
    store,
    () => current,
  );

  current = new Date(current.getTime() + EMAIL_VERIFICATION_TTL_MS + 1);
  await assert.rejects(
    verifyEmailWithToken(issued.plainToken, store, () => current),
    (error: unknown) => {
      assert.ok(error instanceof EmailVerificationError);
      assert.equal(error.code, "invalid_or_expired_token");
      return true;
    },
  );

  await assert.rejects(
    verifyEmailWithToken("", store),
    (error: unknown) => {
      assert.ok(error instanceof EmailVerificationError);
      assert.equal(error.code, "missing_token");
      return true;
    },
  );

  await assert.rejects(
    verifyEmailWithToken(generateEmailVerificationToken(), store),
    (error: unknown) => {
      assert.ok(error instanceof EmailVerificationError);
      assert.equal(error.code, "invalid_or_expired_token");
      return true;
    },
  );
});

test("resendEmailVerificationForUser issues token only when unverified", async () => {
  const store = new MemoryEmailVerificationStore();
  store.seedUser({
    id: "u1",
    email: "resend@example.com",
    name: "Resend",
    emailVerified: null,
  });

  const issued = await resendEmailVerificationForUser("u1", store);
  assert.equal(issued.status, "issued");
  if (issued.status === "issued") {
    assert.ok(issued.plainToken);
    assert.equal(store.tokens.length, 1);
  }

  store.users.get("u1")!.emailVerified = new Date("2026-07-15T12:00:00.000Z");
  const again = await resendEmailVerificationForUser("u1", store);
  assert.equal(again.status, "already_verified");
  assert.equal(store.tokens.length, 1);
});

test("register route wires verification + welcome after successful create", () => {
  const source = readFileSync("src/app/api/auth/register/route.ts", "utf8");

  assert.match(source, /issueAndSendEmailVerification/);
  assert.match(source, /issueVerification/);
  assert.match(source, /void issueVerification\(/);
  assert.match(source, /void sendWelcome\(/);

  const issueIdx = source.indexOf("void issueVerification(");
  const welcomeIdx = source.indexOf("void sendWelcome(");
  const responseIdx = source.indexOf('message: "Registration successful"');
  assert.ok(issueIdx > 0);
  assert.ok(welcomeIdx > issueIdx);
  assert.ok(responseIdx > welcomeIdx);
});

test("issueAndSendEmailVerification creates token and sends email", async () => {
  const { issueAndSendEmailVerification } = await import(
    "../src/lib/auth/issue-email-verification"
  );
  const store = new MemoryEmailVerificationStore();
  store.seedUser({
    id: "u1",
    email: "issue-send@example.com",
    name: "Issue",
    emailVerified: null,
  });

  let sentToken: string | null = null;
  const result = await issueAndSendEmailVerification({
    email: "issue-send@example.com",
    name: "Issue",
    store,
    sendEmail: async (input) => {
      sentToken = input.plainToken;
      return {
        delivered: true,
        verifyUrl: `https://www.creatornivo.com/verify-email?token=${input.plainToken}`,
      };
    },
  });

  assert.equal(result.delivered, true);
  assert.ok(sentToken);
  assert.equal(store.tokens.length, 1);
  assert.equal(
    store.tokens[0]?.token,
    hashEmailVerificationToken(sentToken!),
  );
});

test("verify-email API maps success and invalid tokens", async () => {
  const success = await postVerifyEmail(
    new Request("https://www.creatornivo.com/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "valid-token" }),
    }),
    {
      verify: async () => ({
        userId: "u1",
        email: "ok@example.com",
        alreadyVerified: false,
      }),
      activateClaimedTrial: async () => ({ status: "invite_required" }),
    },
  );
  assert.equal(success.status, 200);
  const successBody = await success.json();
  assert.equal(successBody.message, EMAIL_VERIFICATION_SUCCESS_MESSAGE);

  const invalid = await postVerifyEmail(
    new Request("https://www.creatornivo.com/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "bad" }),
    }),
    {
      verify: async () => {
        throw new EmailVerificationError("invalid_or_expired_token");
      },
    },
  );
  assert.equal(invalid.status, 400);
  const invalidBody = await invalid.json();
  assert.equal(invalidBody.error, EMAIL_VERIFICATION_INVALID_MESSAGE);
});

test("verify-email GET is display-only and cannot verify or activate a trial", async () => {
  const page = readFileSync("src/app/(public)/verify-email/page.tsx", "utf8");
  const confirmation = readFileSync(
    "src/components/auth/verify-email-confirmation.tsx",
    "utf8",
  );

  assert.doesNotMatch(page, /verifyEmailWithToken/);
  assert.doesNotMatch(page, /prismaEmailVerificationStore/);
  assert.doesNotMatch(page, /activateClaimedTrialAfterVerification/);
  assert.match(page, /<VerifyEmailConfirmation/);
  assert.match(page, /token=\{token\}/);
  assert.match(page, /callbackUrl=\{callbackUrl\}/);
  assert.match(confirmation, /<form[\s\S]*onSubmit=\{confirmEmail\}/);
  assert.match(confirmation, /method:\s*"POST"/);
  assert.match(confirmation, /JSON\.stringify\(\{ token \}\)/);
  assert.doesNotMatch(confirmation, /useEffect/);

  const rendered = await VerifyEmailPage({
    searchParams: Promise.resolve({ token: "valid-token" }),
  });
  assert.equal(rendered.props.token, "valid-token");
});

test("verify-email POST verifies once and activates a previously claimed trial", async () => {
  const store = new MemoryEmailVerificationStore();
  store.seedUser({
    id: "trial-user",
    email: "trial@example.com",
    name: "Trial",
    emailVerified: null,
  });
  const now = () => new Date("2026-08-12T12:00:00.000Z");
  const issued = await issueEmailVerificationToken(
    "trial@example.com",
    store,
    now,
  );
  let activationCalls = 0;

  const request = () =>
    new Request("https://www.creatornivo.com/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: issued.plainToken }),
    });
  const dependencies = {
    verify: (token: string | undefined) =>
      verifyEmailWithToken(token, store, now),
    activateClaimedTrial: async (userId: string) => {
      activationCalls += 1;
      assert.equal(userId, "trial-user");
      return {
        status: "activated" as const,
        trialStartedAt: now(),
        trialEndsAt: new Date(now().getTime() + 72 * 60 * 60 * 1000),
      };
    },
  };

  const first = await postVerifyEmail(request(), dependencies);
  assert.equal(first.status, 200);
  const firstBody = await first.json();
  assert.equal(firstBody.trialStatus, "activated");
  assert.equal(firstBody.trialActivationNeedsRetry, false);
  assert.equal(
    store.users.get("trial-user")?.emailVerified?.toISOString(),
    now().toISOString(),
  );
  assert.equal(store.tokens.length, 0);
  assert.equal(activationCalls, 1);

  // Existing verification semantics are single-use: replay is rejected and
  // cannot verify or activate the trial a second time.
  const repeated = await postVerifyEmail(request(), dependencies);
  assert.equal(repeated.status, 400);
  assert.equal(
    (await repeated.json()).error,
    EMAIL_VERIFICATION_INVALID_MESSAGE,
  );
  assert.equal(activationCalls, 1);
});

test("verify-email POST keeps successful verification recoverable when trial activation fails", async () => {
  const response = await postVerifyEmail(
    new Request("https://www.creatornivo.com/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "valid-token" }),
    }),
    {
      verify: async () => ({
        userId: "u1",
        email: "ok@example.com",
        alreadyVerified: false,
      }),
      activateClaimedTrial: async () => {
        throw new Error("temporary failure");
      },
    },
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.message, EMAIL_VERIFICATION_SUCCESS_MESSAGE);
  assert.equal(body.trialActivationNeedsRetry, true);

  const confirmation = readFileSync(
    "src/components/auth/verify-email-confirmation.tsx",
    "utf8",
  );
  assert.match(confirmation, /trialActivationNeedsRetry/);
  assert.match(confirmation, /getEmailVerificationSuccessHref/);
});

test("verify-email POST rejects expired tokens without verification or trial activation", async () => {
  const store = new MemoryEmailVerificationStore();
  store.seedUser({
    id: "expired-user",
    email: "expired@example.com",
    name: null,
    emailVerified: null,
  });
  const issuedAt = new Date("2026-08-12T12:00:00.000Z");
  const issued = await issueEmailVerificationToken(
    "expired@example.com",
    store,
    () => issuedAt,
  );
  let activationCalls = 0;

  const response = await postVerifyEmail(
    new Request("https://www.creatornivo.com/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: issued.plainToken }),
    }),
    {
      verify: (token: string | undefined) =>
        verifyEmailWithToken(token, store, () =>
          new Date(issuedAt.getTime() + EMAIL_VERIFICATION_TTL_MS + 1),
        ),
      activateClaimedTrial: async () => {
        activationCalls += 1;
        return { status: "activated" as const };
      },
    },
  );

  assert.equal(response.status, 400);
  assert.equal(
    (await response.json()).error,
    EMAIL_VERIFICATION_INVALID_MESSAGE,
  );
  assert.equal(store.users.get("expired-user")?.emailVerified, null);
  assert.equal(activationCalls, 0);
});

test("resend-verification requires session and skips already verified", async () => {
  const unauthorized = await postResendVerification(
    new Request("https://www.creatornivo.com/api/auth/resend-verification", {
      method: "POST",
    }),
    {
      getSession: async () => {
        throw new Error("Unauthorized");
      },
    },
  );
  assert.equal(unauthorized.status, 401);

  let sendCalls = 0;
  const already = await postResendVerification(
    new Request("https://www.creatornivo.com/api/auth/resend-verification", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.21" },
    }),
    {
      getSession: async () => ({
        id: "u1",
        email: "done@example.com",
        name: "Done",
        image: null,
        plan: "free",
        role: "user",
      }),
      enforceRateLimit: async () => undefined,
      resend: async () => ({
        status: "already_verified" as const,
        email: "done@example.com",
      }),
      sendEmail: async () => {
        sendCalls += 1;
        return { delivered: true, verifyUrl: "https://example.com" };
      },
    },
  );
  assert.equal(already.status, 200);
  const alreadyBody = await already.json();
  assert.equal(alreadyBody.alreadyVerified, true);
  assert.equal(alreadyBody.message, EMAIL_VERIFICATION_ALREADY_VERIFIED_MESSAGE);
  assert.equal(sendCalls, 0);

  const resent = await postResendVerification(
    new Request("https://www.creatornivo.com/api/auth/resend-verification", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.22" },
    }),
    {
      getSession: async () => ({
        id: "u2",
        email: "pending@example.com",
        name: "Pending",
        image: null,
        plan: "free",
        role: "user",
      }),
      enforceRateLimit: async () => undefined,
      resend: async () => ({
        status: "issued" as const,
        email: "pending@example.com",
        name: "Pending",
        plainToken: "token-plain",
        emailHash: "sha256:abc",
      }),
      sendEmail: async (input) => {
        sendCalls += 1;
        assert.equal(input.plainToken, "token-plain");
        assert.equal(input.email, "pending@example.com");
        return { delivered: true, verifyUrl: "https://example.com/v" };
      },
    },
  );
  assert.equal(resent.status, 200);
  const resentBody = await resent.json();
  assert.equal(resentBody.alreadyVerified, false);
  assert.equal(resentBody.message, EMAIL_VERIFICATION_RESEND_SUCCESS_MESSAGE);
  assert.equal(sendCalls, 1);
  assert.doesNotMatch(JSON.stringify(resentBody), /token-plain/);
});

test("parseGenerationApiError handles email_verification_required", () => {
  const parsed = parseGenerationApiError({
    code: EMAIL_VERIFICATION_REQUIRED_CODE,
    error: EMAIL_VERIFICATION_REQUIRED_MESSAGE,
  });
  assert.equal(parsed.code, EMAIL_VERIFICATION_REQUIRED_CODE);
  assert.equal(parsed.message, EMAIL_VERIFICATION_REQUIRED_MESSAGE);
  assert.equal(parsed.showUpgradeLink, false);
});

test("resend_verification rate limit policy is documented", () => {
  assert.equal(authRateLimitPolicies.resend_verification.account?.maxAttempts, 3);
  assert.equal(authRateLimitPolicies.resend_verification.ip.maxAttempts, 10);
});

test("verification email URL can carry a safe callback without moving the token", () => {
  const url = getEmailVerificationUrl(
    "example-token-value",
    "https://www.creatornivo.com",
    "/generate?template=linkedin-post",
  );
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("token"), "example-token-value");
  assert.equal(
    parsed.searchParams.get("callbackUrl"),
    "/generate?template=linkedin-post",
  );
});

test("verification email content includes confirm CTA without raw secrets", () => {
  const url =
    "https://www.creatornivo.com/verify-email?token=example-token-value";
  const text = buildEmailVerificationText({
    name: "Alex",
    verifyUrl: url,
  });
  const html = buildEmailVerificationHtml({
    name: "Alex",
    verifyUrl: url,
  });

  assert.match(text, /Confirm your email/);
  assert.match(text, /example-token-value/);
  assert.match(html, /Confirm email/);
  assert.match(html, /example-token-value/);
});
