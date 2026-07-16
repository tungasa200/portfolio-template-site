"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { tenantCacheTag } from "@/lib/tenant/site-cache";
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

  const count = await db.boardItem.count({ where: { boardId } });
  const slug = isMulti ? await uniqueSlug(db, boardId, slugify(name)) : null;

  const item = await db.boardItem.create({
    data: {
      tenantId,
      boardId,
      name,
      slug,
      dateValue,
      order: count,
      isPublished,
      indexEnabled,
      indexContent,
    },
  });

  revalidatePath("/admin", "layout");
  updateTag(tenantCacheTag(tenantId));
  // Browser-facing — the admin.{ROOT_DOMAIN} subdomain's proxy.ts rewrite
  // already prepends /admin invisibly, so this must NOT include it (unlike
  // the revalidatePath calls above, which key off Next's real file-system
  // route path, not the browser-visible one). See docs/architecture.md's
  // routing table.
  redirect(`/board/${boardId}/${item.id}`);
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

  await db.boardItem.update({
    where: { id: itemId },
    // No `slug` key here — see this file's top-of-function comment.
    data: { name, dateValue, isPublished, indexEnabled, indexContent },
  });

  revalidatePath("/admin", "layout");
  updateTag(tenantCacheTag(tenantId));
  return { status: "success", message: `"${name}" 저장되었습니다` };
}

export async function deleteBoardItem(itemId: string, boardId: string): Promise<void> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const photos = await db.boardItemPhoto.findMany({ where: { boardItemId: itemId } });
  await db.boardItem.delete({ where: { id: itemId } }); // cascades BoardItemPhoto rows
  await Promise.all(photos.map((p) => deleteR2Object(p.r2Key)));

  revalidatePath("/admin", "layout");
  updateTag(tenantCacheTag(tenantId));
  redirect(`/board/${boardId}`); // browser-facing, see createBoardItem's comment above
}

export async function toggleBoardItemPublished(itemId: string): Promise<void> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const item = await db.boardItem.findUnique({ where: { id: itemId } });
  if (!item) return;
  await db.boardItem.update({ where: { id: itemId }, data: { isPublished: !item.isPublished } });
  revalidatePath("/admin", "layout");
  updateTag(tenantCacheTag(tenantId));
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
  updateTag(tenantCacheTag(tenantId));
}
