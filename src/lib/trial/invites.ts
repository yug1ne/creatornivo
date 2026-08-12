import { createHash, randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";

import {
  TRIAL_DURATION_MS,
  TRIAL_INVITE_TOKEN_BYTES,
} from "@/config/trial";
import { prisma } from "@/lib/db";

export const TRIAL_INVITE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const TRIAL_TRANSACTION_MAX_ATTEMPTS = 3;

export type TrialInviteValidationResult =
  | "valid"
  | "invalid"
  | "expired"
  | "revoked"
  | "claimed";

export type TrialActivationStatus =
  | "activated"
  | "already_active"
  | "pending_verification"
  | "already_used"
  | "paid_pro"
  | "invite_required"
  | "invite_unavailable";

export type TrialActivationResult = {
  status: TrialActivationStatus;
  trialStartedAt?: Date;
  trialEndsAt?: Date;
};

export type TrialDatabase = {
  $transaction<T>(
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
  ): Promise<T>;
};

export function generateTrialInviteToken(): string {
  return randomBytes(TRIAL_INVITE_TOKEN_BYTES).toString("base64url");
}

export function hashTrialInviteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function normalizeTrialInviteToken(token: unknown): string | null {
  if (typeof token !== "string") return null;
  const normalized = token.trim();
  return TRIAL_INVITE_TOKEN_PATTERN.test(normalized) ? normalized : null;
}

function isSerializationConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

function isTrialClaimUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function runSerializableWithRetry<T>(
  database: TrialDatabase,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= TRIAL_TRANSACTION_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await database.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        !isSerializationConflict(error) ||
        attempt === TRIAL_TRANSACTION_MAX_ATTEMPTS
      ) {
        throw error;
      }
    }
  }

  throw new Error("Trial transaction retry exhausted");
}

export async function validateTrialInviteToken(
  tokenInput: unknown,
  options: { database?: typeof prisma; now?: Date } = {},
): Promise<TrialInviteValidationResult> {
  const token = normalizeTrialInviteToken(tokenInput);
  if (!token) return "invalid";

  const database = options.database ?? prisma;
  const now = options.now ?? new Date();
  const invite = await database.trialInvite.findUnique({
    where: { tokenHash: hashTrialInviteToken(token) },
    select: {
      expiresAt: true,
      revokedAt: true,
      claimedAt: true,
      claimedByUserId: true,
    },
  });

  if (!invite) return "invalid";
  if (invite.revokedAt) return "revoked";
  if (invite.claimedAt || invite.claimedByUserId) return "claimed";
  if (invite.expiresAt.getTime() <= now.getTime()) return "expired";
  return "valid";
}

async function claimOrActivateTrialTransaction(
  transaction: Prisma.TransactionClient,
  input: { userId: string; token?: string | null },
  now: Date,
): Promise<TrialActivationResult> {
  const token = input.token ? normalizeTrialInviteToken(input.token) : null;
  const user = await transaction.user.findUnique({
    where: { id: input.userId },
    select: {
      plan: true,
      emailVerified: true,
      trialStartedAt: true,
      trialEndsAt: true,
    },
  });

  if (!user) return { status: "invite_unavailable" };
  if (user.plan === "pro") return { status: "paid_pro" };

  if (user.trialStartedAt) {
    if (user.trialEndsAt && user.trialEndsAt.getTime() > now.getTime()) {
      return {
        status: "already_active",
        trialStartedAt: user.trialStartedAt,
        trialEndsAt: user.trialEndsAt,
      };
    }
    return { status: "already_used" };
  }

  const claimedInvite = await transaction.trialInvite.findUnique({
    where: { claimedByUserId: input.userId },
    select: { id: true },
  });

  if (!claimedInvite) {
    if (!token) return { status: "invite_required" };

    const tokenHash = hashTrialInviteToken(token);
    const invite = await transaction.trialInvite.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        expiresAt: true,
        revokedAt: true,
        claimedAt: true,
        claimedByUserId: true,
      },
    });

    if (
      !invite ||
      invite.revokedAt ||
      invite.claimedAt ||
      invite.claimedByUserId ||
      invite.expiresAt.getTime() <= now.getTime()
    ) {
      return { status: "invite_unavailable" };
    }

    const claimed = await transaction.trialInvite.updateMany({
      where: {
        id: invite.id,
        claimedAt: null,
        claimedByUserId: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        claimedAt: now,
        claimedByUserId: input.userId,
      },
    });

    if (claimed.count !== 1) {
      return { status: "invite_unavailable" };
    }
  }

  if (!user.emailVerified) {
    return { status: "pending_verification" };
  }

  const trialEndsAt = new Date(now.getTime() + TRIAL_DURATION_MS);
  const activated = await transaction.user.updateMany({
    where: {
      id: input.userId,
      plan: "free",
      emailVerified: { not: null },
      trialStartedAt: null,
    },
    data: {
      trialStartedAt: now,
      trialEndsAt,
    },
  });

  if (activated.count !== 1) {
    const current = await transaction.user.findUnique({
      where: { id: input.userId },
      select: { plan: true, trialStartedAt: true, trialEndsAt: true },
    });

    if (current?.plan === "pro") return { status: "paid_pro" };
    if (current?.trialStartedAt && current.trialEndsAt) {
      return {
        status:
          current.trialEndsAt.getTime() > now.getTime()
            ? "already_active"
            : "already_used",
        trialStartedAt: current.trialStartedAt,
        trialEndsAt: current.trialEndsAt,
      };
    }
    return { status: "invite_unavailable" };
  }

  return {
    status: "activated",
    trialStartedAt: now,
    trialEndsAt,
  };
}

export async function claimOrActivateTrial(
  input: { userId: string; token?: string | null },
  options: { database?: TrialDatabase; now?: Date } = {},
): Promise<TrialActivationResult> {
  const database = options.database ?? (prisma as TrialDatabase);
  const now = options.now ?? new Date();

  try {
    return await runSerializableWithRetry(database, (transaction) =>
      claimOrActivateTrialTransaction(transaction, input, now),
    );
  } catch (error) {
    // A concurrent claim for the same invite/account may lose a unique-index
    // race after the other transaction commits. The database has preserved
    // single-use semantics; surface a controlled result instead of a 500.
    if (isTrialClaimUniqueConflict(error)) {
      return { status: "invite_unavailable" };
    }
    throw error;
  }
}

export async function activateClaimedTrialAfterVerification(
  userId: string,
  options: { database?: TrialDatabase; now?: Date } = {},
): Promise<TrialActivationResult> {
  return claimOrActivateTrial({ userId }, options);
}

export async function createTrialInvite(input: {
  expiresAt: Date;
  database?: typeof prisma;
}): Promise<{ id: string; token: string; expiresAt: Date }> {
  const database = input.database ?? prisma;
  const token = generateTrialInviteToken();
  const invite = await database.trialInvite.create({
    data: {
      tokenHash: hashTrialInviteToken(token),
      expiresAt: input.expiresAt,
    },
    select: { id: true, expiresAt: true },
  });

  return { ...invite, token };
}

export async function revokeUnusedTrialInviteById(
  id: string,
  options: { database?: typeof prisma; now?: Date } = {},
): Promise<boolean> {
  const database = options.database ?? prisma;
  const result = await database.trialInvite.updateMany({
    where: {
      id,
      claimedAt: null,
      claimedByUserId: null,
      revokedAt: null,
    },
    data: { revokedAt: options.now ?? new Date() },
  });
  return result.count === 1;
}
