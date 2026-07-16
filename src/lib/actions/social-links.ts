"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { revalidateTenantSite } from "@/lib/tenant/site-cache";
import type { ActionFormState } from "@/lib/actions/site-settings";

export async function createSocialLink(
  _prevState: ActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const { tenantId } = await getCurrentTenantContext();
  const platform = String(formData.get("platform") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!platform || !url) {
    return { status: "error", message: "플랫폼과 URL을 모두 입력해주세요." };
  }

  const db = forTenant(tenantId);
  const count = await db.socialLink.count();
  await db.socialLink.create({ data: { tenantId, platform, url, order: count } });

  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
  return { status: "success", message: "SNS 링크를 추가했어요" };
}

export async function deleteSocialLink(id: string): Promise<void> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  await db.socialLink.delete({ where: { id } });
  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
}

export async function reorderSocialLinks(orderedIds: string[]): Promise<void> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  await Promise.all(
    orderedIds.map((id, index) => db.socialLink.update({ where: { id }, data: { order: index } }))
  );
  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
}
