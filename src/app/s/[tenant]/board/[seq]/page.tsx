import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant/resolve-tenant";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { cacheForTenant } from "@/lib/tenant/site-cache";
import { r2PublicUrl } from "@/lib/storage/r2";
import { SectionHeader } from "@/components/site/SectionHeader";
import { PhotoGrid } from "@/components/site/PhotoGrid";
import { formatBoardDate } from "@/lib/site/format-date";

// [seq] is its own dynamic segment nested under [tenant] — needs its own
// generateStaticParams (same reasoning as layout.tsx) for this route to be
// ISR-cacheable rather than SSR'd on every request.
export async function generateStaticParams() {
  return [];
}

// Replaces the old fixed /photo, /work routes -- one template for every
// board regardless of kind or how many a tenant has (see docs/roadmap.md's
// board redesign notes). `seq` is a stable per-tenant sequence, not a
// semantic slug; board *names* are editable, paths are not.
export default async function BoardPage({
  params,
}: {
  params: Promise<{ tenant: string; seq: string }>;
}) {
  const { tenant: tenantKey, seq } = await params;
  const seqNum = Number(seq);
  // Validate before hitting Prisma -- an unvalidated string into an Int
  // where-clause throws a 500, not a clean 404.
  if (!Number.isInteger(seqNum) || seqNum <= 0) {
    notFound();
  }

  const tenant = await requireTenant(tenantKey);

  const board = await cacheForTenant(["board", String(seqNum)], tenant.id, () =>
    forTenant(tenant.id).board.findFirst({
      where: { seq: seqNum, isPublished: true },
      include: {
        items: {
          where: { isPublished: true },
          orderBy: { order: "asc" },
          include: { photos: { where: { isPrimary: true }, take: 1 } },
        },
      },
    })
  );
  if (!board) {
    notFound();
  }

  return (
    <section className="box-border min-h-[calc(100vh-65px)] px-16 py-10">
      <SectionHeader title={board.name} />
      <PhotoGrid
        kind={board.kind}
        items={board.items.map((item) => ({
          id: item.id,
          href:
            board.kind === "GALLERY_MULTI" && item.slug
              ? `/board/${board.seq}/${item.slug}`
              : undefined,
          title: item.name,
          meta: formatBoardDate(item.dateValue),
          imageUrl: item.photos[0] ? r2PublicUrl(item.photos[0].r2Key) : null,
        }))}
      />
    </section>
  );
}
