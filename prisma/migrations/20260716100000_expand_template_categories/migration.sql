-- AlterEnum: expand TemplateCategory for platform expansion (2026-07-09)
ALTER TYPE "TemplateCategory" ADD VALUE IF NOT EXISTS 'facebook_post';
ALTER TYPE "TemplateCategory" ADD VALUE IF NOT EXISTS 'threads_post';
ALTER TYPE "TemplateCategory" ADD VALUE IF NOT EXISTS 'pinterest';
ALTER TYPE "TemplateCategory" ADD VALUE IF NOT EXISTS 'reddit';
ALTER TYPE "TemplateCategory" ADD VALUE IF NOT EXISTS 'google_business';
ALTER TYPE "TemplateCategory" ADD VALUE IF NOT EXISTS 'tiktok';
ALTER TYPE "TemplateCategory" ADD VALUE IF NOT EXISTS 'ecommerce';
ALTER TYPE "TemplateCategory" ADD VALUE IF NOT EXISTS 'community';
ALTER TYPE "TemplateCategory" ADD VALUE IF NOT EXISTS 'product_launch';
ALTER TYPE "TemplateCategory" ADD VALUE IF NOT EXISTS 'sales';
ALTER TYPE "TemplateCategory" ADD VALUE IF NOT EXISTS 'app_ux';
