import { signOut } from "@/auth";
import { UsageError } from "@/lib/usage";

/** True when usage loading failed because the session user no longer exists. */
export function isStaleSessionUsageError(error: unknown): boolean {
  return error instanceof UsageError && error.code === "stale_session";
}

/**
 * Clear the JWT for a deleted-user session and send the browser to login.
 * Used by protected pages when usage loading detects a missing User row.
 */
export async function clearStaleSessionAndRedirect(): Promise<never> {
  await signOut({ redirectTo: "/login?error=stale_session" });
  // signOut with redirectTo should not return; keep TypeScript happy.
  throw new Error("stale_session");
}
