"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { revalidateTenantSite } from "@/lib/tenant/site-cache";
import type { ActionFormState } from "@/lib/actions/site-settings";

// Admin mutations for NavItem — read-only resolvers for the public site live
// in src/lib/site/nav-items.ts (resolveNavHref/resolveNavLabel), a separate
// concern.

// For BOARD nav entries, NavItem.label isn't the authoritative name —
// Board.name is (see resolveNavLabel in src/lib/site/nav-items.ts). Renaming
// a BOARD entry here would silently write a label the public site never
// reads, so it's rejected; callers must route BOARD renames to
// src/lib/actions/boards.ts's renameBoard instead.
export async function renameNavItem(navItemId: string, name: string): Promise<ActionFormState> {
  const { tenantId } = await getCurrentTenantContext();
  const trimmed = name.trim();
  if (!trimmed) {
    return { status: "error", message: "이름을 입력해주세요." };
  }

  const db = forTenant(tenantId);
  const item = await db.navItem.findUnique({ where: { id: navItemId } });
  if (!item) {
    return { status: "error", message: "메뉴를 찾을 수 없어요." };
  }
  if (item.targetKind === "BOARD") {
    return { status: "error", message: "게시판 이름은 게시판 화면에서 바꿔주세요." };
  }

  await db.navItem.update({ where: { id: navItemId }, data: { label: trimmed } });

  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
  return { status: "success", message: "이름이 바뀌었어요" };
}

export async function toggleNavItemVisibility(navItemId: string): Promise<void> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const item = await db.navItem.findUnique({ where: { id: navItemId } });
  if (!item) return;
  await db.navItem.update({ where: { id: navItemId }, data: { isVisible: !item.isVisible } });
  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
}

// Same navItemsData powers both Settings' reorder list and Home's
// page-visibility list — see design/admin-mockup.html's renderHomeVisibility
// comment. Persisting order here keeps them in sync (both just re-render
// from the same NavItem rows).
export async function reorderNavItems(orderedIds: string[]): Promise<void> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  await Promise.all(
    orderedIds.map((id, index) => db.navItem.update({ where: { id }, data: { order: index } }))
  );
  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
}
