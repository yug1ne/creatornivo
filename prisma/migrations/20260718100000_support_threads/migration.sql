-- CreateEnum
CREATE TYPE "SupportThreadStatus" AS ENUM ('open', 'answered', 'closed');

-- CreateEnum
CREATE TYPE "SupportMessageSenderType" AS ENUM ('USER', 'ADMIN', 'SYSTEM');

-- CreateTable
CREATE TABLE "SupportThread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "SupportThreadStatus" NOT NULL DEFAULT 'open',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderType" "SupportMessageSenderType" NOT NULL,
    "authorUserId" TEXT,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportThread_userId_updatedAt_idx" ON "SupportThread"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportThread_status_lastMessageAt_idx" ON "SupportThread"("status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "SupportThread_userId_status_idx" ON "SupportThread"("userId", "status");

-- CreateIndex
CREATE INDEX "SupportMessage_threadId_createdAt_idx" ON "SupportMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportMessage_authorUserId_idx" ON "SupportMessage"("authorUserId");

-- AddForeignKey
ALTER TABLE "SupportThread" ADD CONSTRAINT "SupportThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "SupportThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
