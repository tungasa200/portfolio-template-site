"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { getAdminBasePath } from "@/lib/auth/admin-base-path";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { revalidateTenantSite } from "@/lib/tenant/site-cache";
import { deleteR2Object } from "@/lib/storage/r2";
import type { ActionFormState } from "@/lib/actions/site-settings";

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return slug || "untitled";
}

// New items should appear first in both the admin list and the public site
// (both ordered by `order` ascending) instead of tacked on the end, so give
// them an order below the current minimum rather than `count` (the old
// behavior, which put new items last).
async function nextOrderForPrepend(db: ReturnType<typeof forTenant>, boardId: string): Promise<number> {
  const first = await db.boardItem.findFirst({ where: { boardId }, orderBy: { order: "asc" } });
  return first ? first.order - 1 : 0;
}

async function uniqueSlug(
  db: ReturnType<typeof forTenant>,
  boardId: string,
  base: string
): Promise<string> {
  let candidate = base;
  let n = 2;
  // BoardItem.slug is unique per (tenantId, boardId, slug) — collisions are
  // rare (two items with the same name on one board) but must still resolve
  // deterministically rather than throw a raw Prisma unique-constraint error.
  while (await db.boardItem.findFirst({ where: { boardId, slug: candidate } })) {
    candidate = `${base}-${n++}`;
  }
  return candidate;
}

// Create/update share validation but intentionally never share the slug
// line — see docs/architecture.md#data-model: slug is assigned once on
// create and must never be re-derived on update, or a renamed item silently
// breaks its own bookmarked/shared detail URL.
export async function createBoardItem(
  _prevState: ActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const { tenantId } = await getCurrentTenantContext();
  const boardId = String(formData.get("boardId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { status: "error", message: "이름을 입력해주세요." };
  }

  const db = forTenant(tenantId);
  const board = await db.board.findUnique({ where: { id: boardId } });
  if (!board) {
    return { status: "error", message: "게시판을 찾을 수 없어요." };
  }
  const isMulti = board.kind === "GALLERY_MULTI";

  const dateValue = String(formData.get("dateValue") ?? "").trim() || null;
  const isPublished = formData.get("isPublished") === "true";
  const indexEnabled = isMulti && formData.get("indexEnabled") === "true";
  const indexContent = isMulti ? String(formData.get("indexContent") ?? "") : null;
  const indexImageEnabled = isMulti && formData.get("indexImageEnabled") === "true";

  const order = await nextOrderForPrepend(db, boardId);
  const slug = isMulti ? await uniqueSlug(db, boardId, slugify(name)) : null;

  const item = await db.boardItem.create({
    data: {
      tenantId,
      boardId,
      name,
      slug,
      dateValue,
      order,
      isPublished,
      indexEnabled,
      indexContent,
      indexImageEnabled,
    },
  });

  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
  // Browser-facing — varies by access mode, see src/lib/auth/admin-base-path.ts
  // (unlike the revalidatePath calls above, which key off Next's real
  // file-system route path, not the browser-visible one).
  redirect(`${await getAdminBasePath()}/board/${boardId}/${item.id}`);
}

// Lets the photo manager attach photos before the user has hit "저장하기" —
// BoardItemPhoto needs a real boardItemId to attach to, so the first photo
// pick silently creates the row (named from whatever's in the name field so
// far, defaulting to "새 항목") instead of forcing a save-first round trip.
// A normal save afterward goes through updateBoardItem, same as any
// pre-existing item.
export async function createDraftBoardItem(
  boardId: string,
  name: string
): Promise<{ id: string } | { error: string }> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const board = await db.board.findUnique({ where: { id: boardId } });
  if (!board) {
    return { error: "게시판을 찾을 수 없어요." };
  }
  const isMulti = board.kind === "GALLERY_MULTI";

  const trimmedName = name.trim() || "새 항목";
  const order = await nextOrderForPrepend(db, boardId);
  const slug = isMulti ? await uniqueSlug(db, boardId, slugify(trimmedName)) : null;

  const item = await db.boardItem.create({
    data: { tenantId, boardId, name: trimmedName, slug, order },
  });

  revalidatePath("/admin", "layout");
  return { id: item.id };
}

export async function updateBoardItem(
  _prevState: ActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const { tenantId } = await getCurrentTenantContext();
  const itemId = String(formData.get("itemId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { status: "error", message: "이름을 입력해주세요." };
  }

  const db = forTenant(tenantId);
  const item = await db.boardItem.findUnique({ where: { id: itemId }, include: { board: true } });
  if (!item) {
    return { status: "error", message: "항목을 찾을 수 없어요." };
  }
  const isMulti = item.board.kind === "GALLERY_MULTI";

  const dateValue = String(formData.get("dateValue") ?? "").trim() || null;
  const isPublished = formData.get("isPublished") === "true";
  const indexEnabled = isMulti && formData.get("indexEnabled") === "true";
  const indexContent = isMulti ? String(formData.get("indexContent") ?? "") : item.indexContent;
  const indexImageEnabled = isMulti ? formData.get("indexImageEnabled") === "true" : item.indexImageEnabled;

  await db.boardItem.update({
    where: { id: itemId },
    // No `slug` key here — see this file's top-of-function comment. Also no
    // `indexImageKey` — that's set by setBoardItemIndexImage/
    // removeBoardItemIndexImage, not this generic field save.
    data: { name, dateValue, isPublished, indexEnabled, indexContent, indexImageEnabled },
  });

  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
  return { status: "success", message: `"${name}" 저장되었습니다` };
}

export async function deleteBoardItem(itemId: string, boardId: string): Promise<void> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const [photos, item] = await Promise.all([
    db.boardItemPhoto.findMany({ where: { boardItemId: itemId } }),
    db.boardItem.findUnique({ where: { id: itemId }, select: { indexImageKey: true, indexImageThumbKey: true } }),
  ]);
  await db.boardItem.delete({ where: { id: itemId } }); // cascades BoardItemPhoto rows
  await Promise.all([
    ...photos.flatMap((p) => [deleteR2Object(p.r2Key), ...(p.thumbR2Key ? [deleteR2Object(p.thumbR2Key)] : [])]),
    item?.indexImageKey ? deleteR2Object(item.indexImageKey) : Promise.resolve(),
    item?.indexImageThumbKey ? deleteR2Object(item.indexImageThumbKey) : Promise.resolve(),
  ]);

  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
  redirect(`${await getAdminBasePath()}/board/${boardId}`); // browser-facing, see createBoardItem's comment above
}

// INDEX tab cover image — a single image independent of the item's regular
// `photos` (see prisma/schema.prisma's BoardItem.indexImageKey comment).
// Mirrors addBoardItemPhotos's contract (client already PUT both the
// original and its thumbnail to R2 via presigned URLs; this only
// persists/replaces the keys), but there's no BoardItemPhoto row and no
// ordering/primary concept — just one slot.
export async function setBoardItemIndexImage(
  itemId: string,
  r2Key: string,
  thumbR2Key: string
): Promise<{ status: "success" } | { status: "error"; message: string }> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const item = await db.boardItem.findUnique({
    where: { id: itemId },
    select: { indexImageKey: true, indexImageThumbKey: true },
  });
  if (!item) {
    await Promise.all([deleteR2Object(r2Key), deleteR2Object(thumbR2Key)]);
    return { status: "error", message: "항목을 찾을 수 없어요." };
  }

  await db.boardItem.update({ where: { id: itemId }, data: { indexImageKey: r2Key, indexImageThumbKey: thumbR2Key } });
  await Promise.all([
    item.indexImageKey ? deleteR2Object(item.indexImageKey) : Promise.resolve(),
    item.indexImageThumbKey ? deleteR2Object(item.indexImageThumbKey) : Promise.resolve(),
  ]);

  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
  return { status: "success" };
}

// Re-crop only — the original is untouched, just the derived thumbnail
// (see ThumbnailCropModal).
export async function updateBoardItemIndexImageThumbnail(itemId: string, thumbR2Key: string): Promise<void> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const item = await db.boardItem.findUnique({ where: { id: itemId }, select: { indexImageThumbKey: true } });
  await db.boardItem.update({ where: { id: itemId }, data: { indexImageThumbKey: thumbR2Key } });
  if (item?.indexImageThumbKey) await deleteR2Object(item.indexImageThumbKey);

  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
}

export async function removeBoardItemIndexImage(itemId: string): Promise<void> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const item = await db.boardItem.findUnique({
    where: { id: itemId },
    select: { indexImageKey: true, indexImageThumbKey: true },
  });
  if (!item?.indexImageKey) return;

  await db.boardItem.update({ where: { id: itemId }, data: { indexImageKey: null, indexImageThumbKey: null } });
  await Promise.all([
    deleteR2Object(item.indexImageKey),
    item.indexImageThumbKey ? deleteR2Object(item.indexImageThumbKey) : Promise.resolve(),
  ]);

  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
}

export async function toggleBoardItemPublished(itemId: string): Promise<void> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const item = await db.boardItem.findUnique({ where: { id: itemId } });
  if (!item) return;
  await db.boardItem.update({ where: { id: itemId }, data: { isPublished: !item.isPublished } });
  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
}

export async function reorderBoardItems(boardId: string, orderedIds: string[]): Promise<void> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  await Promise.all(
    orderedIds.map((id, index) =>
      db.boardItem.update({ where: { id, boardId }, data: { order: index } })
    )
  );
  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
}
