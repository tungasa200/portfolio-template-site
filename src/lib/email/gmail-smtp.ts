import "server-only";
import nodemailer from "nodemailer";

// Gmail only, by design -- nodemailer's "gmail" service shorthand resolves
// host/port/TLS for us; the tenant only ever provides their address + an app
// password (Google Account -> Security -> 2-Step Verification -> App
// passwords), never raw SMTP settings.
export async function sendGmailReply(params: {
  fromEmail: string;
  appPassword: string;
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: params.fromEmail, pass: params.appPassword },
  });
  await transporter.sendMail({
    from: params.fromEmail,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
