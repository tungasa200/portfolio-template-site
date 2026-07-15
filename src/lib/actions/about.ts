"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import type { ActionFormState } from "@/lib/actions/site-settings";

export async function updateAboutContent(
  _prevState: ActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const { tenantId } = await getCurrentTenantContext();
  const content = String(formData.get("content") ?? "");

  const db = forTenant(tenantId);
  await db.aboutPage.update({ where: { tenantId }, data: { content } });

  revalidatePath("/admin", "layout");
  return { status: "success", message: "저장되었습니다" };
}

// About has no `name` field of its own (prisma/schema.prisma) — its display
// name is NavItem.label for the tenant's ABOUT-kind nav entry, same
// single-source-of-truth principle as Board.name for BOARD nav entries.
export async function renameAboutPage(navItemId: string, name: string): Promise<ActionFormState> {
  const { tenantId } = await getCurrentTenantContext();
  const trimmed = name.trim();
  if (!trimmed) {
    return { status: "error", message: "이름을 입력해주세요." };
  }

  const db = forTenant(tenantId);
  await db.navItem.update({ where: { id: navItemId }, data: { label: trimmed } });

  revalidatePath("/admin", "layout");
  return { status: "success", message: "이름이 바뀌었어요" };
}
