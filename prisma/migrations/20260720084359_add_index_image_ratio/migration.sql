-- CreateEnum
CREATE TYPE "IndexImageRatio" AS ENUM ('RATIO_3_7', 'RATIO_4_6', 'RATIO_5_5', 'RATIO_6_4', 'RATIO_7_3');

-- AlterTable
ALTER TABLE "BoardItem" ADD COLUMN     "indexImageHeight" INTEGER,
ADD COLUMN     "indexImageRatio" "IndexImageRatio" NOT NULL DEFAULT 'RATIO_5_5',
ADD COLUMN     "indexImageWidth" INTEGER;
