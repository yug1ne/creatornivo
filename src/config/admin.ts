/**
 * Additional emails with admin access (comma-separated, case-insensitive).
 * Complements User.role === "admin" — see isAdminSession.
 * Never grant admin from plan (Pro) or OAuth provider alone.
 */
export function getAdminEmails(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const raw = env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}