import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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
