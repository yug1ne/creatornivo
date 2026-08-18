import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getAuthPageHref,
  getOptionalSafeCallbackUrl,
  getSafeCallbackFromLocation,
  getSafeCallbackUrl,
} from "../src/lib/auth/callback-url";
import {
  getEmailVerificationSuccessHref,
  getEmailVerificationUrl,
} from "../src/lib/auth/email-verification";

const GENERATE_LINKEDIN = "/generate?template=linkedin-post";

test("middleware preserves query string on protected generate URLs", () => {
  const dest = getSafeCallbackFromLocation(
    "/generate",
    "?template=linkedin-post",
  );
  assert.equal(dest, GENERATE_LINKEDIN);

  const loginUrl = new URL("/login", "https://www.creatornivo.com");
  loginUrl.searchParams.set("callbackUrl", dest);
  assert.equal(loginUrl.searchParams.get("callbackUrl"), GENERATE_LINKEDIN);
  assert.match(
    loginUrl.pathname + loginUrl.search,
    /callbackUrl=%2Fgenerate%3Ftemplate%3Dlinkedin-post/,
  );

  const middleware = readFileSync("src/middleware.ts", "utf8");
  assert.match(middleware, /getSafeCallbackFromLocation/);
  assert.match(middleware, /request\.nextUrl\.search/);
  assert.doesNotMatch(
    middleware,
    /searchParams\.set\("callbackUrl", pathname\)/,
  );
});

test("external and malformed callback URLs are rejected", () => {
  for (const unsafe of [
    "https://evil.example",
    "https://evil.example/pricing",
    "//evil.example",
    "javascript:alert(1)",
    "/\\evil.example",
    "   https://evil.example",
    "/%2F%2Fevil.example",
  ]) {
    assert.equal(
      getSafeCallbackUrl(unsafe),
      "/dashboard",
      `should reject ${unsafe}`,
    );
    assert.equal(getOptionalSafeCallbackUrl(unsafe), null);
  }

  assert.equal(getSafeCallbackUrl("/dashboard"), "/dashboard");
  assert.equal(getSafeCallbackUrl("/templates"), "/templates");
  assert.equal(getSafeCallbackUrl(GENERATE_LINKEDIN), GENERATE_LINKEDIN);
  assert.equal(
    getSafeCallbackUrl("/dashboard?onboarding=start"),
    "/dashboard?onboarding=start",
  );
});

test("login → register and register → login preserve callbackUrl", () => {
  assert.equal(
    getAuthPageHref("register", GENERATE_LINKEDIN),
    `/register?callbackUrl=${encodeURIComponent(GENERATE_LINKEDIN)}`,
  );
  assert.equal(
    getAuthPageHref("login", GENERATE_LINKEDIN),
    `/login?callbackUrl=${encodeURIComponent(GENERATE_LINKEDIN)}`,
  );
  assert.equal(getAuthPageHref("register", null), "/register");
  assert.equal(getAuthPageHref("login", null), "/login");
  assert.equal(
    getAuthPageHref("register", "https://evil.example"),
    "/register",
  );

  const switchLink = readFileSync(
    "src/components/auth/auth-switch-link.tsx",
    "utf8",
  );
  const loginPage = readFileSync("src/app/(public)/login/page.tsx", "utf8");
  const registerPage = readFileSync(
    "src/app/(public)/register/page.tsx",
    "utf8",
  );
  assert.match(switchLink, /getAuthPageHref/);
  assert.match(loginPage, /AuthSwitchLink dest="register"/);
  assert.match(registerPage, /AuthSwitchLink dest="login"/);
});

test("credentials login redirects to the exact safe callback", () => {
  const loginForm = readFileSync(
    "src/components/auth/login-form.tsx",
    "utf8",
  );
  assert.match(loginForm, /getSafeCallbackUrl\(searchParams\.get\("callbackUrl"\)\)/);
  assert.match(loginForm, /router\.push\(callbackUrl\)/);
  assert.equal(
    getSafeCallbackUrl(GENERATE_LINKEDIN),
    GENERATE_LINKEDIN,
  );
});

test("registration preserves an explicit callback and keeps the default without one", () => {
  const registerForm = readFileSync(
    "src/components/auth/register-form.tsx",
    "utf8",
  );
  const registerRoute = readFileSync(
    "src/app/api/auth/register/route.ts",
    "utf8",
  );

  assert.match(registerForm, /getOptionalSafeCallbackUrl\(requestedCallbackUrl\)/);
  assert.match(registerForm, /callbackUrl: emailCallbackUrl/);
  assert.match(
    registerForm,
    /getSafeCallbackUrl\(\s*requestedCallbackUrl,\s*"\/dashboard\?onboarding=start"/,
  );
  assert.match(registerForm, /router\.push\(callbackUrl\)/);
  assert.match(registerRoute, /getOptionalSafeCallbackUrl\(callbackUrl\)/);
  assert.match(registerRoute, /callbackUrl: getOptionalSafeCallbackUrl/);
});

test("email verification preserves a safe callback and ignores unsafe ones", () => {
  const withCallback = getEmailVerificationUrl(
    "example-token-value",
    "https://www.creatornivo.com",
    GENERATE_LINKEDIN,
  );
  const parsed = new URL(withCallback);
  assert.equal(parsed.pathname, "/verify-email");
  assert.equal(parsed.searchParams.get("token"), "example-token-value");
  assert.equal(parsed.searchParams.get("callbackUrl"), GENERATE_LINKEDIN);
  assert.doesNotMatch(parsed.searchParams.get("callbackUrl") ?? "", /example-token/);

  const unsafe = getEmailVerificationUrl(
    "example-token-value",
    "https://www.creatornivo.com",
    "https://evil.example",
  );
  assert.equal(new URL(unsafe).searchParams.get("callbackUrl"), null);

  const none = getEmailVerificationUrl(
    "example-token-value",
    "https://www.creatornivo.com",
  );
  assert.equal(new URL(none).searchParams.get("callbackUrl"), null);

  assert.equal(
    getEmailVerificationSuccessHref({ callbackUrl: GENERATE_LINKEDIN }),
    GENERATE_LINKEDIN,
  );
  assert.equal(
    getEmailVerificationSuccessHref({
      callbackUrl: "https://evil.example",
    }),
    "/generate",
  );
  assert.equal(getEmailVerificationSuccessHref({}), "/generate");
  assert.equal(
    getEmailVerificationSuccessHref({
      trialActivationNeedsRetry: true,
      callbackUrl: GENERATE_LINKEDIN,
    }),
    "/try/activate",
  );

  const confirmation = readFileSync(
    "src/components/auth/verify-email-confirmation.tsx",
    "utf8",
  );
  assert.match(confirmation, /getEmailVerificationSuccessHref/);
  assert.match(confirmation, /JSON\.stringify\(\{ token \}\)/);
});

test("resend verification can carry the current generate destination", () => {
  const banner = readFileSync(
    "src/components/generate/email-verification-banner.tsx",
    "utf8",
  );
  const resendRoute = readFileSync(
    "src/app/api/auth/resend-verification/route.ts",
    "utf8",
  );
  assert.match(banner, /getSafeCallbackFromLocation/);
  assert.match(banner, /JSON\.stringify\(\{ callbackUrl \}\)/);
  assert.match(resendRoute, /readOptionalCallbackUrl/);
  assert.match(resendRoute, /callbackUrl,/);
});
