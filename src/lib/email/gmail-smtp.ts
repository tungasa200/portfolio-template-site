import "server-only";
import nodemailer from "nodemailer";

// Gmail only, by design -- nodemailer's "gmail" service shorthand resolves
// host/port/TLS for us; the tenant only ever provides their address + an app
// password (Google Account -> Security -> 2-Step Verification -> App
// passwords), never raw SMTP settings. Used both for admin replies
// (src/lib/actions/messages.ts) and contact-form notifications
// (src/lib/actions/contact.ts) -- same tenant-owned Gmail account either way.
export async function sendViaGmail(params: {
  fromEmail: string;
  appPassword: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: params.fromEmail, pass: params.appPassword },
  });
  await transporter.sendMail({
    from: params.fromEmail,
    to: params.to,
    replyTo: params.replyTo,
    subject: params.subject,
    html: params.html,
    attachments: params.attachments,
  });
}
