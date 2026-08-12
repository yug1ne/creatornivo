-- Invite-only application trial. Additive only; does not alter billing plans.
ALTER TABLE "User"
ADD COLUMN "trialStartedAt" TIMESTAMP(3),
ADD COLUMN "trialEndsAt" TIMESTAMP(3);

CREATE TABLE "TrialInvite" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "claimedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrialInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrialInvite_tokenHash_key" ON "TrialInvite"("tokenHash");
CREATE UNIQUE INDEX "TrialInvite_claimedByUserId_key" ON "TrialInvite"("claimedByUserId");
CREATE INDEX "TrialInvite_expiresAt_revokedAt_claimedAt_idx" ON "TrialInvite"("expiresAt", "revokedAt", "claimedAt");

ALTER TABLE "TrialInvite"
ADD CONSTRAINT "TrialInvite_claimedByUserId_fkey"
FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

REVOKE ALL ON TABLE public."TrialInvite" FROM anon, authenticated;
ALTER TABLE public."TrialInvite" ENABLE ROW LEVEL SECURITY;
