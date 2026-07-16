"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { forTenant } from "@/lib/db/tenant-scoped-client";

// Mirrors design/admin-mockup.html's selectMessage: opening a NEW message
// marks it READ; already-READ/ARCHIVED messages are left alone.
export async function markMessageRead(id: string): Promise<void> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const message = await db.contactSubmission.findUnique({ where: { id } });
  if (!message || message.status !== "NEW") return;
  await db.contactSubmission.update({ where: { id }, data: { status: "READ" } });
  revalidatePath("/admin", "layout");
}
