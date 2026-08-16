import { Prisma } from "@prisma/client";

import {
  APPSUMO_MAX_ACTIVE_CODES,
  APPSUMO_MESSAGES,
  getAppSumoTier,
} from "@/config/appsumo";
import { prisma } from "@/lib/db";
import { writeAppSumoAuditEvent } from "@/lib/appsumo/audit";
import {
  digestAppSumoCode,
  normalizeAppSumoCode,
} from "@/lib/appsumo/codes";

export const APPSUMO_REDEEM_TRANSACTION_MAX_ATTEMPTS = 3;

export type AppSumoRedeemStatus =
  | "tier1_active"
  | "tier2_active"
  | "already_owned"
  | "max_codes"
  | "unavailable"
  | "unverified"
  | "unauthenticated"
  | "misconfigured";

export type AppSumoRedeemResult = {
  status: AppSumoRedeemStatus;
  message: string;
  activeCodeCount?: 0 | 1 | 2;
};

export type AppSumoRedeemDatabase = {
  $transaction<T>(
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
  ): Promise<T>;
};

function isSerializationConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function runSerializableWithRetry<T>(
  database: AppSumoRedeemDatabase,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (
    let attempt = 1;
    attempt <= APPSUMO_REDEEM_TRANSACTION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await database.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        !isSerializationConflict(error) ||
        attempt === APPSUMO_REDEEM_TRANSACTION_MAX_ATTEMPTS
      ) {
        throw error;
      }
    }
  }

  throw new Error("AppSumo redeem transaction retry exhausted");
}

function resultForActiveCount(count: number): AppSumoRedeemResult {
  const tier = getAppSumoTier(count);
  if (tier === 2) {
    return {
      status: "tier2_active",
      message: APPSUMO_MESSAGES.tier2Active,
      activeCodeCount: 2,
    };
  }
  return {
    status: "tier1_active",
    message: APPSUMO_MESSAGES.tier1Active,
    activeCodeCount: 1,
  };
}

export async function redeemAppSumoCode(
  input: {
    userId: string;
    emailVerified: boolean;
    rawCode: unknown;
  },
  options: {
    database?: AppSumoRedeemDatabase;
    env?: NodeJS.ProcessEnv;
    now?: Date;
  } = {},
): Promise<AppSumoRedeemResult> {
  if (!input.userId.trim()) {
    return {
      status: "unauthenticated",
      message: APPSUMO_MESSAGES.unauthenticated,
    };
  }

  if (!input.emailVerified) {
    return {
      status: "unverified",
      message: APPSUMO_MESSAGES.unverified,
    };
  }

  const canonical = normalizeAppSumoCode(input.rawCode);
  if (!canonical) {
    return {
      status: "unavailable",
      message: APPSUMO_MESSAGES.unavailable,
    };
  }

  let digest: string;
  try {
    digest = digestAppSumoCode(canonical, options.env);
  } catch {
    return {
      status: "misconfigured",
      message: "AppSumo redemption is temporarily unavailable.",
    };
  }

  const database = options.database ?? (prisma as AppSumoRedeemDatabase);
  const now = options.now ?? new Date();

  try {
    return await runSerializableWithRetry(database, async (transaction) => {
      const user = await transaction.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      });
      if (!user) {
        return {
          status: "unauthenticated",
          message: APPSUMO_MESSAGES.unauthenticated,
        };
      }

      const code = await transaction.appSumoCode.findUnique({
        where: { codeDigest: digest },
        select: {
          id: true,
          disabledAt: true,
          redemption: {
            select: {
              id: true,
              userId: true,
              status: true,
            },
          },
        },
      });

      if (!code || code.disabledAt) {
        await writeAppSumoAuditEvent(transaction, {
          eventType: "redeem_rejected",
          userId: input.userId,
          reason: "unavailable",
        });
        return {
          status: "unavailable",
          message: APPSUMO_MESSAGES.unavailable,
        };
      }

      if (code.redemption) {
        if (
          code.redemption.userId === input.userId &&
          code.redemption.status === "active"
        ) {
          const activeCount = await transaction.appSumoRedemption.count({
            where: { userId: input.userId, status: "active" },
          });
          return {
            status: "already_owned",
            message: APPSUMO_MESSAGES.alreadyOwned,
            activeCodeCount: activeCount >= 2 ? 2 : 1,
          };
        }

        await writeAppSumoAuditEvent(transaction, {
          eventType: "redeem_rejected",
          codeId: code.id,
          userId: input.userId,
          reason: "already_redeemed",
        });
        return {
          status: "unavailable",
          message: APPSUMO_MESSAGES.unavailable,
        };
      }

      const activeCount = await transaction.appSumoRedemption.count({
        where: { userId: input.userId, status: "active" },
      });

      if (activeCount >= APPSUMO_MAX_ACTIVE_CODES) {
        await writeAppSumoAuditEvent(transaction, {
          eventType: "redeem_rejected",
          codeId: code.id,
          userId: input.userId,
          reason: "max_codes",
        });
        return {
          status: "max_codes",
          message: APPSUMO_MESSAGES.maxCodes,
          activeCodeCount: 2,
        };
      }

      const created = await transaction.appSumoRedemption.create({
        data: {
          codeId: code.id,
          userId: input.userId,
          status: "active",
          redeemedAt: now,
        },
        select: { id: true },
      });

      const nextCount = activeCount + 1;
      await writeAppSumoAuditEvent(transaction, {
        eventType: "redeem_success",
        codeId: code.id,
        redemptionId: created.id,
        userId: input.userId,
        metadata: { activeCodeCount: nextCount },
      });

      return resultForActiveCount(nextCount);
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return {
        status: "unavailable",
        message: APPSUMO_MESSAGES.unavailable,
      };
    }
    throw error;
  }
}
