import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant/resolve-tenant";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { SectionHeader } from "@/components/site/SectionHeader";
import { DetailTabs } from "@/components/site/DetailTabs";

const TABS = [
  { key: "index", label: "INDEX" },
  { key: "grid", label: "GRID VIEW" },
  { key: "fullscreen", label: "FULLSCREEN VIEW" },
];
const VALID_VIEWS = new Set(TABS.map((t) => t.key));

export default async function WorkDetailPage({
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

  const exhibition = await db.exhibition.findFirst({
    where: { slug, isPublished: true },
    include: { photos: { orderBy: { order: "asc" } } },
  });

  if (!exhibition) {
    notFound();
  }

  const activeView = view && VALID_VIEWS.has(view) ? view : "index";
  const activePhotoIndex = Math.min(
    Math.max(Number(photo) || 0, 0),
    Math.max(exhibition.photos.length - 1, 0)
  );

  const gridPhotos = exhibition.photos.map((p, i) => ({
    id: p.id,
    label: p.label ?? `PLATE ${String(i + 1).padStart(2, "0")}`,
  }));

  return (
    <section className="box-border min-h-[calc(100vh-65px)] px-16 py-10">
      <SectionHeader title={exhibition.name} marginBottom="mb-8" />
      <DetailTabs
        tabs={TABS}
        activeView={activeView}
        gridPhotos={gridPhotos}
        activePhotoIndex={activePhotoIndex}
        indexSlot={
          <div className="grid grid-cols-[1fr_1.2fr] gap-16 animate-site-intro-fade" style={{ animationDelay: "0.55s" }}>
            <div className="max-w-[520px] text-[17px] leading-[1.75] text-site-ink-body">
              <p className="m-0">{exhibition.description}</p>
            </div>
            <div className="relative flex aspect-[4/3] items-end overflow-hidden border border-site-ink bg-site-paper site-placeholder-pattern">
              <div className="relative px-[18px] py-4">
                <span className="border border-site-ink bg-site-paper px-2 py-1 font-site-mono text-[11px] tracking-wide text-site-ink-soft">
                  COVER PHOTO
                </span>
              </div>
            </div>
          </div>
        }
      />
    </section>
  );
}
