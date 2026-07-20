import { notFound } from "next/navigation";
import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { getAdminBasePath } from "@/lib/auth/admin-base-path";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { cacheForTenant } from "@/lib/tenant/site-cache";
import { resolveDisplayUrl } from "@/lib/storage/r2";
import { formatBoardDate } from "@/lib/site/format-date";
import { BoardRenameHeading } from "@/components/admin/BoardRenameHeading";
import { BoardItemGrid } from "@/components/admin/BoardItemGrid";

const KIND_LABEL: Record<string, string> = {
  GALLERY_MULTI: "프로젝트 아카이브",
  GALLERY_SINGLE: "포토 갤러리",
};

export default async function BoardListPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  const { tenantId } = await getCurrentTenantContext();
  const adminBasePath = await getAdminBasePath();

  const board = await cacheForTenant(["admin-board", boardId], tenantId, () =>
    forTenant(tenantId).board.findFirst({
      where: { id: boardId },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: { photos: { where: { isPrimary: true }, take: 1 } },
        },
      },
    })
  );
  if (!board) {
    notFound();
  }

  const items = board.items.map((item) => ({
    id: item.id,
    name: item.name,
    dateLabel: formatBoardDate(item.dateValue),
    isPublished: item.isPublished,
    thumbnailUrl: item.photos[0] ? resolveDisplayUrl(item.photos[0].r2Key, item.photos[0].thumbR2Key) : null,
  }));

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <BoardRenameHeading boardId={board.id} seq={board.seq} name={board.name} kindLabel={KIND_LABEL[board.kind]} />
      </div>
      <BoardItemGrid boardId={board.id} kind={board.kind} items={items} adminBasePath={adminBasePath} />
    </div>
  );
}
