import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant/resolve-tenant";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { SectionHeader } from "@/components/site/SectionHeader";

// Static, non-repeating page — not a board (no items, no photo grid). Title
// is sourced from the tenant's ABOUT NavItem.label (falls back to "ABOUT"),
// not hardcoded — same single-source-of-truth fix applied to boards, since
// this page's own heading must follow a nav rename exactly like they do.
export default async function AboutPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantKey } = await params;
  const tenant = await requireTenant(tenantKey);
  const db = forTenant(tenant.id);

  const about = await db.aboutPage.findUnique({ where: { tenantId: tenant.id } });
  if (!about) {
    notFound();
  }

  const navItem = await db.navItem.findFirst({ where: { targetKind: "ABOUT" } });

  return (
    <section className="box-border min-h-[calc(100vh-65px)] px-16 py-10">
      <SectionHeader title={navItem?.label ?? "ABOUT"} />
      <div
        className="max-w-[640px] animate-site-intro-fade text-[17px] leading-[1.75] text-site-ink-body"
        style={{ animationDelay: "0.5s" }}
        dangerouslySetInnerHTML={{ __html: about.content }}
      />
    </section>
  );
}
