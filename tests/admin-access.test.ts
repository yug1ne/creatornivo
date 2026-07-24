import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AdminAccessError,
  adminAccessErrorResponse,
  isAdminUser,
  requireAdmin,
} from "../src/lib/admin/guards";
import { isAdminSession } from "../src/lib/admin/is-admin-session";
import { isAdmin, hasProAccess } from "../src/lib/auth/guards";
import type { SessionUser } from "../src/types";

function session(
  overrides: Partial<SessionUser> & Pick<SessionUser, "email" | "role">,
): SessionUser {
  return {
    id: "user-1",
    name: null,
    image: null,
    plan: "free",
    ...overrides,
  };
}

const emptyEnv = {} as NodeJS.ProcessEnv;
const envWithAdmin = {
  ADMIN_EMAILS: "founder@example.com, ops@creatornivo.com",
} as NodeJS.ProcessEnv;

test("isAdminSession: role admin is admin; Pro plan alone is not", () => {
  assert.equal(
    isAdminSession(
      { role: "admin", email: "anyone@example.com" },
      emptyEnv,
    ),
    true,
  );
  assert.equal(
    isAdminSession({ role: "user", email: "pro@example.com" }, emptyEnv),
    false,
  );
  assert.equal(
    isAdminSession(
      { role: "user", email: "pro@example.com", plan: "pro" } as {
        role: string;
        email: string;
      },
      emptyEnv,
    ),
    false,
  );
  assert.equal(isAdminSession(null, emptyEnv), false);
  assert.equal(isAdminSession(undefined, emptyEnv), false);
});

test("isAdminSession: ADMIN_EMAILS allowlist grants admin; Google alone does not", () => {
  assert.equal(
    isAdminSession(
      { role: "user", email: "founder@example.com" },
      envWithAdmin,
    ),
    true,
  );
  assert.equal(
    isAdminSession(
      { role: "user", email: "  Founder@Example.com " },
      envWithAdmin,
    ),
    true,
  );
  assert.equal(
    isAdminSession(
      { role: "user", email: "google-user@gmail.com" },
      envWithAdmin,
    ),
    false,
  );
  // No allowlist env: OAuth-looking user stays non-admin.
  assert.equal(
    isAdminSession(
      { role: "user", email: "google-user@gmail.com" },
      emptyEnv,
    ),
    false,
  );
});

test("isAdmin and isAdminUser share isAdminSession semantics", () => {
  const adminRole = session({
    email: "a@example.com",
    role: "admin",
    plan: "free",
  });
  const normal = session({
    email: "b@example.com",
    role: "user",
    plan: "pro",
  });

  assert.equal(isAdmin(adminRole), true);
  assert.equal(isAdminUser(adminRole), true);
  assert.equal(isAdmin(normal), false);
  assert.equal(isAdminUser(normal), false);
  // Pro does not imply admin for product gates beyond hasProAccess plan check.
  assert.equal(hasProAccess(normal), true);
  assert.equal(hasProAccess(session({ email: "c@x.com", role: "user" })), false);
  assert.equal(hasProAccess(adminRole), true);
});

test("requireAdmin returns 401 for anonymous and 403 for non-admin", () => {
  try {
    requireAdmin(null);
    assert.fail("expected throw");
  } catch (error) {
    assert.ok(error instanceof AdminAccessError);
    assert.equal(error.code, "unauthorized");
    const mapped = adminAccessErrorResponse(error);
    assert.equal(mapped?.status, 401);
  }

  try {
    requireAdmin(session({ email: "user@example.com", role: "user" }));
    assert.fail("expected throw");
  } catch (error) {
    assert.ok(error instanceof AdminAccessError);
    assert.equal(error.code, "forbidden");
    const mapped = adminAccessErrorResponse(error);
    assert.equal(mapped?.status, 403);
  }

  const ok = requireAdmin(
    session({ email: "admin@example.com", role: "admin" }),
  );
  assert.equal(ok.role, "admin");
});

test("middleware and admin pages use isAdminSession / requireAdminPage", () => {
  const middleware = readFileSync("src/middleware.ts", "utf8");
  const adminPage = readFileSync("src/app/(admin)/admin/page.tsx", "utf8");
  const adminLayout = readFileSync("src/app/(admin)/layout.tsx", "utf8");
  const templatesPage = readFileSync(
    "src/app/(admin)/admin/templates/page.tsx",
    "utf8",
  );
  const templatesApi = readFileSync(
    "src/app/api/admin/templates/route.ts",
    "utf8",
  );
  const templatesIdApi = readFileSync(
    "src/app/api/admin/templates/[id]/route.ts",
    "utf8",
  );
  const sessionHelper = readFileSync("src/lib/admin/session.ts", "utf8");
  const authGuards = readFileSync("src/lib/auth/guards.ts", "utf8");

  assert.match(middleware, /isAdminRoute/);
  assert.match(middleware, /isAdminSession/);
  assert.match(adminPage, /requireAdminPage/);
  assert.match(adminLayout, /requireAdminPage/);
  assert.match(templatesPage, /requireAdminPage/);
  assert.match(sessionHelper, /isAdminUser/);
  assert.match(sessionHelper, /callbackUrl=\/admin/);

  assert.match(templatesApi, /status: 401/);
  assert.match(templatesApi, /status: 403/);
  assert.match(templatesApi, /adminAccessErrorResponse|isAdminUser/);
  assert.match(templatesIdApi, /adminAccessErrorResponse/);

  assert.match(authGuards, /isAdminSession/);
  assert.doesNotMatch(
    authGuards,
    /function isAdmin[\s\S]*return user\?\.role === "admin"/,
  );
});

test("admin landing shows safe counts only — no PII or generation content", () => {
  const source = readFileSync("src/app/(admin)/admin/page.tsx", "utf8");

  assert.match(source, /user\.count/);
  assert.match(source, /template\.count/);
  assert.match(source, /\/admin\/templates/);
  assert.match(source, /\/api\/health/);
  assert.match(source, /isBillingConfigured|isBillingCheckoutConfigured/);
  assert.doesNotMatch(source, /generation\.findMany|savedPrompt\.findMany/);
  assert.doesNotMatch(source, /prompt|result/i);
  assert.doesNotMatch(source, /select:\s*\{\s*email/);
});

test("sidebar Admin link is gated on session isAdmin only", () => {
  const sidebar = readFileSync("src/components/layout/sidebar.tsx", "utf8");
  const authConfig = readFileSync("src/auth.config.ts", "utf8");

  assert.match(sidebar, /showAdmin/);
  assert.match(sidebar, /session\?\.user\?\.isAdmin/);
  assert.match(sidebar, /href: "\/admin"/);
  assert.match(sidebar, /label: "Admin"/);
  // Not always in base nav items for everyone.
  assert.match(sidebar, /showAdmin\s*\?/);

  assert.match(authConfig, /isAdminSession/);
  assert.match(authConfig, /session\.user\.isAdmin/);
});

test("Google auth path does not set admin role by itself", () => {
  const auth = readFileSync("src/auth.ts", "utf8");
  const google = readFileSync("src/lib/auth/google.ts", "utf8");
  const googleEvents = readFileSync(
    "src/lib/auth/google-auth-events.ts",
    "utf8",
  );

  assert.doesNotMatch(auth, /role:\s*["']admin["']/);
  assert.doesNotMatch(google, /admin/);
  assert.doesNotMatch(googleEvents, /admin|role/);
  assert.match(auth, /isGoogleSignInAllowed/);
});
