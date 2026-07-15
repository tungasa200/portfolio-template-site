import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { forTenant } from "@/lib/db/tenant-scoped-client";

// This is the one sanctioned place outside lib/db/ that imports the base
// (unscoped) Prisma client directly: resolving *which* tenant a request
// belongs to is inherently a cross-tenant lookup on the Tenant table itself,
// which has no tenantId column to scope by. Everything downstream of this
// must go through forTenant(tenant.id) — including siteSettings/navItems/
// socialLinks below, which is why they're a *second* query through the
// scoped client rather than an `include` on the first one. Bundling them
// into the same unscoped query looks convenient but is wrong: RLS silently
// returns zero rows for tenant-scoped tables when app.tenant_id was never
// set (see prisma/security/rls.sql), and forTenant() is the only thing
// that sets it. (Found 2026-07-15 while verifying the board redesign —
// every tenant's nav/social links/site settings were silently empty.)
export const resolveTenantByKey = cache(async (tenantKey: string) => {
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ slug: tenantKey }, { customDomain: tenantKey }],
    },
  });
  if (!tenant) {
    return null;
  }

  const db = forTenant(tenant.id);
  const [siteSettings, navItems, socialLinks] = await Promise.all([
    db.siteSettings.findUnique({ where: { tenantId: tenant.id } }),
    db.navItem.findMany({
      where: { isVisible: true },
      orderBy: { order: "asc" },
      include: { targetBoard: { select: { seq: true, name: true } } },
    }),
    db.socialLink.findMany({ orderBy: { order: "asc" } }),
  ]);

  return { ...tenant, siteSettings, navItems, socialLinks };
});

export async function requireTenant(tenantKey: string) {
  const tenant = await resolveTenantByKey(tenantKey);
  if (!tenant) {
    notFound();
  }
  return tenant;
}
