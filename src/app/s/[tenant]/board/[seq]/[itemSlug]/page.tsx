import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant/resolve-tenant";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { cacheForTenant } from "@/lib/tenant/site-cache";
import { r2PublicUrl, resolveDisplayUrl } from "@/lib/storage/r2";
import { SectionHeader } from "@/components/site/SectionHeader";
import { DetailTabs } from "@/components/site/DetailTabs";
import type { TabItem } from "@/components/site/Tabs";

// [itemSlug] is its own dynamic segment nested under [tenant]/[seq] — needs
// its own generateStaticParams for this route to be ISR-cacheable.
export async function generateStaticParams() {
  return [];
}

// Only reachable for GALLERY_MULTI boards — GALLERY_SINGLE items have no
// detail page (see docs/roadmap.md). Nothing links here for a
// GALLERY_SINGLE board's items, but the route itself still exists (Next.js
// can't conditionally omit a nested segment based on the parent's data), so
// it explicitly 404s if the board isn't GALLERY_MULTI rather than rendering
// something nonsensical for a directly-typed URL.
//
// Deliberately does NOT take a `searchParams` prop — reading it here would
// force this whole route to server-render dynamically on every visit and
// every tab/photo click. DetailTabs reads ?view=/&photo= client-side via
// useSearchParams() instead, so this page stays static/ISR-cacheable just
// like the rest of the tenant site.
export default async function BoardItemDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; seq: string; itemSlug: string }>;
}) {
  const { tenant: tenantKey, seq, itemSlug } = await params;
  const seqNum = Number(seq);
  if (!Number.isInteger(seqNum) || seqNum <= 0) {
    notFound();
  }

  const tenant = await requireTenant(tenantKey);

  const board = await cacheForTenant(["board-kind", String(seqNum)], tenant.id, () =>
    forTenant(tenant.id).board.findFirst({ where: { seq: seqNum, isPublished: true } })
  );
  if (!board || board.kind !== "GALLERY_MULTI") {
    notFound();
  }

  const item = await cacheForTenant(["board-item", String(seqNum), itemSlug], tenant.id, () =>
    forTenant(tenant.id).boardItem.findFirst({
      where: { boardId: board.id, slug: itemSlug, isPublished: true },
      include: { photos: { orderBy: { order: "asc" } } },
    })
  );
  if (!item) {
    notFound();
  }

  // Tabs are per-item now, not a fixed per-page-type constant — INDEX only
  // appears when this item actually has one (docs/progress.md).
  const tabs: TabItem[] = [
    ...(item.indexEnabled ? [{ key: "index", label: "INDEX" }] : []),
    { key: "grid", label: "GRID VIEW" },
    { key: "fullscreen", label: "SLIDE VIEW" },
  ];
  const defaultView = item.indexEnabled ? "index" : "grid";

  const gridPhotos = item.photos.map((p, i) => ({
    id: p.id,
    label: `PHOTO ${String(i + 1).padStart(2, "0")}`,
    // Original — used only for the SLIDE VIEW's large active image.
    imageUrl: r2PublicUrl(p.r2Key),
    // Web-optimized derived copy — used by GRID VIEW tiles and the SLIDE
    // VIEW filmstrip, which never need full quality.
    thumbUrl: resolveDisplayUrl(p.r2Key, p.thumbR2Key),
    width: p.width,
    height: p.height,
  }));
  // INDEX cover image is its own opt-in field (BoardItem.indexImageEnabled/
  // indexImageKey), independent of the body/GRID VIEW photos above. Uses
  // the original (not the pre-cropped-to-4:3 thumbnail) so IndexTab can
  // render it at its true aspect ratio.
  const indexCoverPhotoUrl =
    item.indexImageEnabled && item.indexImageKey ? r2PublicUrl(item.indexImageKey) : null;

  return (
    <section className="box-border flex h-full max-h-full flex-col overflow-hidden px-16 py-10">
      <SectionHeader title={item.name} marginBottom="mb-8" />
      <DetailTabs
        tabs={tabs}
        defaultView={defaultView}
        gridPhotos={gridPhotos}
        indexContent={item.indexEnabled ? item.indexContent : null}
        indexCoverPhotoUrl={indexCoverPhotoUrl}
        indexCoverPhotoWidth={item.indexImageWidth}
        indexCoverPhotoHeight={item.indexImageHeight}
        indexImageRatio={item.indexImageRatio}
      />
    </section>
  );
}
