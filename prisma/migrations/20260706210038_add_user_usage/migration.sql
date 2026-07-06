-- CreateTable
CREATE TABLE "UserUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserUsage_userId_period_idx" ON "UserUsage"("userId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "UserUsage_userId_date_period_key" ON "UserUsage"("userId", "date", "period");

-- AddForeignKey
ALTER TABLE "UserUsage" ADD CONSTRAINT "UserUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "PaddleAdjustment_cancellationRequired_cancellationCompletedAt_i" RENAME TO "PaddleAdjustment_cancellationRequired_cancellationCompleted_idx";
