import type { Prisma } from "@prisma/client";

export type AppSumoAuditEventType =
  | "batch_generated"
  | "redeem_success"
  | "redeem_rejected"
  | "revoked"
  | "refunded"
  | "code_disabled"
  | "inspected";

export type AppSumoAuditWriter = {
  appSumoAuditEvent: {
    create(args: {
      data: {
        codeId?: string | null;
        redemptionId?: string | null;
        userId?: string | null;
        eventType: string;
        reason?: string | null;
        metadata?: Prisma.InputJsonValue;
      };
    }): Promise<unknown>;
  };
};

export async function writeAppSumoAuditEvent(
  database: AppSumoAuditWriter,
  input: {
    eventType: AppSumoAuditEventType;
    codeId?: string | null;
    redemptionId?: string | null;
    userId?: string | null;
    reason?: string | null;
    metadata?: Record<string, unknown> | null;
  },
): Promise<void> {
  await database.appSumoAuditEvent.create({
    data: {
      codeId: input.codeId ?? null,
      redemptionId: input.redemptionId ?? null,
      userId: input.userId ?? null,
      eventType: input.eventType,
      reason: input.reason ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
