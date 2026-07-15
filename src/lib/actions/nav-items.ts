"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { forTenant } from "@/lib/db/tenant-scoped-client";

// Admin mutations for NavItem — read-only resolvers for the public site live
// in src/lib/site/nav-items.ts (resolveNavHref/resolveNavLabel), a separate
// concern.

export async function toggleNavItemVisibility(navItemId: string): Promise<void> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const item = await db.navItem.findUnique({ where: { id: navItemId } });
  if (!item) return;
  await db.navItem.update({ where: { id: navItemId }, data: { isVisible: !item.isVisible } });
  revalidatePath("/admin", "layout");
}

// Same navItemsData powers both Settings' reorder list and Home's
// page-visibility list — see design/admin-mockup.html's renderHomeVisibility
// comment. Persisting order here keeps them in sync (both just re-render
// from the same NavItem rows).
export async function reorderNavItems(orderedIds: string[]): Promise<void> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  await Promise.all(
    orderedIds.map((id, index) => db.navItem.update({ where: { id }, data: { order: index } }))
  );
  revalidatePath("/admin", "layout");
}
