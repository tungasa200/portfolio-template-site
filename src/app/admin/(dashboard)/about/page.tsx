import { notFound } from "next/navigation";
import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { cacheForTenant } from "@/lib/tenant/site-cache";
import { AboutEditor } from "@/components/admin/AboutEditor";

export default async function AdminAboutPage() {
  const { tenantId } = await getCurrentTenantContext();

  const [aboutPage, navItem] = await cacheForTenant(["admin-about"], tenantId, () => {
    const db = forTenant(tenantId);
    return Promise.all([
      db.aboutPage.findUnique({ where: { tenantId } }),
      db.navItem.findFirst({ where: { targetKind: "ABOUT" } }),
    ]);
  });
  if (!aboutPage || !navItem) {
    notFound();
  }

  return <AboutEditor navItemId={navItem.id} initialName={navItem.label} initialContent={aboutPage.content} />;
}
