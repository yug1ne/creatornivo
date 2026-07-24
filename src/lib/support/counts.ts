import type { SupportThreadStatus } from "@prisma/client";

/** Aggregate thread counts by status (no message bodies / PII). */
export type SupportStatusCounts = {
  open: number;
  answered: number;
  closed: number;
  all: number;
};

export function emptySupportStatusCounts(): SupportStatusCounts {
  return { open: 0, answered: 0, closed: 0, all: 0 };
}

/** Pure helper for tests and groupBy mapping. */
export function aggregateSupportStatusCounts(
  rows: Array<{ status: SupportThreadStatus; count: number }>,
): SupportStatusCounts {
  const counts = emptySupportStatusCounts();
  for (const row of rows) {
    const n = Math.max(0, row.count);
    counts.all += n;
    if (row.status === "open") counts.open += n;
    else if (row.status === "answered") counts.answered += n;
    else if (row.status === "closed") counts.closed += n;
  }
  return counts;
}

/** Attention badge for users: answered threads only (“Support replied”). */
export function userSupportAttentionCount(counts: SupportStatusCounts): number {
  return counts.answered;
}

/** Attention badge for admins: open threads awaiting response. */
export function adminSupportAttentionCount(counts: SupportStatusCounts): number {
  return counts.open;
}
