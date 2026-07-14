import { requireTenant } from "@/lib/tenant/resolve-tenant";
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

  const photographerName = tenant.siteSettings?.photographerName ?? tenant.slug;
  const contactEmail = tenant.siteSettings?.contactEmail;

  return (
    <section className="box-border flex min-h-[calc(100vh-65px)] flex-col px-16 py-10">
      <SectionHeader title="CONTACT" marginBottom="mb-12" />

      <div className="relative grid flex-1 grid-cols-[6fr_4fr] gap-0 animate-site-intro-fade" style={{ animationDelay: "0.5s" }}>
        <div className="absolute top-0 left-[60%] h-full w-px bg-site-ink" />

        <ContactForm action={action} />

        <div className="flex flex-col gap-6 pt-1 pl-10">
          <div>
            <div className="mb-1.5 font-site-mono text-[11px] tracking-wide text-site-ink-muted">
              Photographer
            </div>
            <div className="text-base">{photographerName}</div>
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
