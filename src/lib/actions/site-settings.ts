"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { revalidateTenantSite } from "@/lib/tenant/site-cache";
import { deleteR2Object } from "@/lib/storage/r2";
import { THEME_NAMES, type ThemeName } from "@/lib/site/theme-presets";

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

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
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  const footerText = emptyToNull(formData.get("footerText"));

  if (!siteName || !ownerName || !contactEmail) {
    return { status: "error", message: "사이트 이름, 이름, 이메일은 필수예요." };
  }

  const db = forTenant(tenantId);
  await db.siteSettings.update({
    where: { tenantId },
    data: { siteName, ownerName, contactEmail, footerText },
  });

  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
  return { status: "success", message: "저장되었습니다" };
}

export async function updateSiteTheme(_prevState: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const { tenantId } = await getCurrentTenantContext();

  const themeName = String(formData.get("themeName") ?? "");
  if (!THEME_NAMES.includes(themeName as ThemeName)) {
    return { status: "error", message: "알 수 없는 테마예요." };
  }

  let themeCustomInk: string | null = null;
  let themeCustomPaper: string | null = null;
  if (themeName === "custom") {
    themeCustomInk = String(formData.get("themeCustomInk") ?? "");
    themeCustomPaper = String(formData.get("themeCustomPaper") ?? "");
    if (!HEX_COLOR_RE.test(themeCustomInk) || !HEX_COLOR_RE.test(themeCustomPaper)) {
      return { status: "error", message: "커스텀 색상은 올바른 색상 값이어야 해요." };
    }
  }

  const db = forTenant(tenantId);
  await db.siteSettings.update({
    where: { tenantId },
    data: { themeName, themeCustomInk, themeCustomPaper },
  });

  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
  return { status: "success", message: "테마를 저장했어요" };
}

export async function updateHeroImage(r2Key: string, thumbR2Key: string): Promise<ActionFormState> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const previous = await db.siteSettings.findUnique({ where: { tenantId }, select: { heroImageKey: true, heroThumbKey: true } });
  await db.siteSettings.update({ where: { tenantId }, data: { heroImageKey: r2Key, heroThumbKey: thumbR2Key } });
  await Promise.all([
    previous?.heroImageKey ? deleteR2Object(previous.heroImageKey) : Promise.resolve(),
    previous?.heroThumbKey ? deleteR2Object(previous.heroThumbKey) : Promise.resolve(),
  ]);
  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
  return { status: "success", message: "대표 사진을 바꿨어요" };
}

// Re-crop only — the original is untouched, just the derived thumbnail
// (see ThumbnailCropModal).
export async function updateHeroImageThumbnail(thumbR2Key: string): Promise<ActionFormState> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const previous = await db.siteSettings.findUnique({ where: { tenantId }, select: { heroThumbKey: true } });
  await db.siteSettings.update({ where: { tenantId }, data: { heroThumbKey: thumbR2Key } });
  if (previous?.heroThumbKey) await deleteR2Object(previous.heroThumbKey);
  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
  return { status: "success", message: "썸네일을 다시 잘랐어요" };
}

export async function updateLogoImage(r2Key: string, thumbR2Key: string): Promise<ActionFormState> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const previous = await db.siteSettings.findUnique({ where: { tenantId }, select: { logoImageKey: true, logoThumbKey: true } });
  await db.siteSettings.update({ where: { tenantId }, data: { logoImageKey: r2Key, logoThumbKey: thumbR2Key } });
  await Promise.all([
    previous?.logoImageKey ? deleteR2Object(previous.logoImageKey) : Promise.resolve(),
    previous?.logoThumbKey ? deleteR2Object(previous.logoThumbKey) : Promise.resolve(),
  ]);
  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
  return { status: "success", message: "로고를 바꿨어요" };
}

export async function removeLogoImage(): Promise<ActionFormState> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const previous = await db.siteSettings.findUnique({ where: { tenantId }, select: { logoImageKey: true, logoThumbKey: true } });
  await db.siteSettings.update({ where: { tenantId }, data: { logoImageKey: null, logoThumbKey: null } });
  await Promise.all([
    previous?.logoImageKey ? deleteR2Object(previous.logoImageKey) : Promise.resolve(),
    previous?.logoThumbKey ? deleteR2Object(previous.logoThumbKey) : Promise.resolve(),
  ]);
  revalidatePath("/admin", "layout");
  await revalidateTenantSite(tenantId);
  return { status: "success", message: "로고를 제거하고 사이트 이름으로 되돌렸어요" };
}
