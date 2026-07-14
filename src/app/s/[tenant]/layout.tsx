import type { ReactNode } from "react";
import { requireTenant } from "@/lib/tenant/resolve-tenant";

// Reached via proxy.ts rewriting {slug}.{ROOT_DOMAIN}/* and custom domains
// to /s/{tenant}/*. This layout is the single point that resolves the
// tenant for every public-site page underneath it.
export default async function TenantSiteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantKey } = await params;
  await requireTenant(tenantKey);

  return children;
}
