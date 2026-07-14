-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('FREE');

-- CreateEnum
CREATE TYPE "CustomDomainStatus" AS ENUM ('NONE', 'PENDING', 'VERIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('TENANT_OWNER', 'TENANT_ADMIN', 'PLATFORM_SUPERADMIN');

-- CreateEnum
CREATE TYPE "NavItemType" AS ENUM ('INTERNAL_PAGE', 'EXTERNAL_URL');

-- CreateEnum
CREATE TYPE "InternalPage" AS ENUM ('HOME', 'PHOTO', 'WORK', 'CONTACT');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('NEW', 'READ', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "customDomain" TEXT,
    "customDomainStatus" "CustomDomainStatus" NOT NULL DEFAULT 'NONE',
    "planTier" "TenantPlan" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'TENANT_OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "photographerName" TEXT NOT NULL,
    "heroImageKey" TEXT,
    "contactEmail" TEXT NOT NULL,
    "footerText" TEXT,
    "themeName" TEXT NOT NULL DEFAULT 'editorial-default',

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NavItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "NavItemType" NOT NULL,
    "targetPage" "InternalPage",
    "url" TEXT,
    "order" INTEGER NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NavItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "SocialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectPhoto" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "r2Key" TEXT NOT NULL,
    "label" TEXT,
    "order" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,

    CONSTRAINT "ProjectPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exhibition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverPhotoR2Key" TEXT,
    "order" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exhibition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExhibitionPhoto" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "exhibitionId" TEXT NOT NULL,
    "r2Key" TEXT NOT NULL,
    "label" TEXT,
    "order" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,

    CONSTRAINT "ExhibitionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactSubmission" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachmentR2Key" TEXT,
    "status" "ContactStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_customDomain_key" ON "Tenant"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteSettings_tenantId_key" ON "SiteSettings"("tenantId");

-- CreateIndex
CREATE INDEX "NavItem_tenantId_order_idx" ON "NavItem"("tenantId", "order");

-- CreateIndex
CREATE INDEX "SocialLink_tenantId_order_idx" ON "SocialLink"("tenantId", "order");

-- CreateIndex
CREATE INDEX "Project_tenantId_order_idx" ON "Project"("tenantId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Project_tenantId_slug_key" ON "Project"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "ProjectPhoto_tenantId_idx" ON "ProjectPhoto"("tenantId");

-- CreateIndex
CREATE INDEX "ProjectPhoto_projectId_order_idx" ON "ProjectPhoto"("projectId", "order");

-- CreateIndex
CREATE INDEX "Exhibition_tenantId_order_idx" ON "Exhibition"("tenantId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Exhibition_tenantId_slug_key" ON "Exhibition"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "ExhibitionPhoto_tenantId_idx" ON "ExhibitionPhoto"("tenantId");

-- CreateIndex
CREATE INDEX "ExhibitionPhoto_exhibitionId_order_idx" ON "ExhibitionPhoto"("exhibitionId", "order");

-- CreateIndex
CREATE INDEX "ContactSubmission_tenantId_status_idx" ON "ContactSubmission"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NavItem" ADD CONSTRAINT "NavItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialLink" ADD CONSTRAINT "SocialLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPhoto" ADD CONSTRAINT "ProjectPhoto_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPhoto" ADD CONSTRAINT "ProjectPhoto_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exhibition" ADD CONSTRAINT "Exhibition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExhibitionPhoto" ADD CONSTRAINT "ExhibitionPhoto_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExhibitionPhoto" ADD CONSTRAINT "ExhibitionPhoto_exhibitionId_fkey" FOREIGN KEY ("exhibitionId") REFERENCES "Exhibition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSubmission" ADD CONSTRAINT "ContactSubmission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
