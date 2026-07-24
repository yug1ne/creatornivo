import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ADMIN_USERS_PAGE_SIZE,
  adminUsersSkip,
  adminUsersTotalPages,
  buildAdminUserListWhere,
  parseAdminUsersSearchParams,
  shortenUserId,
} from "../src/lib/admin/users-query";

test("parseAdminUsersSearchParams clamps page and trims search", () => {
  assert.deepEqual(parseAdminUsersSearchParams({}), { q: "", page: 1 });
  assert.deepEqual(parseAdminUsersSearchParams({ q: "  a@b.co ", page: "2" }), {
    q: "a@b.co",
    page: 2,
  });
  assert.equal(parseAdminUsersSearchParams({ page: "0" }).page, 1);
  assert.equal(parseAdminUsersSearchParams({ page: "abc" }).page, 1);
  assert.equal(
    parseAdminUsersSearchParams({ q: "x".repeat(200) }).q.length,
    100,
  );
});

test("buildAdminUserListWhere only matches email name or exact id", () => {
  assert.deepEqual(buildAdminUserListWhere(""), {});
  const where = buildAdminUserListWhere("found");
  assert.ok(where.OR);
  assert.equal(where.OR?.length, 3);
  assert.deepEqual(where.OR?.[0], {
    email: { contains: "found", mode: "insensitive" },
  });
  assert.deepEqual(where.OR?.[2], { id: { equals: "found" } });
});

test("pagination helpers", () => {
  assert.equal(ADMIN_USERS_PAGE_SIZE, 25);
  assert.equal(adminUsersSkip(1), 0);
  assert.equal(adminUsersSkip(2), 25);
  assert.equal(adminUsersTotalPages(0), 1);
  assert.equal(adminUsersTotalPages(25), 1);
  assert.equal(adminUsersTotalPages(26), 2);
  assert.equal(shortenUserId("short"), "short");
  assert.match(shortenUserId("clxxxxxxxxxxxxxxxxxx"), /…/);
});

test("admin users pages require admin and stay read-only", () => {
  const list = readFileSync("src/app/(admin)/admin/users/page.tsx", "utf8");
  const detail = readFileSync(
    "src/app/(admin)/admin/users/[id]/page.tsx",
    "utf8",
  );
  const read = readFileSync("src/lib/admin/users-read.ts", "utf8");
  const layout = readFileSync("src/app/(admin)/layout.tsx", "utf8");
  const landing = readFileSync("src/app/(admin)/admin/page.tsx", "utf8");

  assert.match(list, /requireAdminPage/);
  assert.match(detail, /requireAdminPage/);
  assert.match(list, /Read-only/);
  assert.match(detail, /Read-only/);
  assert.match(list, /href="\/admin"/);
  assert.match(detail, /href="\/admin\/users"/);
  assert.match(layout, /\/admin\/users/);
  assert.match(landing, /href="\/admin\/users"/);

  // No mutation APIs or destructive UI controls.
  assert.doesNotMatch(list, /method=["']post["']/i);
  assert.doesNotMatch(detail, /method=["']post["']/i);
  assert.doesNotMatch(list, /impersonat|grantPro|revokePro|resetQuota/i);
  assert.doesNotMatch(detail, /impersonat|grantPro|revokePro|resetQuota/i);
  assert.doesNotMatch(read, /prisma\.user\.update|prisma\.user\.delete/);

  // Sensitive fields never selected for display as content.
  assert.doesNotMatch(read, /select:[\s\S]*password:\s*true[\s\S]*prompt/);
  assert.match(read, /password: true/);
  assert.match(read, /Boolean\(row\.password\)|Boolean\(user\.password\)/);
  assert.doesNotMatch(read, /prompt:\s*true|result:\s*true|content:\s*true/);
  assert.doesNotMatch(list, /passwordHash|refresh_token|access_token/);
  assert.doesNotMatch(detail, /passwordHash|refresh_token|access_token/);
});

test("admin users-read maps sign-in without returning password hash field", () => {
  const read = readFileSync("src/lib/admin/users-read.ts", "utf8");
  assert.match(read, /formatSignInMethods/);
  assert.match(read, /hasPassword/);
  assert.match(read, /AdminUserListItem/);
  assert.match(read, /getUserUsageSnapshot/);
  // Public list DTO uses hasPassword / signInMethods, not a password field.
  assert.match(read, /export type AdminUserListItem = \{/);
  assert.match(read, /signInMethods: string/);
  assert.match(read, /hasPassword: boolean/);
  const listType = read.slice(
    read.indexOf("export type AdminUserListItem"),
    read.indexOf("export type AdminUsersListResult"),
  );
  assert.doesNotMatch(listType, /^\s*password:/m);
  const detailType = read.slice(
    read.indexOf("export type AdminUserDetail"),
    read.indexOf("export async function getAdminUserDetail"),
  );
  assert.doesNotMatch(detailType, /^\s*password:/m);
});

test("Pro plan and Google auth are not treated as admin in Phase B code paths", () => {
  const isAdmin = readFileSync("src/lib/admin/is-admin-session.ts", "utf8");
  assert.match(isAdmin, /role === "admin"/);
  assert.match(isAdmin, /getAdminEmails/);
  // Function body must not branch on plan or OAuth provider.
  assert.doesNotMatch(isAdmin, /user\.plan|PLANS\.PRO|provider === ["']google["']/);
});

test("templates admin page still guarded", () => {
  const templates = readFileSync(
    "src/app/(admin)/admin/templates/page.tsx",
    "utf8",
  );
  assert.match(templates, /requireAdminPage/);
});
