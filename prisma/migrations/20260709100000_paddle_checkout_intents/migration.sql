-- CreateTable
CREATE TABLE "PaddleCheckoutIntent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "priceId" TEXT NOT NULL,
    "paddleTransactionId" TEXT,
    "paddleSubscriptionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PaddleCheckoutIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaddleCheckoutIntent_paddleTransactionId_key" ON "PaddleCheckoutIntent"("paddleTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaddleCheckoutIntent_paddleSubscriptionId_key" ON "PaddleCheckoutIntent"("paddleSubscriptionId");

-- CreateIndex
CREATE INDEX "PaddleCheckoutIntent_userId_createdAt_idx" ON "PaddleCheckoutIntent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PaddleCheckoutIntent_status_expiresAt_idx" ON "PaddleCheckoutIntent"("status", "expiresAt");

-- Prevent concurrent serverless instances from creating two live checkouts
CREATE UNIQUE INDEX "PaddleCheckoutIntent_one_live_per_user_key"
ON "PaddleCheckoutIntent"("userId")
WHERE "status" IN (
    'pending',
    'transaction_created',
    'transaction_completed',
    'subscription_bound'
);

-- Preserve Paddle's raw lifecycle state, including paused
ALTER TABLE "Subscription" ADD COLUMN "paddleStatus" TEXT;

-- AddForeignKey
ALTER TABLE "PaddleCheckoutIntent" ADD CONSTRAINT "PaddleCheckoutIntent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
