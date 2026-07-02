-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('stripe', 'paddle');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "provider" "PaymentProvider" NOT NULL DEFAULT 'paddle';
ALTER TABLE "Subscription" ADD COLUMN "paddleCustomerId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "paddleSubscriptionId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "paddlePriceId" TEXT;
ALTER TABLE "Subscription" ALTER COLUMN "stripeCustomerId" DROP NOT NULL;

-- Backfill existing Stripe subscriptions
UPDATE "Subscription"
SET "provider" = 'stripe'
WHERE "stripeCustomerId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_paddleCustomerId_key" ON "Subscription"("paddleCustomerId");
CREATE UNIQUE INDEX "Subscription_paddleSubscriptionId_key" ON "Subscription"("paddleSubscriptionId");