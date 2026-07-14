import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant/resolve-tenant";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { SectionHeader } from "@/components/site/SectionHeader";
import { DetailTabs } from "@/components/site/DetailTabs";

const TABS = [
  { key: "grid", label: "GRID VIEW" },
  { key: "fullscreen", label: "FULLSCREEN VIEW" },
];

export default async function PhotoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string; slug: string }>;
  searchParams: Promise<{ view?: string; photo?: string }>;
}) {
  const { tenant: tenantKey, slug } = await params;
  const { view, photo } = await searchParams;
  const tenant = await requireTenant(tenantKey);
  const db = forTenant(tenant.id);

  const project = await db.project.findFirst({
    where: { slug, isPublished: true },
    include: { photos: { orderBy: { order: "asc" } } },
  });

  if (!project) {
    notFound();
  }

  const activeView = view === "fullscreen" ? "fullscreen" : "grid";
  const activePhotoIndex = Math.min(
    Math.max(Number(photo) || 0, 0),
    Math.max(project.photos.length - 1, 0)
  );

  const gridPhotos = project.photos.map((p, i) => ({
    id: p.id,
    label: p.label ?? `SHOT ${String(i + 1).padStart(2, "0")}`,
  }));

  return (
    <section className="box-border min-h-[calc(100vh-65px)] px-16 py-10">
      <SectionHeader title={project.name} marginBottom="mb-8" />
      <DetailTabs
        tabs={TABS}
        activeView={activeView}
        gridPhotos={gridPhotos}
        activePhotoIndex={activePhotoIndex}
      />
    </section>
  );
}
