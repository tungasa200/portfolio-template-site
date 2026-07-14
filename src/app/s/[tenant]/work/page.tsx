import { requireTenant } from "@/lib/tenant/resolve-tenant";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { SectionHeader } from "@/components/site/SectionHeader";
import { PhotoGrid } from "@/components/site/PhotoGrid";

export default async function WorkListPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantKey } = await params;
  const tenant = await requireTenant(tenantKey);
  const db = forTenant(tenant.id);

  const exhibitions = await db.exhibition.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
  });

  return (
    <section className="box-border min-h-[calc(100vh-65px)] px-16 py-10">
      <SectionHeader title="WORK" />
      <PhotoGrid
        items={exhibitions.map((exhibition) => ({
          id: exhibition.id,
          href: `/work/${exhibition.slug}`,
          tag: exhibition.venue,
          title: exhibition.name,
          meta: exhibition.period,
        }))}
      />
    </section>
  );
}
