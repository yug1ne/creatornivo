/**
 * Pure helpers for admin support inbox filters (no Prisma).
 * Access must be gated with requireAdminPage / requireAdmin first.
 */

import type { SupportThreadStatus } from "@prisma/client";

export const ADMIN_SUPPORT_PAGE_SIZE = 25;
export const ADMIN_SUPPORT_SEARCH_MAX = 100;

export type AdminSupportStatusFilter =
  | "all"
  | "open"
  | "answered"
  | "closed";

export type AdminSupportListParams = {
  status: AdminSupportStatusFilter;
  q: string;
  page: number;
};

export function parseAdminSupportListParams(input: {
  status?: string | string[] | undefined;
  q?: string | string[] | undefined;
  page?: string | string[] | undefined;
}): AdminSupportListParams {
  const rawStatus = Array.isArray(input.status)
    ? input.status[0]
    : input.status;
  const rawQ = Array.isArray(input.q) ? input.q[0] : input.q;
  const rawPage = Array.isArray(input.page) ? input.page[0] : input.page;

  const statusCandidate = (rawStatus ?? "all").trim().toLowerCase();
  const status: AdminSupportStatusFilter =
    statusCandidate === "open" ||
    statusCandidate === "answered" ||
    statusCandidate === "closed"
      ? statusCandidate
      : "all";

  const q = (rawQ ?? "").trim().slice(0, ADMIN_SUPPORT_SEARCH_MAX);

  const parsedPage = Number.parseInt(rawPage ?? "1", 10);
  const page =
    Number.isFinite(parsedPage) && parsedPage >= 1
      ? Math.min(parsedPage, 10_000)
      : 1;

  return { status, q, page };
}

export function adminSupportSkip(
  page: number,
  pageSize = ADMIN_SUPPORT_PAGE_SIZE,
): number {
  return (Math.max(1, page) - 1) * pageSize;
}

export function adminSupportTotalPages(
  total: number,
  pageSize = ADMIN_SUPPORT_PAGE_SIZE,
): number {
  if (total <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

export function statusFilterToPrisma(
  status: AdminSupportStatusFilter,
): SupportThreadStatus | undefined {
  if (status === "all") return undefined;
  return status;
}

/** Pure status transition helpers for admin close/reopen. */
export function statusAfterAdminClose(): SupportThreadStatus {
  return "closed";
}

export function statusAfterAdminReopen(): SupportThreadStatus {
  return "open";
}

export function statusAfterAdminReply(
  current: SupportThreadStatus,
): SupportThreadStatus {
  void current;
  return "answered";
}

export function resolveAdminMessageSenderType(
  attempted?: string | null,
): "ADMIN" {
  void attempted;
  return "ADMIN";
}
