-- CreateTable
CREATE TABLE "GenerationReservation" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "model" TEXT NOT NULL,
    "estimatedMaxOutputTokens" INTEGER NOT NULL,
    "actualInputTokens" INTEGER,
    "actualOutputTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GenerationReservation_userId_requestId_key" ON "GenerationReservation"("userId", "requestId");

-- CreateIndex
CREATE INDEX "GenerationReservation_userId_periodKey_idx" ON "GenerationReservation"("userId", "periodKey");

-- CreateIndex
CREATE INDEX "GenerationReservation_userId_createdAt_idx" ON "GenerationReservation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationReservation_userId_status_expiresAt_idx" ON "GenerationReservation"("userId", "status", "expiresAt");
