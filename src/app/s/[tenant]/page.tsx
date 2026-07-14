import { requireTenant } from "@/lib/tenant/resolve-tenant";

// Hero section, ported from design/Photographer Portfolio.dc.html. Always
// renders the placeholder box for now — there's no real image pipeline
// until Phase 4 wires up R2 + next/image, regardless of whether
// SiteSettings.heroImageKey is set.
export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantKey } = await params;
  await requireTenant(tenantKey);

  return (
    <section className="box-border flex h-[calc(100vh-80px)] max-h-[calc(100vh-80px)] items-center overflow-hidden px-16 py-10 md:px-[clamp(64px,6vw,140px)]">
      <div
        className="relative mx-auto flex w-full items-center justify-center border border-site-ink site-placeholder-pattern animate-site-intro-fade"
        style={{
          maxWidth: "min(100%, calc(100vh - 160px))",
          aspectRatio: "1 / 1",
          animationDelay: "0.15s",
        }}
      >
        <span className="relative border border-site-ink bg-site-paper px-3.5 py-1.5 font-site-mono text-xs tracking-wide text-site-ink-muted">
          HERO IMAGE — 1600×1600
        </span>
      </div>
    </section>
  );
}
