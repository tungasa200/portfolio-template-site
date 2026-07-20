import Image from "next/image";
import { requireTenant } from "@/lib/tenant/resolve-tenant";
import { resolveDisplayUrl } from "@/lib/storage/r2";

// Hero section, ported from design/Photographer Portfolio.dc.html. Renders
// the real hero photo (SiteSettings.heroImageKey) once one's been uploaded
// and R2_PUBLIC_HOSTNAME is set; falls back to the placeholder box
// otherwise (no photo yet, or that dashboard step — see
// docs/external-services.md — is still pending).
export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantKey } = await params;
  const tenant = await requireTenant(tenantKey);

  const heroUrl = resolveDisplayUrl(tenant.siteSettings?.heroImageKey, tenant.siteSettings?.heroThumbKey);
  const photographerName = tenant.siteSettings?.photographerName ?? tenant.slug;

  return (
    <section className="box-border flex h-[calc(100vh-80px)] max-h-[calc(100vh-80px)] items-center overflow-hidden px-16 py-10 md:px-[clamp(64px,6vw,140px)]">
      <div
        className={`relative mx-auto flex w-full items-center justify-center animate-site-intro-fade ${heroUrl ? "" : "border border-site-ink site-placeholder-pattern"}`}
        style={{
          maxWidth: "min(100%, calc(100vh - 160px))",
          aspectRatio: "1 / 1",
          animationDelay: "0.15s",
        }}
      >
        {heroUrl ? (
          <Image src={heroUrl} alt={`${photographerName} 대표 사진`} fill sizes="100vw" className="object-cover" />
        ) : (
          <span className="relative border border-site-ink bg-site-paper px-3.5 py-1.5 font-site-mono text-xs tracking-wide text-site-ink-muted">
            HERO IMAGE — 1600×1600
          </span>
        )}
      </div>
    </section>
  );
}
