import "server-only";
import { Resend } from "resend";

// Lazily constructed: the Resend constructor throws immediately if
// RESEND_API_KEY is missing/empty, which would otherwise crash every
// import of this module (including the /contact page render itself,
// well before any email is actually sent) on any machine/environment
// without a Resend key configured. Email notifications are meant to be
// best-effort — see src/lib/actions/contact.ts — so a missing key should
// just skip sending, not break the contact form.
let client: Resend | null | undefined;

export function getResendClient(): Resend | null {
  if (client === undefined) {
    client = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  }
  return client;
}
