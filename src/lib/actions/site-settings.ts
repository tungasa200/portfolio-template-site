"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { revalidateTenantSite } from "@/lib/tenant/site-cache";
import { deleteR2Object } from "@/lib/storage/r2";

export interface ActionFormState {
  status: "idle" | "success" | "error";
  message?: string;
}

// "" -> null so src/components/site/Footer.tsx's `footerText ?? fallback`
// actually fires — `??` only triggers on null/undefined, not "" — see
// docs/roadmap.md's explicit warning about this exact bug.
function emptyToNull(value: FormDataEntryValue | null): string | null {
  const str = String(value ?? "").trim();
  return str === "" ? null : str;
}

export async function updateSiteSettings(
  _prevState: ActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const { tenantId } = await getCurrentTenantContext();

  const siteName = String(formData.get("siteName") ?? "").trim();
  const photographerName = String(formData.get("photographerName") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  const footerText = emptyToNull(formData.get("footerText"));

  if (!siteName || !photographerName || !contactEmail) {
    return { status: "error", message: "사이트 이름, 이름, 이메일은 필수예요." };
  }

  const db = forTenant(tenantId);
  await db.siteSettings.update({
    where: { tenantId },
    data: { siteName, photographerName, contactEmail, footerText },
  });

  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
  return { status: "success", message: "저장되었습니다" };
}

export async function updateHeroImage(r2Key: string): Promise<ActionFormState> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  await db.siteSettings.update({ where: { tenantId }, data: { heroImageKey: r2Key } });
  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
  return { status: "success", message: "대표 사진을 바꿨어요" };
}

export async function updateLogoImage(r2Key: string): Promise<ActionFormState> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const previous = await db.siteSettings.findUnique({ where: { tenantId }, select: { logoImageKey: true } });
  await db.siteSettings.update({ where: { tenantId }, data: { logoImageKey: r2Key } });
  if (previous?.logoImageKey) await deleteR2Object(previous.logoImageKey);
  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
  return { status: "success", message: "로고를 바꿨어요" };
}

export async function removeLogoImage(): Promise<ActionFormState> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const previous = await db.siteSettings.findUnique({ where: { tenantId }, select: { logoImageKey: true } });
  await db.siteSettings.update({ where: { tenantId }, data: { logoImageKey: null } });
  if (previous?.logoImageKey) await deleteR2Object(previous.logoImageKey);
  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
  return { status: "success", message: "로고를 제거하고 사이트 이름으로 되돌렸어요" };
}
