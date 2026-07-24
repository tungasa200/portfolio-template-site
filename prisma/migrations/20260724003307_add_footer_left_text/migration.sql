-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "footerLeftText" TEXT;

-- Backfill: preserve today's visible footer (ownerName) for existing sites.
-- Going forward this field has no fallback — an admin who clears it back to
-- blank gets nothing rendered there (see src/components/site/Footer.tsx).
UPDATE "SiteSettings" SET "footerLeftText" = "ownerName" WHERE "footerLeftText" IS NULL;
