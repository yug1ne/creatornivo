import { getSafeEmailHash, normalizeEmail } from "@/lib/auth/credentials";

import {
  ACCOUNT_DELETION_AUDIT_STATUS,
  getSafeIpHash,
  type AccountDeletionAuditStore,
} from "./account-deletion-audit";
import type { AccountDeletionDataStore } from "./account-deletion-store";
import { ACCOUNT_DELETION_CONFIRMATION_TEXT } from "./account-deletion-constants";
import {
  getAccountDeletionBlock,
  hasActiveGenerationReservations,
  type AccountDeletionBlockCode,
} from "./account-deletion-policy";
import {
  AccountPasswordVerificationError,
  verifyAccountPassword,
} from "./verify-account-password";

export class AccountDeletionError extends Error {
  constructor(
    public readonly code:
      | "missing_password"
      | "missing_confirmation"
      | "invalid_confirmation"
      | "user_not_found"
      | AccountDeletionBlockCode
      | AccountPasswordVerificationError["code"],
    public readonly message: string,
    public readonly manageSubscription = false,
  ) {
    super(code);
    this.name = "AccountDeletionError";
  }
}

export interface DeleteUserAccountInput {
  userId: string;
  password?: string;
  confirmation?: string;
  ipKey?: string;
}

export async function deleteUserAccount(
  input: DeleteUserAccountInput,
  dependencies: {
    dataStore: AccountDeletionDataStore;
    auditStore: AccountDeletionAuditStore;
    verifyPassword?: typeof verifyAccountPassword;
    now?: () => Date;
  },
) {
  const now = dependencies.now ?? (() => new Date());
  const verifyPassword = dependencies.verifyPassword ?? verifyAccountPassword;
  const currentTime = now();

  const user = await dependencies.dataStore.findDeletionUser(input.userId);
  if (!user) {
    throw new AccountDeletionError("user_not_found", "Account not found");
  }

  const emailHash = getSafeEmailHash(user.email);
  const ipHash = input.ipKey ? getSafeIpHash(input.ipKey) : null;

  const recordBlockedAttempt = async (
    blockReason: AccountDeletionBlockCode,
    message: string,
  ) => {
    await dependencies.auditStore.createRecord({
      userId: user.id,
      emailHash,
      status: ACCOUNT_DELETION_AUDIT_STATUS.BLOCKED,
      blockReason,
      ipHash,
      completedAt: currentTime,
    });
    throw new AccountDeletionError(
      blockReason,
      message,
      blockReason === "subscription_active" ||
        blockReason === "subscription_requires_action",
    );
  };

  const deletionBlock = getAccountDeletionBlock(user, currentTime);
  if (deletionBlock) {
    await recordBlockedAttempt(deletionBlock.code, deletionBlock.message);
  }

  const reservations = await dependencies.dataStore.findActiveReservations(
    user.id,
  );
  if (
    hasActiveGenerationReservations({
      reservations,
      now: currentTime,
    })
  ) {
    await recordBlockedAttempt(
      "generation_in_progress",
      "A generation is in progress. Please wait for it to finish and try again.",
    );
  }

  if (!input.password) {
    throw new AccountDeletionError(
      "missing_password",
      "Password is required to delete your account",
    );
  }

  try {
    await verifyPassword(user.id, input.password);
  } catch (error) {
    if (error instanceof AccountPasswordVerificationError) {
      throw new AccountDeletionError(
        error.code,
        error.code === "password_not_supported"
          ? "Password verification is not available for this account. Contact support to delete your account."
          : "Invalid password",
      );
    }
    throw error;
  }

  if (!input.confirmation?.trim()) {
    throw new AccountDeletionError(
      "missing_confirmation",
      `Type ${ACCOUNT_DELETION_CONFIRMATION_TEXT} to confirm account deletion`,
    );
  }

  if (input.confirmation.trim() !== ACCOUNT_DELETION_CONFIRMATION_TEXT) {
    throw new AccountDeletionError(
      "invalid_confirmation",
      `Confirmation must be exactly ${ACCOUNT_DELETION_CONFIRMATION_TEXT}`,
    );
  }

  const auditRecord = await dependencies.auditStore.createRecord({
    userId: user.id,
    emailHash,
    status: ACCOUNT_DELETION_AUDIT_STATUS.REQUESTED,
    ipHash,
  });

  try {
    await dependencies.dataStore.deleteUserData(
      user.id,
      normalizeEmail(user.email),
    );
    await dependencies.auditStore.updateRecord(auditRecord.id, {
      status: ACCOUNT_DELETION_AUDIT_STATUS.COMPLETED,
      completedAt: currentTime,
    });
  } catch (error) {
    await dependencies.auditStore.updateRecord(auditRecord.id, {
      status: ACCOUNT_DELETION_AUDIT_STATUS.FAILED,
      completedAt: currentTime,
      failureReason:
        error instanceof Error ? error.message.slice(0, 200) : "delete_failed",
    });
    throw error;
  }

  return { deletedUserId: user.id, emailHash };
}