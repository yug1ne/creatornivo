-- CreateTable
CREATE TABLE "AccountDeletionRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "blockReason" TEXT,
    "failureReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "ipHash" TEXT,

    CONSTRAINT "AccountDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountDeletionRequest_userId_requestedAt_idx" ON "AccountDeletionRequest"("userId", "requestedAt");

-- CreateIndex
CREATE INDEX "AccountDeletionRequest_emailHash_requestedAt_idx" ON "AccountDeletionRequest"("emailHash", "requestedAt");

-- CreateIndex
CREATE INDEX "AccountDeletionRequest_status_requestedAt_idx" ON "AccountDeletionRequest"("status", "requestedAt");