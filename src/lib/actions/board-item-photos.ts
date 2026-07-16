"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { revalidateTenantSite } from "@/lib/tenant/site-cache";
import { deleteR2Object } from "@/lib/storage/r2";

export interface AddPhotoResult {
  status: "success" | "error";
  message?: string;
  photoId?: string;
}

// Called after the browser has already PUT the file directly to R2 via the
// presigned URL from POST /api/admin/upload-url — this action only persists
// the resulting row. Enforces each board kind's photo cap (see
// prisma/schema.prisma's BoardKind comment) here, not just in the client UI,
// since the client cap is a UX nicety, not a security boundary.
export async function addBoardItemPhoto(
  boardItemId: string,
  r2Key: string,
  width: number,
  height: number
): Promise<AddPhotoResult> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);

  const item = await db.boardItem.findUnique({
    where: { id: boardItemId },
    include: { board: true, photos: true },
  });
  if (!item) {
    await deleteR2Object(r2Key);
    return { status: "error", message: "항목을 찾을 수 없어요." };
  }

  const max = item.board.kind === "GALLERY_SINGLE" ? 1 : null;
  if (max !== null && item.photos.length >= max) {
    await deleteR2Object(r2Key);
    return { status: "error", message: "이 게시판은 사진을 1장만 추가할 수 있어요" };
  }

  const photo = await db.boardItemPhoto.create({
    data: {
      tenantId,
      boardItemId,
      r2Key,
      width,
      height,
      order: item.photos.length,
      isPrimary: item.photos.length === 0,
    },
  });

  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
  return { status: "success", photoId: photo.id };
}

export async function removeBoardItemPhoto(photoId: string): Promise<void> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const photo = await db.boardItemPhoto.delete({ where: { id: photoId } });
  await deleteR2Object(photo.r2Key);

  // If the removed photo was primary, promote the new first photo (by
  // order) so an item is never left without a grid thumbnail as long as it
  // has at least one photo — mirrors what a human editor would do next.
  const remaining = await db.boardItemPhoto.findMany({
    where: { boardItemId: photo.boardItemId },
    orderBy: { order: "asc" },
  });
  if (photo.isPrimary && remaining.length > 0 && !remaining.some((p) => p.isPrimary)) {
    await db.boardItemPhoto.update({ where: { id: remaining[0].id }, data: { isPrimary: true } });
  }

  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
}

export async function setPrimaryBoardItemPhoto(boardItemId: string, photoId: string): Promise<void> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const photos = await db.boardItemPhoto.findMany({ where: { boardItemId } });
  await Promise.all(
    photos.map((p) =>
      db.boardItemPhoto.update({ where: { id: p.id }, data: { isPrimary: p.id === photoId } })
    )
  );
  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
}

export async function reorderBoardItemPhotos(boardItemId: string, orderedIds: string[]): Promise<void> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  await Promise.all(
    orderedIds.map((id, index) =>
      db.boardItemPhoto.update({ where: { id, boardItemId }, data: { order: index } })
    )
  );
  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
}
