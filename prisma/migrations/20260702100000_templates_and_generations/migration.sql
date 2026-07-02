-- CreateEnum: expand template categories
CREATE TYPE "TemplateCategory_new" AS ENUM ('x_thread', 'linkedin_post', 'newsletter', 'instagram_post', 'blog', 'email', 'marketing', 'product', 'youtube', 'other');

ALTER TABLE "Template" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "Template" ALTER COLUMN "category" TYPE TEXT;

DROP TYPE "TemplateCategory";
CREATE TYPE "TemplateCategory" AS ENUM ('x_thread', 'linkedin_post', 'newsletter', 'instagram_post', 'blog', 'email', 'marketing', 'product', 'youtube', 'other');

ALTER TABLE "Template" ALTER COLUMN "category" TYPE "TemplateCategory" USING (
  CASE "category"
    WHEN 'social' THEN 'instagram_post'::"TemplateCategory"
    WHEN 'blog' THEN 'blog'::"TemplateCategory"
    WHEN 'email' THEN 'email'::"TemplateCategory"
    WHEN 'marketing' THEN 'marketing'::"TemplateCategory"
    WHEN 'product' THEN 'product'::"TemplateCategory"
    ELSE 'other'::"TemplateCategory"
  END
);

DROP TYPE "TemplateCategory_new";

-- CreateTable
CREATE TABLE "Generation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT,
    "prompt" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Generation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Generation_userId_idx" ON "Generation"("userId");

-- CreateIndex
CREATE INDEX "Generation_userId_createdAt_idx" ON "Generation"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;