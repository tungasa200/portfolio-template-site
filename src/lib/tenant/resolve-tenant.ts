import "server-only";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { cacheForTenant } from "@/lib/tenant/site-cache";

// tenantKey -> {id, slug} is looked up on every request that hits this
// domain/slug. There's no rename-tenant admin action, so slug/customDomain
// are effectively immutable — a long time-based revalidate is enough, no
// tag wiring needed.
const resolveTenantIdentity = unstable_cache(
  async (tenantKey: string) => {
    return prisma.tenant.findFirst({
      where: { OR: [{ slug: tenantKey }, { customDomain: tenantKey }] },
      select: { id: true, slug: true },
    });
  },
  ["tenant-identity"],
  { revalidate: 60 * 60 * 24 }
);

// This is the one sanctioned place outside lib/db/ that queries the
// unscoped (base) Prisma client directly: resolving *which* tenant a
// request belongs to is inherently a cross-tenant lookup on the Tenant
// table itself, which has no tenantId column to scope by. Everything
// downstream of this must go through forTenant(tenant.id) — including
// siteSettings/navItems/socialLinks below, which is why they're a *second*
// query through the scoped client rather than an `include` on the first
// one. Bundling them into the same unscoped query looks convenient but is
// wrong: RLS silently returns zero rows for tenant-scoped tables when
// app.tenant_id was never set (see prisma/security/rls.sql), and
// forTenant() is the only thing that sets it.
export async function resolveTenantByKey(tenantKey: string) {
  const identity = await resolveTenantIdentity(tenantKey);
  if (!identity) {
    return null;
  }

  const { siteSettings, navItems, socialLinks } = await cacheForTenant(
    ["tenant-site-data"],
    identity.id,
    async () => {
      const db = forTenant(identity.id);
      const [siteSettings, navItems, socialLinks] = await Promise.all([
        db.siteSettings.findUnique({ where: { tenantId: identity.id } }),
        db.navItem.findMany({
          where: { isVisible: true },
          orderBy: { order: "asc" },
          include: { targetBoard: { select: { seq: true, name: true } } },
        }),
        db.socialLink.findMany({ orderBy: { order: "asc" } }),
      ]);
      return { siteSettings, navItems, socialLinks };
    }
  );

  return { ...identity, siteSettings, navItems, socialLinks };
}

export async function requireTenant(tenantKey: string) {
  const tenant = await resolveTenantByKey(tenantKey);
  if (!tenant) {
    notFound();
  }
  return tenant;
}
