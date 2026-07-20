-- AlterTable
ALTER TABLE "BoardItem" ADD COLUMN     "indexImageThumbKey" TEXT;

-- AlterTable
ALTER TABLE "BoardItemPhoto" ADD COLUMN     "thumbR2Key" TEXT;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "heroThumbKey" TEXT,
ADD COLUMN     "logoThumbKey" TEXT;
