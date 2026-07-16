import { notFound } from "next/navigation";
import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { getAdminBasePath } from "@/lib/auth/admin-base-path";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { r2PublicUrl } from "@/lib/storage/r2";
import { BoardItemEditor } from "@/components/admin/BoardItemEditor";

export default async function BoardItemEditorPage({
  params,
}: {
  params: Promise<{ boardId: string; itemId: string }>;
}) {
  const { boardId, itemId } = await params;
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const adminBasePath = await getAdminBasePath();

  const board = await db.board.findFirst({ where: { id: boardId } });
  if (!board) {
    notFound();
  }

  if (itemId === "new") {
    return (
      <BoardItemEditor boardId={board.id} boardName={board.name} kind={board.kind} item={null} adminBasePath={adminBasePath} />
    );
  }

  const item = await db.boardItem.findFirst({
    where: { id: itemId, boardId },
    include: { photos: { orderBy: { order: "asc" } } },
  });
  if (!item) {
    notFound();
  }

  return (
    <BoardItemEditor
      boardId={board.id}
      boardName={board.name}
      kind={board.kind}
      adminBasePath={adminBasePath}
      item={{
        id: item.id,
        name: item.name,
        dateValue: item.dateValue,
        isPublished: item.isPublished,
        indexEnabled: item.indexEnabled,
        indexContent: item.indexContent,
        photos: item.photos.map((p) => ({ id: p.id, url: r2PublicUrl(p.r2Key), isPrimary: p.isPrimary })),
      }}
    />
  );
}
