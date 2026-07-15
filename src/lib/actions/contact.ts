"use server";

import { forTenant } from "@/lib/db/tenant-scoped-client";
import { getResendClient } from "@/lib/email/resend";

export interface ContactFormState {
  status: "idle" | "success" | "error";
  message?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // matches the form's own "up to 10MB" copy
const ALLOWED_ATTACHMENT_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);

// Bound with `.bind(null, tenant.id)` from the (server-rendered) contact
// page before this ever reaches the client — tenantId never comes from form
// data. This is the public, unauthenticated contact form, so there is no
// session to derive tenantId from; it comes from the tenant the server
// already resolved for the current subdomain instead. See docs/conventions.md
// and the "sanctioned exception" note in src/lib/tenant/resolve-tenant.ts.
export async function submitContactForm(
  tenantId: string,
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email || !message) {
    return { status: "error", message: "Please fill in every field." };
  }
  if (!EMAIL_RE.test(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const attachment = formData.get("attachment");
  let attachmentBuffer: Buffer | null = null;
  let attachmentFilename = "";
  let attachmentType = "";
  if (attachment instanceof File && attachment.size > 0) {
    if (attachment.size > MAX_ATTACHMENT_BYTES) {
      return { status: "error", message: "Attachment is too large — 10MB max." };
    }
    if (!ALLOWED_ATTACHMENT_TYPES.has(attachment.type)) {
      return { status: "error", message: "Attachment must be a JPG, PNG, or PDF." };
    }
    attachmentBuffer = Buffer.from(await attachment.arrayBuffer());
    attachmentFilename = attachment.name;
    attachmentType = attachment.type;
  }

  // tenantId is redundant with what forTenant() injects at runtime, but
  // ContactSubmissionUncheckedCreateInput requires it statically — Prisma's
  // generated types can't see the $extends middleware that fills it in.
  const db = forTenant(tenantId);
  await db.contactSubmission.create({ data: { tenantId, name, email, message } });

  // The DB write above is the source of truth — a visitor's message is
  // never lost even if the email below fails. Email is a best-effort
  // notification, so failures are logged, not surfaced to the (anonymous)
  // visitor as an error.
  try {
    const resend = getResendClient();
    const siteSettings = await db.siteSettings.findUnique({ where: { tenantId } });
    if (!resend) {
      console.warn("[contact] RESEND_API_KEY not set — skipping email notification");
    } else if (siteSettings?.contactEmail) {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
        to: siteSettings.contactEmail,
        replyTo: email,
        subject: `New message from ${name} — ${siteSettings.siteName}`,
        html: `
          <p><strong>${escapeHtml(name)}</strong> (${escapeHtml(email)}) sent a message through your contact form:</p>
          <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
        `,
        attachments: attachmentBuffer
          ? [{ filename: attachmentFilename, content: attachmentBuffer, contentType: attachmentType }]
          : undefined,
      });
    } else {
      console.warn(`[contact] tenant ${tenantId} has no contactEmail set — notification not sent`);
    }
  } catch (err) {
    console.error("[contact] failed to send email notification", err);
  }

  return { status: "success", message: "Message sent — thank you." };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
