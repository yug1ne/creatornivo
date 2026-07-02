import { getAdminEmails } from "@/config/admin";

/** Edge-safe проверка админ-доступа (без Prisma). */
export function isAdminSession(user: {
  role?: string;
  email?: string | null;
} | null | undefined): boolean {
  if (!user) return false;

  if (user.role === "admin") return true;

  if (!user.email) return false;

  return getAdminEmails().includes(user.email.toLowerCase());
}