-- CreateEnum
CREATE TYPE "NavTargetKind" AS ENUM ('HOME', 'ABOUT', 'CONTACT', 'BOARD', 'EXTERNAL_URL');

-- CreateEnum
CREATE TYPE "BoardKind" AS ENUM ('GALLERY_MULTI', 'GALLERY_SINGLE');

-- DropForeignKey
ALTER TABLE "Exhibition" DROP CONSTRAINT "Exhibition_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ExhibitionPhoto" DROP CONSTRAINT "ExhibitionPhoto_exhibitionId_fkey";

-- DropForeignKey
ALTER TABLE "ExhibitionPhoto" DROP CONSTRAINT "ExhibitionPhoto_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectPhoto" DROP CONSTRAINT "ProjectPhoto_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectPhoto" DROP CONSTRAINT "ProjectPhoto_tenantId_fkey";

-- AlterTable
ALTER TABLE "NavItem" DROP COLUMN "targetPage",
DROP COLUMN "type",
ADD COLUMN     "targetBoardId" TEXT,
ADD COLUMN     "targetKind" "NavTargetKind" NOT NULL DEFAULT 'HOME';

-- DropTable
DROP TABLE "Exhibition";

-- DropTable
DROP TABLE "ExhibitionPhoto";

-- DropTable
DROP TABLE "Project";

-- DropTable
DROP TABLE "ProjectPhoto";

-- DropEnum
DROP TYPE "InternalPage";

-- DropEnum
DROP TYPE "NavItemType";

-- CreateTable
CREATE TABLE "AboutPage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "AboutPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Board" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "BoardKind" NOT NULL DEFAULT 'GALLERY_MULTI',
    "order" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "slug" TEXT,
    "name" TEXT NOT NULL,
    "dateValue" TEXT,
    "order" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "indexEnabled" BOOLEAN NOT NULL DEFAULT false,
    "indexContent" TEXT,

    CONSTRAINT "BoardItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardItemPhoto" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "boardItemId" TEXT NOT NULL,
    "r2Key" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,

    CONSTRAINT "BoardItemPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AboutPage_tenantId_key" ON "AboutPage"("tenantId");

-- CreateIndex
CREATE INDEX "Board_tenantId_order_idx" ON "Board"("tenantId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Board_tenantId_seq_key" ON "Board"("tenantId", "seq");

-- CreateIndex
CREATE INDEX "BoardItem_tenantId_boardId_order_idx" ON "BoardItem"("tenantId", "boardId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "BoardItem_tenantId_boardId_slug_key" ON "BoardItem"("tenantId", "boardId", "slug");

-- CreateIndex
CREATE INDEX "BoardItemPhoto_tenantId_idx" ON "BoardItemPhoto"("tenantId");

-- CreateIndex
CREATE INDEX "BoardItemPhoto_boardItemId_order_idx" ON "BoardItemPhoto"("boardItemId", "order");

-- AddForeignKey
ALTER TABLE "AboutPage" ADD CONSTRAINT "AboutPage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NavItem" ADD CONSTRAINT "NavItem_targetBoardId_fkey" FOREIGN KEY ("targetBoardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Board" ADD CONSTRAINT "Board_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardItem" ADD CONSTRAINT "BoardItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardItem" ADD CONSTRAINT "BoardItem_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardItemPhoto" ADD CONSTRAINT "BoardItemPhoto_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardItemPhoto" ADD CONSTRAINT "BoardItemPhoto_boardItemId_fkey" FOREIGN KEY ("boardItemId") REFERENCES "BoardItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing NavItem rows get backfilled to targetKind='HOME' by the DEFAULT
-- above purely so this migration can run non-interactively; that default
-- is dropped immediately after (see prisma/schema.prisma -- targetKind has
-- no @default in the actual model). Real values get set by the seed
-- rewrite that follows this migration.
ALTER TABLE "NavItem" ALTER COLUMN "targetKind" DROP DEFAULT;

-- CheckConstraint: enforce "exactly one of targetBoardId/url is set,
-- matching targetKind" at the DB level -- both live on the same row here,
-- unlike BoardItem.slug's cross-table invariant which can only be
-- app-validated. See docs/roadmap.md's board redesign notes.
ALTER TABLE "NavItem" ADD CONSTRAINT "NavItem_target_exclusive" CHECK (
  ("targetKind" = 'BOARD' AND "targetBoardId" IS NOT NULL AND "url" IS NULL) OR
  ("targetKind" = 'EXTERNAL_URL' AND "url" IS NOT NULL AND "targetBoardId" IS NULL) OR
  ("targetKind" IN ('HOME', 'ABOUT', 'CONTACT') AND "targetBoardId" IS NULL AND "url" IS NULL)
);
