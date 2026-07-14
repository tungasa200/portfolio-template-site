import { requireTenant } from "@/lib/tenant/resolve-tenant";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { SectionHeader } from "@/components/site/SectionHeader";
import { PhotoGrid } from "@/components/site/PhotoGrid";

export default async function PhotoListPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantKey } = await params;
  const tenant = await requireTenant(tenantKey);
  const db = forTenant(tenant.id);

  const projects = await db.project.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
  });

  return (
    <section className="box-border min-h-[calc(100vh-65px)] px-16 py-10">
      <SectionHeader title="PHOTO" />
      <PhotoGrid
        items={projects.map((project) => ({
          id: project.id,
          href: `/photo/${project.slug}`,
          tag: project.category,
          title: project.name,
          meta: project.period,
        }))}
      />
    </section>
  );
}
