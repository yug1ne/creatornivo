-- AlterTable
ALTER TABLE "User" ADD COLUMN "proConfirmationEmailSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserUsage" ADD COLUMN "quotaExhaustedEmailSentAt" TIMESTAMP(3);