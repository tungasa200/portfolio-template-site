"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { tenantCacheTag } from "@/lib/tenant/site-cache";
import { decryptSecret } from "@/lib/crypto/secret-box";
import { sendViaGmail } from "@/lib/email/gmail-smtp";
import { escapeHtml } from "@/lib/email/escape-html";

// Mirrors design/admin-mockup.html's selectMessage: opening a NEW message
// marks it READ; already-READ/ARCHIVED messages are left alone.
export async function markMessageRead(id: string): Promise<void> {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const message = await db.contactSubmission.findUnique({ where: { id } });
  if (!message || message.status !== "NEW") return;
  await db.contactSubmission.update({ where: { id }, data: { status: "READ" } });
  revalidatePath("/admin", "layout");
  updateTag(tenantCacheTag(tenantId));
}

export interface ReplyResult {
  status: "success" | "error";
  message: string;
}

// One-shot reply: once repliedAt is set, this refuses to send again -- the
// reply UI only ever offers a single round-trip, not a thread. Requires the
// tenant to have connected their own Gmail in Settings (src/lib/actions/reply-email.ts)
// -- MessagesInbox already hides the reply form otherwise, this is the
// server-side backstop.
export async function sendMessageReply(id: string, replyMessage: string): Promise<ReplyResult> {
  const trimmed = replyMessage.trim();
  if (!trimmed) {
    return { status: "error", message: "답장 내용을 입력해주세요." };
  }

  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const [submission, siteSettings] = await Promise.all([
    db.contactSubmission.findUnique({ where: { id } }),
    db.siteSettings.findUnique({ where: { tenantId } }),
  ]);
  if (!submission) {
    return { status: "error", message: "메시지를 찾을 수 없어요." };
  }
  if (submission.repliedAt) {
    return { status: "error", message: "이미 답장을 보낸 메시지예요." };
  }
  if (!siteSettings?.replyEmailAddress || !siteSettings.replyEmailAppPasswordEnc) {
    return { status: "error", message: "이메일 답장 연동이 되어 있지 않아요. 설정 페이지에서 연동해주세요." };
  }

  try {
    await sendViaGmail({
      fromEmail: siteSettings.replyEmailAddress,
      appPassword: decryptSecret(siteSettings.replyEmailAppPasswordEnc),
      to: submission.email,
      subject: `Re: 문의하신 내용에 대한 답장 — ${siteSettings.siteName}`,
      html: `
        <p>${escapeHtml(trimmed).replace(/\n/g, "<br>")}</p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;" />
        <p style="color: #888; font-size: 13px;">보내신 메시지: ${escapeHtml(submission.message)}</p>
      `,
    });
  } catch (err) {
    console.error("[messages] failed to send reply email via Gmail SMTP", err);
    return { status: "error", message: "이메일 발송에 실패했어요. Gmail 주소와 앱 비밀번호를 다시 확인해주세요." };
  }

  await db.contactSubmission.update({
    where: { id },
    data: { replyMessage: trimmed, repliedAt: new Date() },
  });
  revalidatePath("/admin", "layout");
  updateTag(tenantCacheTag(tenantId));

  return { status: "success", message: "답장을 보냈어요." };
}
