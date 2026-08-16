-- AppSumo lifetime codes. Additive only; does not alter Plan, Subscription, or Freemius.

CREATE TYPE "AppSumoRedemptionStatus" AS ENUM ('active', 'revoked', 'refunded');

CREATE TABLE "AppSumoCode" (
    "id" TEXT NOT NULL,
    "codeDigest" TEXT NOT NULL,
    "codeSuffix" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "disabledAt" TIMESTAMP(3),
    "disabledReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSumoCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppSumoCode_codeDigest_key" ON "AppSumoCode"("codeDigest");
CREATE INDEX "AppSumoCode_batchId_idx" ON "AppSumoCode"("batchId");
CREATE INDEX "AppSumoCode_disabledAt_idx" ON "AppSumoCode"("disabledAt");

CREATE TABLE "AppSumoRedemption" (
    "id" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "userId" TEXT,
    "status" "AppSumoRedemptionStatus" NOT NULL DEFAULT 'active',
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" TIMESTAMP(3),
    "deactivationReason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSumoRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppSumoRedemption_codeId_key" ON "AppSumoRedemption"("codeId");
CREATE INDEX "AppSumoRedemption_userId_status_idx" ON "AppSumoRedemption"("userId", "status");
CREATE INDEX "AppSumoRedemption_status_redeemedAt_idx" ON "AppSumoRedemption"("status", "redeemedAt");

ALTER TABLE "AppSumoRedemption"
ADD CONSTRAINT "AppSumoRedemption_codeId_fkey"
FOREIGN KEY ("codeId") REFERENCES "AppSumoCode"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AppSumoRedemption"
ADD CONSTRAINT "AppSumoRedemption_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AppSumoAuditEvent" (
    "id" TEXT NOT NULL,
    "codeId" TEXT,
    "redemptionId" TEXT,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppSumoAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppSumoAuditEvent_codeId_createdAt_idx" ON "AppSumoAuditEvent"("codeId", "createdAt");
CREATE INDEX "AppSumoAuditEvent_userId_createdAt_idx" ON "AppSumoAuditEvent"("userId", "createdAt");
CREATE INDEX "AppSumoAuditEvent_eventType_createdAt_idx" ON "AppSumoAuditEvent"("eventType", "createdAt");

REVOKE ALL ON TABLE public."AppSumoCode" FROM anon, authenticated;
ALTER TABLE public."AppSumoCode" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."AppSumoRedemption" FROM anon, authenticated;
ALTER TABLE public."AppSumoRedemption" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."AppSumoAuditEvent" FROM anon, authenticated;
ALTER TABLE public."AppSumoAuditEvent" ENABLE ROW LEVEL SECURITY;
