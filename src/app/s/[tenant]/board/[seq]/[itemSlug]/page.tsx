import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant/resolve-tenant";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { SectionHeader } from "@/components/site/SectionHeader";
import { DetailTabs } from "@/components/site/DetailTabs";
import type { TabItem } from "@/components/site/Tabs";

// Only reachable for GALLERY_MULTI boards — GALLERY_SINGLE items have no
// detail page (see docs/roadmap.md). Nothing links here for a
// GALLERY_SINGLE board's items, but the route itself still exists (Next.js
// can't conditionally omit a nested segment based on the parent's data), so
// it explicitly 404s if the board isn't GALLERY_MULTI rather than rendering
// something nonsensical for a directly-typed URL.
export default async function BoardItemDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string; seq: string; itemSlug: string }>;
  searchParams: Promise<{ view?: string; photo?: string }>;
}) {
  const { tenant: tenantKey, seq, itemSlug } = await params;
  const { view, photo } = await searchParams;
  const seqNum = Number(seq);
  if (!Number.isInteger(seqNum) || seqNum <= 0) {
    notFound();
  }

  const tenant = await requireTenant(tenantKey);
  const db = forTenant(tenant.id);

  const board = await db.board.findFirst({ where: { seq: seqNum, isPublished: true } });
  if (!board || board.kind !== "GALLERY_MULTI") {
    notFound();
  }

  const item = await db.boardItem.findFirst({
    where: { boardId: board.id, slug: itemSlug, isPublished: true },
    include: { photos: { orderBy: { order: "asc" } } },
  });
  if (!item) {
    notFound();
  }

  // Tabs are per-item now, not a fixed per-page-type constant — INDEX only
  // appears when this item actually has one (docs/progress.md).
  const tabs: TabItem[] = [
    ...(item.indexEnabled ? [{ key: "index", label: "INDEX" }] : []),
    { key: "grid", label: "GRID VIEW" },
    { key: "fullscreen", label: "FULLSCREEN VIEW" },
  ];
  const validViews = new Set(tabs.map((t) => t.key));
  const defaultView = item.indexEnabled ? "index" : "grid";
  const activeView = view && validViews.has(view) ? view : defaultView;

  const activePhotoIndex = Math.min(
    Math.max(Number(photo) || 0, 0),
    Math.max(item.photos.length - 1, 0)
  );
  const gridPhotos = item.photos.map((_, i) => ({
    id: item.photos[i].id,
    label: `PHOTO ${String(i + 1).padStart(2, "0")}`,
  }));

  return (
    <section className="box-border min-h-[calc(100vh-65px)] px-16 py-10">
      <SectionHeader title={item.name} marginBottom="mb-8" />
      <DetailTabs
        tabs={tabs}
        activeView={activeView}
        gridPhotos={gridPhotos}
        activePhotoIndex={activePhotoIndex}
        indexContent={item.indexEnabled ? item.indexContent : null}
      />
    </section>
  );
}
