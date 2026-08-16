import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { writeAppSumoAuditEvent } from "@/lib/appsumo/audit";
import {
  digestAppSumoCode,
  normalizeAppSumoCode,
} from "@/lib/appsumo/codes";

export type AppSumoDeactivationKind = "revoked" | "refunded";

export type AppSumoOwnerActionResult =
  | { ok: true; codeId: string; redemptionId: string | null }
  | { ok: false; reason: "invalid_code" | "not_found" | "already_inactive" | "already_redeemed" };

async function runSerializable<T>(
  database: typeof prisma,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return database.$transaction(operation, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

export async function deactivateAppSumoCode(
  rawCode: unknown,
  input: {
    kind: AppSumoDeactivationKind;
    reason: string;
  },
  options: { database?: typeof prisma; env?: NodeJS.ProcessEnv; now?: Date } = {},
): Promise<AppSumoOwnerActionResult> {
  const canonical = normalizeAppSumoCode(rawCode);
  if (!canonical) return { ok: false, reason: "invalid_code" };

  const digest = digestAppSumoCode(canonical, options.env);
  const database = options.database ?? prisma;
  const now = options.now ?? new Date();

  return runSerializable(database, async (transaction) => {
    const code = await transaction.appSumoCode.findUnique({
      where: { codeDigest: digest },
      select: {
        id: true,
        redemption: {
          select: { id: true, status: true },
        },
      },
    });

    if (!code) return { ok: false, reason: "not_found" };
    if (!code.redemption) return { ok: false, reason: "not_found" };
    if (code.redemption.status !== "active") {
      return { ok: false, reason: "already_inactive" };
    }

    await transaction.appSumoRedemption.update({
      where: { id: code.redemption.id },
      data: {
        status: input.kind,
        deactivatedAt: now,
        deactivationReason: input.reason,
      },
    });

    await writeAppSumoAuditEvent(transaction, {
      eventType: input.kind,
      codeId: code.id,
      redemptionId: code.redemption.id,
      reason: input.reason,
    });

    return { ok: true, codeId: code.id, redemptionId: code.redemption.id };
  });
}

export async function disableUnusedAppSumoCode(
  rawCode: unknown,
  reason: string,
  options: { database?: typeof prisma; env?: NodeJS.ProcessEnv; now?: Date } = {},
): Promise<AppSumoOwnerActionResult> {
  const canonical = normalizeAppSumoCode(rawCode);
  if (!canonical) return { ok: false, reason: "invalid_code" };

  const digest = digestAppSumoCode(canonical, options.env);
  const database = options.database ?? prisma;
  const now = options.now ?? new Date();

  return runSerializable(database, async (transaction) => {
    const code = await transaction.appSumoCode.findUnique({
      where: { codeDigest: digest },
      select: {
        id: true,
        disabledAt: true,
        redemption: { select: { id: true } },
      },
    });

    if (!code) return { ok: false, reason: "not_found" };
    if (code.redemption) return { ok: false, reason: "already_redeemed" };
    if (code.disabledAt) return { ok: false, reason: "already_inactive" };

    await transaction.appSumoCode.update({
      where: { id: code.id },
      data: {
        disabledAt: now,
        disabledReason: reason,
      },
    });

    await writeAppSumoAuditEvent(transaction, {
      eventType: "code_disabled",
      codeId: code.id,
      reason,
    });

    return { ok: true, codeId: code.id, redemptionId: null };
  });
}
