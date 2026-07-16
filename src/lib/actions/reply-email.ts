"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { tenantCacheTag } from "@/lib/tenant/site-cache";
import { encryptSecret } from "@/lib/crypto/secret-box";
import type { ActionFormState } from "@/lib/actions/site-settings";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateReplyEmailConfig(
  _prevState: ActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const replyEmail = String(formData.get("replyEmail") ?? "").trim();
  const appPassword = String(formData.get("appPassword") ?? "").trim();

  if (!replyEmail || !EMAIL_RE.test(replyEmail)) {
    return { status: "error", message: "올바른 이메일 주소를 입력해주세요." };
  }
  if (!appPassword) {
    return { status: "error", message: "앱 비밀번호를 입력해주세요." };
  }

  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  await db.siteSettings.update({
    where: { tenantId },
    data: { replyEmailAddress: replyEmail, replyEmailAppPasswordEnc: encryptSecret(appPassword) },
  });

  revalidatePath("/admin", "layout");
  updateTag(tenantCacheTag(tenantId));
  return { status: "success", message: "이메일 연동을 완료했어요." };
}

export async function disconnectReplyEmail(): Promise<ActionFormState> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  await db.siteSettings.update({
    where: { tenantId },
    data: { replyEmailAddress: null, replyEmailAppPasswordEnc: null },
  });

  revalidatePath("/admin", "layout");
  updateTag(tenantCacheTag(tenantId));
  return { status: "success", message: "이메일 연동을 해제했어요." };
}
