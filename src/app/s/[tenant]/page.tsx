import { requireTenant } from "@/lib/tenant/resolve-tenant";

// Phase 1 tenant-pipeline proof: confirms hostname -> tenant resolution
// works end-to-end. Replaced with the ported design system in Phase 2/3.
export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantKey } = await params;
  const tenant = await requireTenant(tenantKey);

  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>{tenant.siteSettings?.siteName ?? tenant.slug}</h1>
      <p>Tenant pipeline OK — resolved tenant id: {tenant.id}</p>
    </main>
  );
}
