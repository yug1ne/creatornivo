-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "lastPaddleEventAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "earlyAccessClaimedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PaddleWebhookEvent" (
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaddleWebhookEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateIndex
CREATE INDEX "Subscription_paddlePriceId_earlyAccessClaimedAt_idx" ON "Subscription"("paddlePriceId", "earlyAccessClaimedAt");

-- CreateIndex
CREATE INDEX "PaddleWebhookEvent_occurredAt_idx" ON "PaddleWebhookEvent"("occurredAt");
