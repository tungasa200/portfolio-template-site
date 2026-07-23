-- Baseline migration: records a schema change that was already applied
-- directly to the master dev database (via `prisma db push`, outside the
-- migration history) before this file was authored. themeName shipped in
-- 20260714083145_init, but themeCustomInk/themeCustomPaper were added to
-- schema.prisma later without a matching `migrate dev` run, so no
-- migration ever captured them. Fresh forks running `prisma migrate
-- deploy` execute this for real; on the master dev DB it's marked applied
-- via `prisma migrate resolve --applied` instead, since the columns
-- already exist there.

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "themeCustomInk" TEXT,
ADD COLUMN     "themeCustomPaper" TEXT;
