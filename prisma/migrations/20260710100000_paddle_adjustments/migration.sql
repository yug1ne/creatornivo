-- CreateTable
CREATE TABLE "PaddleAdjustment" (
    "id" TEXT NOT NULL,
    "paddleAdjustmentId" TEXT NOT NULL,
    "paddleTransactionId" TEXT NOT NULL,
    "paddleSubscriptionId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "type" TEXT,
    "status" TEXT NOT NULL,
    "currencyCode" TEXT,
    "total" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "accessAction" TEXT NOT NULL DEFAULT 'none',
    "accessRevokedAt" TIMESTAMP(3),
    "accessRevokedReason" TEXT,
    "cancellationRequired" BOOLEAN NOT NULL DEFAULT false,
    "cancellationAttemptedAt" TIMESTAMP(3),
    "cancellationCompletedAt" TIMESTAMP(3),
    "lastEventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaddleAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaddleAdjustment_paddleAdjustmentId_key" ON "PaddleAdjustment"("paddleAdjustmentId");

-- CreateIndex
CREATE INDEX "PaddleAdjustment_paddleTransactionId_idx" ON "PaddleAdjustment"("paddleTransactionId");

-- CreateIndex
CREATE INDEX "PaddleAdjustment_paddleSubscriptionId_idx" ON "PaddleAdjustment"("paddleSubscriptionId");

-- CreateIndex
CREATE INDEX "PaddleAdjustment_userId_occurredAt_idx" ON "PaddleAdjustment"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "PaddleAdjustment_cancellationRequired_cancellationCompletedAt_idx" ON "PaddleAdjustment"("cancellationRequired", "cancellationCompletedAt");

-- AddForeignKey
ALTER TABLE "PaddleAdjustment" ADD CONSTRAINT "PaddleAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
