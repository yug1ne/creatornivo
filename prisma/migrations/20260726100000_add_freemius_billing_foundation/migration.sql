-- Freemius Phase 1: additive billing foundation only.
-- No Paddle/Stripe removals. No UserUsage changes. No data wipe.

-- AlterEnum: PaymentProvider += freemius
ALTER TYPE "PaymentProvider" ADD VALUE 'freemius';

-- AlterTable Subscription: Freemius ids + provider period start
ALTER TABLE "Subscription" ADD COLUMN     "freemiusUserId" TEXT,
ADD COLUMN     "freemiusLicenseId" TEXT,
ADD COLUMN     "freemiusSubscriptionId" TEXT,
ADD COLUMN     "freemiusPlanId" TEXT,
ADD COLUMN     "freemiusPricingId" TEXT,
ADD COLUMN     "freemiusProductId" TEXT,
ADD COLUMN     "billingInterval" TEXT,
ADD COLUMN     "currentPeriodStart" TIMESTAMP(3),
ADD COLUMN     "lastFreemiusEventAt" TIMESTAMP(3);

-- CreateTable FreemiusWebhookEvent
CREATE TABLE "FreemiusWebhookEvent" (
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreemiusWebhookEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable FreemiusCheckoutIntent
CREATE TABLE "FreemiusCheckoutIntent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pricingId" TEXT NOT NULL,
    "freemiusCheckoutId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "FreemiusCheckoutIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_freemiusUserId_key" ON "Subscription"("freemiusUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_freemiusLicenseId_key" ON "Subscription"("freemiusLicenseId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_freemiusSubscriptionId_key" ON "Subscription"("freemiusSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_freemiusPricingId_idx" ON "Subscription"("freemiusPricingId");

-- CreateIndex
CREATE INDEX "Subscription_freemiusPlanId_idx" ON "Subscription"("freemiusPlanId");

-- CreateIndex
CREATE INDEX "FreemiusWebhookEvent_occurredAt_idx" ON "FreemiusWebhookEvent"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "FreemiusCheckoutIntent_freemiusCheckoutId_key" ON "FreemiusCheckoutIntent"("freemiusCheckoutId");

-- CreateIndex
CREATE INDEX "FreemiusCheckoutIntent_userId_createdAt_idx" ON "FreemiusCheckoutIntent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FreemiusCheckoutIntent_status_expiresAt_idx" ON "FreemiusCheckoutIntent"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "FreemiusCheckoutIntent" ADD CONSTRAINT "FreemiusCheckoutIntent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
