import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DEV_ADMIN_EMAIL = "admin@dev.local";
const DEV_ADMIN_PASSWORD = "dev-admin-pass-123";

// DIRECT_URL (the owner role), not DATABASE_URL (the RLS-restricted
// app_runtime role, see prisma/security/create-app-role.sql) -- seed
// writes rows directly without going through forTenant()'s SET LOCAL, so
// it needs the same trusted-CLI privilege as migrations, not the
// request-serving runtime's restricted role. This script also doubles as
// the reference implementation for "operator provisions N boards for a
// new tenant" (see docs/roadmap.md's board-count decision) -- seq is
// assigned sequentially here exactly as a real provisioning flow would.
const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

// GALLERY_MULTI board 1 ("WORK 1") -- item has N photos + its own detail
// page. r2Key/width/height are placeholders -- no real upload pipeline
// until Phase 4; detail pages render fixed-aspect-ratio boxes, not these
// dimensions. First photo of each item is isPrimary (grid thumbnail).
const BOARD1_ITEM_DEFS = [
  { slug: "project-name", name: "Project Name", dateValue: "2026-01", photoCount: 4, indexEnabled: false, indexContent: null },
  {
    slug: "nord-audio",
    name: "Nord Audio",
    dateValue: "2025-09",
    photoCount: 4,
    indexEnabled: true,
    indexContent: "<p>Nord Audio와 3일간 진행한 제품 촬영 프로젝트입니다.</p>",
  },
  { slug: "still-water-co", name: "Still Water Co.", dateValue: "2025-06", photoCount: 4, indexEnabled: false, indexContent: null },
  { slug: "field-apparel", name: "Field Apparel", dateValue: "2025-02", photoCount: 4, indexEnabled: false, indexContent: null },
  { slug: "home-and-form", name: "Home & Form", dateValue: "2024-10", photoCount: 4, indexEnabled: false, indexContent: null },
  { slug: "line-accessories", name: "Line Accessories", dateValue: "2024-03", photoCount: 4, indexEnabled: false, indexContent: null },
];

// GALLERY_MULTI board 2 ("WORK 2") -- indexContent replaces the old
// Exhibition.description (was always-shown/per-board; now optional/per-item).
const BOARD2_ITEM_DEFS = [
  {
    slug: "art-work-name",
    name: "Art Work Name",
    dateValue: "2026-04",
    photoCount: 4,
    indexEnabled: true,
    indexContent:
      "<p>A series examining domestic objects removed from use, photographed as still, isolated forms. The work considers how meaning drains from an object once its function is taken away.</p>",
  },
  {
    slug: "surface-tension",
    name: "Surface Tension",
    dateValue: "2025-11",
    photoCount: 4,
    indexEnabled: true,
    indexContent:
      "<p>Studies of material surfaces under controlled light — concrete, glass, and skin treated with the same visual attention, blurring the line between the industrial and the organic.</p>",
  },
  {
    slug: "objects-at-rest",
    name: "Objects at Rest",
    dateValue: "2025-05",
    photoCount: 4,
    indexEnabled: true,
    indexContent: "<p>A quiet catalogue of everyday tools arranged without hierarchy.</p>",
  },
  { slug: "quiet-material", name: "Quiet Material", dateValue: "2024-09", photoCount: 4, indexEnabled: false, indexContent: null },
];

// GALLERY_SINGLE board ("GALLERY") -- proves the new board kind end-to-end.
// Each item has exactly 1 photo, no slug/detail page, no INDEX content.
const BOARD3_ITEM_DEFS = [
  { name: "Morning Light" },
  { name: "Concrete Study" },
  { name: "Glasshouse" },
  { name: "Untitled 04" },
];

const ABOUT_CONTENT = `
  <h2>안녕하세요, 사진작가 Dev입니다.</h2>
  <p>서울을 기반으로 뷰티, 테크, 라이프스타일 브랜드와 함께 일하는 사진작가입니다. 사물의 질감과 빛을 절제된 방식으로 담아내는 작업을 주로 합니다.</p>
  <p>2019년부터 지금까지 30여 개의 브랜드 캠페인과 4번의 개인전을 진행했습니다. 새로운 작업 문의는 언제든 환영합니다.</p>
`.trim();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "dev" },
    update: {},
    create: {
      slug: "dev",
      siteSettings: {
        create: {
          siteName: "Dev Tenant Portfolio",
          photographerName: "Dev Photographer",
          contactEmail: "dev@example.com",
        },
      },
      socialLinks: {
        create: [{ platform: "instagram", url: "https://instagram.com", order: 0 }],
      },
    },
  });
  console.log(`Seeded tenant "${tenant.slug}" (id: ${tenant.id})`);

  await prisma.aboutPage.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: { tenantId: tenant.id, content: ABOUT_CONTENT },
  });

  const existingBoard = await prisma.board.findFirst({ where: { tenantId: tenant.id } });
  if (!existingBoard) {
    const board1 = await prisma.board.create({
      data: {
        tenantId: tenant.id,
        seq: 1,
        name: "WORK 1",
        kind: "GALLERY_MULTI",
        order: 0,
        isPublished: true,
        items: {
          create: BOARD1_ITEM_DEFS.map((def, index) => ({
            tenantId: tenant.id,
            slug: def.slug,
            name: def.name,
            dateValue: def.dateValue,
            order: index,
            isPublished: true,
            indexEnabled: def.indexEnabled,
            indexContent: def.indexContent,
            photos: {
              create: Array.from({ length: def.photoCount }, (_, i) => ({
                tenantId: tenant.id,
                r2Key: `placeholder/${def.slug}/shot-${i + 1}`,
                isPrimary: i === 0,
                order: i,
                width: 1600,
                height: 1200,
              })),
            },
          })),
        },
      },
    });

    const board2 = await prisma.board.create({
      data: {
        tenantId: tenant.id,
        seq: 2,
        name: "WORK 2",
        kind: "GALLERY_MULTI",
        order: 1,
        isPublished: true,
        items: {
          create: BOARD2_ITEM_DEFS.map((def, index) => ({
            tenantId: tenant.id,
            slug: def.slug,
            name: def.name,
            dateValue: def.dateValue,
            order: index,
            isPublished: true,
            indexEnabled: def.indexEnabled,
            indexContent: def.indexContent,
            photos: {
              create: Array.from({ length: def.photoCount }, (_, i) => ({
                tenantId: tenant.id,
                r2Key: `placeholder/${def.slug}/plate-${i + 1}`,
                isPrimary: i === 0,
                order: i,
                width: 1600,
                height: 1200,
              })),
            },
          })),
        },
      },
    });

    const board3 = await prisma.board.create({
      data: {
        tenantId: tenant.id,
        seq: 3,
        name: "GALLERY",
        kind: "GALLERY_SINGLE",
        order: 2,
        isPublished: true,
        items: {
          create: BOARD3_ITEM_DEFS.map((def, index) => ({
            tenantId: tenant.id,
            name: def.name,
            order: index,
            isPublished: true,
            photos: {
              create: [
                {
                  tenantId: tenant.id,
                  r2Key: `placeholder/gallery/${index + 1}`,
                  isPrimary: true,
                  order: 0,
                  width: 1600,
                  height: 1600,
                },
              ],
            },
          })),
        },
      },
    });

    await prisma.navItem.createMany({
      data: [
        { tenantId: tenant.id, label: "HOME", targetKind: "HOME", order: 0 },
        { tenantId: tenant.id, label: board1.name, targetKind: "BOARD", targetBoardId: board1.id, order: 1 },
        { tenantId: tenant.id, label: board2.name, targetKind: "BOARD", targetBoardId: board2.id, order: 2 },
        { tenantId: tenant.id, label: board3.name, targetKind: "BOARD", targetBoardId: board3.id, order: 3 },
        { tenantId: tenant.id, label: "ABOUT", targetKind: "ABOUT", order: 4 },
        { tenantId: tenant.id, label: "CONTACT", targetKind: "CONTACT", order: 5 },
      ],
    });

    console.log(`Seeded 3 boards (2x GALLERY_MULTI, 1x GALLERY_SINGLE) and their nav items.`);
  }

  const existingUser = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
  if (!existingUser) {
    const passwordHash = await bcrypt.hash(DEV_ADMIN_PASSWORD, 10);
    await prisma.user.create({
      data: {
        email: DEV_ADMIN_EMAIL,
        passwordHash,
        role: "TENANT_OWNER",
        tenantId: tenant.id,
      },
    });
    console.log(
      `Seeded dev admin login — email: ${DEV_ADMIN_EMAIL}, password: ${DEV_ADMIN_PASSWORD} (dev-only, not meant to survive to a real go-live).`
    );
  }

  console.log(`Visit http://dev.${process.env.ROOT_DOMAIN ?? "localhost:3000"} once next dev is running.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
