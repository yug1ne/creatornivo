import { PLANS } from "@/config/plans";
import { isAdminSession } from "@/lib/admin/is-admin-session";
import type { SessionUser } from "@/types";

export function isAuthenticated(user: SessionUser | null): user is SessionUser {
  return user !== null;
}

/**
 * Admin access: DB role admin OR ADMIN_EMAILS allowlist.
 * Does not treat Pro plan as admin.
 */
export function isAdmin(user: SessionUser | null): boolean {
  return isAdminSession(user);
}

/** Pro plan users, or admins (including allowlisted founder emails). */
export function hasProAccess(user: SessionUser | null): boolean {
  return user?.plan === PLANS.PRO || isAdmin(user);
}
