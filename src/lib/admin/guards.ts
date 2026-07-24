import { isAdminSession } from "@/lib/admin/is-admin-session";
import type { SessionUser } from "@/types";

/** Same semantics as middleware / isAdminSession. */
export function isAdminUser(
  session: {
    role?: string | null;
    email?: string | null;
  } | null,
): boolean {
  return isAdminSession(session);
}

export type AdminGuardFailure = "unauthorized" | "forbidden";

export class AdminAccessError extends Error {
  readonly code: AdminGuardFailure;

  constructor(code: AdminGuardFailure) {
    super(code);
    this.name = "AdminAccessError";
    this.code = code;
  }
}

/**
 * Require an authenticated admin session.
 * - No session → unauthorized (401)
 * - Session but not admin → forbidden (403)
 */
export function requireAdmin(session: SessionUser | null): SessionUser {
  if (!session) {
    throw new AdminAccessError("unauthorized");
  }

  if (!isAdminUser(session)) {
    throw new AdminAccessError("forbidden");
  }

  return session;
}

/** Map admin guard failures to HTTP status + generic body (no resource leakage). */
export function adminAccessErrorResponse(error: unknown): {
  status: 401 | 403;
  body: { error: string };
} | null {
  if (error instanceof AdminAccessError) {
    if (error.code === "unauthorized") {
      return { status: 401, body: { error: "Unauthorized" } };
    }
    return { status: 403, body: { error: "Forbidden" } };
  }

  // Backward-compatible string errors from older call sites.
  if (error instanceof Error) {
    if (error.message === "Unauthorized") {
      return { status: 401, body: { error: "Unauthorized" } };
    }
    if (error.message === "Forbidden") {
      return { status: 403, body: { error: "Forbidden" } };
    }
  }

  return null;
}
