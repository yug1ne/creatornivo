import { getAdminEmails } from "@/config/admin";

/**
 * Single source of truth for admin access (edge-safe, no Prisma).
 *
 * Admin if:
 * - user.role === "admin", OR
 * - normalized email is listed in ADMIN_EMAILS
 *
 * Never grants admin based on plan (Pro) or OAuth provider alone.
 */
export function isAdminSession(
  user: {
    role?: string | null;
    email?: string | null;
  } | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!user) return false;

  if (user.role === "admin") return true;

  const email =
    typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
  if (!email) return false;

  return getAdminEmails(env).includes(email);
}
