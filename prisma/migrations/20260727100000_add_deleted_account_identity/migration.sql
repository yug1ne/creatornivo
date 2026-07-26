-- Additive: free-account anti-abuse tombstone (HMAC email identity only).
-- CreateTable
CREATE TABLE "DeletedAccountIdentity" (
    "id" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "normalizedDomain" TEXT,
    "deletedUserId" TEXT,
    "deletedAt" TIMESTAMP(3) NOT NULL,
    "reRegisterBlockedUntil" TIMESTAMP(3),
    "freeTrialLockedUntil" TIMESTAMP(3),
    "deletionCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeletedAccountIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeletedAccountIdentity_emailHash_key" ON "DeletedAccountIdentity"("emailHash");

-- CreateIndex
CREATE INDEX "DeletedAccountIdentity_reRegisterBlockedUntil_idx" ON "DeletedAccountIdentity"("reRegisterBlockedUntil");

-- CreateIndex
CREATE INDEX "DeletedAccountIdentity_normalizedDomain_idx" ON "DeletedAccountIdentity"("normalizedDomain");
