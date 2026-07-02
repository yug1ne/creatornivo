/** Дополнительные email с доступом к админке (через запятую). Роль admin в БД имеет приоритет. */
export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}