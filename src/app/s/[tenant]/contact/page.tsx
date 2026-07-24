import { requireTenant } from "@/lib/tenant/resolve-tenant";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { cacheForTenant } from "@/lib/tenant/site-cache";
import { submitContactForm } from "@/lib/actions/contact";
import { SectionHeader } from "@/components/site/SectionHeader";
import { ContactForm } from "@/components/site/ContactForm";

export default async function TenantContactPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantKey } = await params;
  const tenant = await requireTenant(tenantKey);
  const action = submitContactForm.bind(null, tenant.id);

  const ownerName = tenant.siteSettings?.ownerName ?? tenant.slug;
  const contactEmail = tenant.siteSettings?.contactEmail;
  // Attachments only ever go anywhere via the Gmail notification (see
  // src/lib/actions/contact.ts) — no Gmail connection means no destination
  // for the file, so don't offer the field at all.
  const gmailConnected = Boolean(
    tenant.siteSettings?.replyEmailAddress && tenant.siteSettings?.replyEmailAppPasswordEnc
  );

  // Same single-source-of-truth fix as the board/about pages — title
  // follows the tenant's own CONTACT NavItem.label, not a hardcoded string.
  const navItem = await cacheForTenant(["contact-page"], tenant.id, () =>
    forTenant(tenant.id).navItem.findFirst({ where: { targetKind: "CONTACT" } })
  );

  return (
    <section className="box-border flex flex-col px-[var(--site-gutter)] py-6 lg:h-full lg:max-h-full lg:overflow-hidden lg:py-10">
      <SectionHeader title={navItem?.label ?? "CONTACT"} marginBottom="mb-8 lg:mb-12" />

      <div
        className="relative grid flex-1 grid-cols-1 gap-10 animate-site-intro-fade lg:grid-cols-[6fr_4fr] lg:gap-0"
        style={{ animationDelay: "0.5s" }}
      >
        <div className="absolute top-0 left-[60%] hidden h-full w-px bg-site-ink lg:block" />

        <ContactForm action={action} gmailConnected={gmailConnected} />

        <div className="flex flex-col gap-6 border-t border-site-ink pt-8 lg:border-t-0 lg:pt-1 lg:pl-10">
          <div>
            <div className="mb-1.5 font-site-mono text-[11px] tracking-wide text-site-ink-muted">
              OWNER
            </div>
            <div className="text-base">{ownerName}</div>
          </div>
          {contactEmail && (
            <div>
              <div className="mb-1.5 font-site-mono text-[11px] tracking-wide text-site-ink-muted">
                EMAIL
              </div>
              <div className="text-base">{contactEmail}</div>
            </div>
          )}
          {tenant.socialLinks.length > 0 && (
            <div>
              <div className="mb-1.5 font-site-mono text-[11px] tracking-wide text-site-ink-muted">
                SOCIAL
              </div>
              {tenant.socialLinks.map((social) => (
                <a
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-base text-site-ink hover:underline"
                >
                  {social.platform} ↗
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
