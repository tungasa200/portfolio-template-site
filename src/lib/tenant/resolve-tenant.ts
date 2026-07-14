import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";

// This is the one sanctioned place outside lib/db/ that imports the base
// (unscoped) Prisma client directly: resolving *which* tenant a request
// belongs to is inherently a cross-tenant lookup on the Tenant table itself,
// which has no tenantId column to scope by. Everything downstream of this
// must go through forTenant(tenant.id).
export const resolveTenantByKey = cache(async (tenantKey: string) => {
  return prisma.tenant.findFirst({
    where: {
      OR: [{ slug: tenantKey }, { customDomain: tenantKey }],
    },
    include: { siteSettings: true },
  });
});

export async function requireTenant(tenantKey: string) {
  const tenant = await resolveTenantByKey(tenantKey);
  if (!tenant) {
    notFound();
  }
  return tenant;
}
