"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { revalidateTenantSite } from "@/lib/tenant/site-cache";
import { deleteR2Object } from "@/lib/storage/r2";

export interface UploadedPhotoInput {
  r2Key: string;
  thumbR2Key: string;
  width: number;
  height: number;
}

// Called after the browser has already PUT both the original and its
// thumbnail directly to R2 via presigned URLs from POST
// /api/admin/upload-url — this action only persists the resulting rows.
// Enforces each board kind's photo cap (see prisma/schema.prisma's
// BoardKind comment) here, not just in the client UI, since the client cap
// is a UX nicety, not a security boundary.
//
// Persists a whole batch of already-uploaded photos in one call — used by
// PhotoManager when multiple files are picked at once. Uploading N files
// used to mean N sequential (upload → addBoardItemPhoto) round trips; now
// the uploads run in parallel and land here as one batch. This also avoids
// a real race condition a per-file loop would hit: if each upload
// independently called addBoardItemPhoto, two calls in flight at once could
// both read the same `photos.length` and both compute `order: 0,
// isPrimary: true`. Reading the starting count once and computing every
// row's order/isPrimary locally avoids that.
export async function addBoardItemPhotos(
  boardItemId: string,
  uploads: UploadedPhotoInput[]
): Promise<{ status: "success"; photoIds: string[] } | { status: "error"; message: string }> {
  if (uploads.length === 0) return { status: "success", photoIds: [] };

  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);

  const item = await db.boardItem.findUnique({
    where: { id: boardItemId },
    include: { board: true, photos: true },
  });
  if (!item) {
    await Promise.all(uploads.flatMap((u) => [deleteR2Object(u.r2Key), deleteR2Object(u.thumbR2Key)]));
    return { status: "error", message: "항목을 찾을 수 없어요." };
  }

  const max = item.board.kind === "GALLERY_SINGLE" ? 1 : null;
  if (max !== null && item.photos.length + uploads.length > max) {
    await Promise.all(uploads.flatMap((u) => [deleteR2Object(u.r2Key), deleteR2Object(u.thumbR2Key)]));
    return { status: "error", message: "이 게시판은 사진을 1장만 추가할 수 있어요" };
  }

  const baseOrder = item.photos.length;
  const photos = await Promise.all(
    uploads.map((upload, index) =>
      db.boardItemPhoto.create({
        data: {
          tenantId,
          boardItemId,
          r2Key: upload.r2Key,
          thumbR2Key: upload.thumbR2Key,
          width: upload.width,
          height: upload.height,
          order: baseOrder + index,
          isPrimary: baseOrder + index === 0,
        },
      })
    )
  );

  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
  return { status: "success", photoIds: photos.map((p) => p.id) };
}

// Re-crop only — the original is untouched, just the derived thumbnail
// (see ThumbnailCropModal). Deletes the old thumbnail object once the new
// one's key is persisted.
export async function updateBoardItemPhotoThumbnail(photoId: string, thumbR2Key: string): Promise<void> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const previous = await db.boardItemPhoto.findUnique({ where: { id: photoId }, select: { thumbR2Key: true } });
  await db.boardItemPhoto.update({ where: { id: photoId }, data: { thumbR2Key } });
  if (previous?.thumbR2Key) await deleteR2Object(previous.thumbR2Key);

  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
}

export async function removeBoardItemPhoto(photoId: string): Promise<void> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const photo = await db.boardItemPhoto.delete({ where: { id: photoId } });
  await deleteR2Object(photo.r2Key);
  if (photo.thumbR2Key) await deleteR2Object(photo.thumbR2Key);

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
