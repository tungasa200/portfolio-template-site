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
// request-serving runtime's restricted role.
const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

// Sample content mirrors design/Photographer Portfolio.dc.html's own
// placeholder projectDefs/exhibitionDefs, so the template ships with
// something to look at on /photo and /work out of the box. r2Key/width/
// height are placeholders — there's no real upload pipeline until Phase 4;
// the detail pages render fixed-aspect-ratio boxes, not these dimensions.
const PROJECT_DEFS = [
  { slug: "project-name", name: "Project Name", category: "Beauty", period: "Jan — Mar 2026", photoCount: 4 },
  { slug: "nord-audio", name: "Nord Audio", category: "Tech", period: "Sep — Nov 2025", photoCount: 4 },
  { slug: "still-water-co", name: "Still Water Co.", category: "Beverage", period: "Jun — Jul 2025", photoCount: 4 },
  { slug: "field-apparel", name: "Field Apparel", category: "Apparel", period: "Feb — Apr 2025", photoCount: 4 },
  { slug: "home-and-form", name: "Home & Form", category: "Home", period: "Oct — Dec 2024", photoCount: 4 },
  { slug: "line-accessories", name: "Line Accessories", category: "Accessories", period: "Mar — May 2024", photoCount: 4 },
];

const EXHIBITION_DEFS = [
  {
    slug: "art-work-name",
    name: "Art Work Name",
    venue: "Gallery Sohn, Seoul",
    period: "Apr 2026",
    photoCount: 4,
    description:
      "A series examining domestic objects removed from use, photographed as still, isolated forms. The work considers how meaning drains from an object once its function is taken away.",
  },
  {
    slug: "surface-tension",
    name: "Surface Tension",
    venue: "Studio Concrete, Busan",
    period: "Nov 2025",
    photoCount: 4,
    description:
      "Studies of material surfaces under controlled light — concrete, glass, and skin treated with the same visual attention, blurring the line between the industrial and the organic.",
  },
  {
    slug: "objects-at-rest",
    name: "Objects at Rest",
    venue: "Space Won, Seoul",
    period: "May 2025",
    photoCount: 4,
    description:
      "A quiet catalogue of everyday tools arranged without hierarchy, asking the viewer to look at the ordinary as if for the first time.",
  },
  {
    slug: "quiet-material",
    name: "Quiet Material",
    venue: "Atelier Baek, Seoul",
    period: "Sep 2024",
    photoCount: 4,
    description:
      "An exploration of restraint — minimal compositions built from natural materials, shot with soft, even light to remove drama from the frame.",
  },
];

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
      navItems: {
        create: [
          { label: "HOME", type: "INTERNAL_PAGE", targetPage: "HOME", order: 0 },
          { label: "PHOTO", type: "INTERNAL_PAGE", targetPage: "PHOTO", order: 1 },
          { label: "WORK", type: "INTERNAL_PAGE", targetPage: "WORK", order: 2 },
          { label: "CONTACT", type: "INTERNAL_PAGE", targetPage: "CONTACT", order: 3 },
        ],
      },
      socialLinks: {
        create: [{ platform: "instagram", url: "https://instagram.com", order: 0 }],
      },
    },
  });

  console.log(`Seeded tenant "${tenant.slug}" (id: ${tenant.id})`);

  const existingProject = await prisma.project.findFirst({ where: { tenantId: tenant.id } });
  if (!existingProject) {
    for (const [index, def] of PROJECT_DEFS.entries()) {
      await prisma.project.create({
        data: {
          tenantId: tenant.id,
          slug: def.slug,
          name: def.name,
          category: def.category,
          period: def.period,
          order: index,
          isPublished: true,
          photos: {
            create: Array.from({ length: def.photoCount }, (_, i) => ({
              tenantId: tenant.id,
              r2Key: `placeholder/${def.slug}/shot-${i + 1}`,
              label: `SHOT ${String(i + 1).padStart(2, "0")}`,
              order: i,
              width: 1600,
              height: 1200,
            })),
          },
        },
      });
    }
    console.log(`Seeded ${PROJECT_DEFS.length} sample projects.`);
  }

  const existingExhibition = await prisma.exhibition.findFirst({ where: { tenantId: tenant.id } });
  if (!existingExhibition) {
    for (const [index, def] of EXHIBITION_DEFS.entries()) {
      await prisma.exhibition.create({
        data: {
          tenantId: tenant.id,
          slug: def.slug,
          name: def.name,
          venue: def.venue,
          period: def.period,
          description: def.description,
          order: index,
          isPublished: true,
          photos: {
            create: Array.from({ length: def.photoCount }, (_, i) => ({
              tenantId: tenant.id,
              r2Key: `placeholder/${def.slug}/plate-${i + 1}`,
              label: `PLATE ${String(i + 1).padStart(2, "0")}`,
              order: i,
              width: 1600,
              height: 1200,
            })),
          },
        },
      });
    }
    console.log(`Seeded ${EXHIBITION_DEFS.length} sample exhibitions.`);
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
