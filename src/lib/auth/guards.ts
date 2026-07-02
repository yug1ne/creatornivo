import { PLANS } from "@/config/plans";
import type { SessionUser } from "@/types";

export function isAuthenticated(user: SessionUser | null): user is SessionUser {
  return user !== null;
}

export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === "admin";
}

export function hasProAccess(user: SessionUser | null): boolean {
  return user?.plan === PLANS.PRO || isAdmin(user);
}