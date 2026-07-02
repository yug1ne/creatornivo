import { isAdminSession } from "@/lib/admin/is-admin-session";
import type { SessionUser } from "@/types";

export function isAdminUser(session: SessionUser | null): boolean {
  return isAdminSession(session);
}

export function requireAdmin(session: SessionUser | null): SessionUser {
  if (!session || !isAdminUser(session)) {
    throw new Error("Forbidden");
  }

  return session;
}