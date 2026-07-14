"use server";

import { forTenant } from "@/lib/db/tenant-scoped-client";

export interface ContactFormState {
  status: "idle" | "success" | "error";
  message?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  // tenantId is redundant with what forTenant() injects at runtime, but
  // ContactSubmissionUncheckedCreateInput requires it statically — Prisma's
  // generated types can't see the $extends middleware that fills it in.
  const db = forTenant(tenantId);
  await db.contactSubmission.create({ data: { tenantId, name, email, message } });

  return { status: "success", message: "Message sent — thank you." };
}
