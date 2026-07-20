-- Baseline migration: records schema changes that were already applied
-- directly to the database (outside the migration history, likely via
-- `prisma db push` at some earlier point) before this file was authored.
-- This file is marked as already-applied via `prisma migrate resolve
-- --applied` rather than run — the columns below already exist in every
-- environment's database. It exists purely so the migration history
-- matches reality going forward.

-- AlterTable
ALTER TABLE "BoardItem" ADD COLUMN     "indexImageEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "indexImageKey" TEXT;

-- AlterTable
ALTER TABLE "ContactSubmission" ADD COLUMN     "repliedAt" TIMESTAMP(3),
ADD COLUMN     "replyMessage" TEXT;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "replyEmailAddress" TEXT,
ADD COLUMN     "replyEmailAppPasswordEnc" TEXT;
