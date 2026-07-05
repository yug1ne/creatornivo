import { createHash } from "node:crypto";

export const ACCOUNT_DELETION_AUDIT_STATUS = {
  REQUESTED: "requested",
  COMPLETED: "completed",
  BLOCKED: "blocked",
  FAILED: "failed",
} as const;

export type AccountDeletionAuditStatus =
  (typeof ACCOUNT_DELETION_AUDIT_STATUS)[keyof typeof ACCOUNT_DELETION_AUDIT_STATUS];

export function getSafeIpHash(ipKey: string): string {
  const trimmed = ipKey.trim();
  if (!trimmed) return "missing";
  return `sha256:${createHash("sha256").update(trimmed).digest("hex").slice(0, 12)}`;
}

export interface AccountDeletionAuditStore {
  createRecord(data: {
    userId: string;
    emailHash: string;
    status: AccountDeletionAuditStatus;
    blockReason?: string | null;
    failureReason?: string | null;
    ipHash?: string | null;
    completedAt?: Date | null;
  }): Promise<{ id: string }>;
  updateRecord(
    id: string,
    data: {
      status: AccountDeletionAuditStatus;
      completedAt?: Date | null;
      failureReason?: string | null;
    },
  ): Promise<void>;
}