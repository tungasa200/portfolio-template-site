"use server";

import { revalidatePath } from "next/cache";
import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { getResendClient } from "@/lib/email/resend";

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

export interface ReplyResult {
  status: "success" | "error";
  message: string;
}

// One-shot reply: once repliedAt is set, this refuses to send again — the
// reply UI only ever offers a single round-trip, not a thread.
export async function sendMessageReply(id: string, replyMessage: string): Promise<ReplyResult> {
  const trimmed = replyMessage.trim();
  if (!trimmed) {
    return { status: "error", message: "답장 내용을 입력해주세요." };
  }

  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);
  const submission = await db.contactSubmission.findUnique({ where: { id } });
  if (!submission) {
    return { status: "error", message: "메시지를 찾을 수 없어요." };
  }
  if (submission.repliedAt) {
    return { status: "error", message: "이미 답장을 보낸 메시지예요." };
  }

  const resend = getResendClient();
  if (!resend) {
    return { status: "error", message: "이메일 발송이 설정되어 있지 않아요 (RESEND_API_KEY 누락)." };
  }

  const siteSettings = await db.siteSettings.findUnique({ where: { tenantId } });
  const siteName = siteSettings?.siteName ?? "";

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
      to: submission.email,
      replyTo: siteSettings?.contactEmail,
      subject: `Re: 문의하신 내용에 대한 답장${siteName ? ` — ${siteName}` : ""}`,
      html: `
        <p>${escapeHtml(trimmed).replace(/\n/g, "<br>")}</p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;" />
        <p style="color: #888; font-size: 13px;">보내신 메시지: ${escapeHtml(submission.message)}</p>
      `,
    });
  } catch (err) {
    console.error("[messages] failed to send reply email", err);
    return { status: "error", message: "이메일 발송에 실패했어요. 잠시 후 다시 시도해주세요." };
  }

  await db.contactSubmission.update({
    where: { id },
    data: { replyMessage: trimmed, repliedAt: new Date() },
  });
  revalidatePath("/admin", "layout");

  return { status: "success", message: "답장을 보냈어요." };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
