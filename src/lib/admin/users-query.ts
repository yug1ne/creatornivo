/**
 * Pure helpers for admin users list/detail (no Prisma).
 * Search/pagination only — access must be gated by requireAdminPage first.
 */

export const ADMIN_USERS_PAGE_SIZE = 25;
export const ADMIN_USERS_SEARCH_MAX_LENGTH = 100;

export type AdminUsersListParams = {
  q: string;
  page: number;
};

export function parseAdminUsersSearchParams(input: {
  q?: string | string[] | undefined;
  page?: string | string[] | undefined;
}): AdminUsersListParams {
  const rawQ = Array.isArray(input.q) ? input.q[0] : input.q;
  const rawPage = Array.isArray(input.page) ? input.page[0] : input.page;

  const q = (rawQ ?? "").trim().slice(0, ADMIN_USERS_SEARCH_MAX_LENGTH);

  const parsedPage = Number.parseInt(rawPage ?? "1", 10);
  const page =
    Number.isFinite(parsedPage) && parsedPage >= 1
      ? Math.min(parsedPage, 10_000)
      : 1;

  return { q, page };
}

/** Shorten long ids for compact list UI (full id remains on detail). */
export function shortenUserId(id: string): string {
  const value = id.trim();
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function adminUsersSkip(page: number, pageSize = ADMIN_USERS_PAGE_SIZE): number {
  return (Math.max(1, page) - 1) * pageSize;
}

export function adminUsersTotalPages(
  total: number,
  pageSize = ADMIN_USERS_PAGE_SIZE,
): number {
  if (total <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Prisma-shaped OR filter for email / name / exact id. */
export function buildAdminUserListWhere(q: string): {
  OR?: Array<
    | { email: { contains: string; mode: "insensitive" } }
    | { name: { contains: string; mode: "insensitive" } }
    | { id: { equals: string } }
  >;
} {
  const query = q.trim();
  if (!query) return {};

  return {
    OR: [
      { email: { contains: query, mode: "insensitive" } },
      { name: { contains: query, mode: "insensitive" } },
      { id: { equals: query } },
    ],
  };
}
