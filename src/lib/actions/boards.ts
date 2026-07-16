"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { revalidateTenantSite } from "@/lib/tenant/site-cache";
import type { ActionFormState } from "@/lib/actions/site-settings";

// Only `name` is mutable here — Board.seq/kind are operator/seed-provisioned
// (see docs/roadmap.md#board-redesign — "Not in scope: creating/deleting a
// board, or changing a board's kind or seq"). There is deliberately no
// createBoard/deleteBoard action in this file.
export async function renameBoard(boardId: string, name: string): Promise<ActionFormState> {
  const { tenantId } = await getCurrentTenantContext();
  const trimmed = name.trim();
  if (!trimmed) {
    return { status: "error", message: "이름을 입력해주세요." };
  }

  const db = forTenant(tenantId);
  await db.board.update({ where: { id: boardId }, data: { name: trimmed } });

  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
  return { status: "success", message: "이름이 바뀌었어요" };
}
