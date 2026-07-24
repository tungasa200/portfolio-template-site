import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant/resolve-tenant";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { cacheForTenant } from "@/lib/tenant/site-cache";
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

  const { about, navItem } = await cacheForTenant(["about-page"], tenant.id, async () => {
    const db = forTenant(tenant.id);
    const [about, navItem] = await Promise.all([
      db.aboutPage.findUnique({ where: { tenantId: tenant.id } }),
      db.navItem.findFirst({ where: { targetKind: "ABOUT" } }),
    ]);
    return { about, navItem };
  });
  if (!about) {
    notFound();
  }

  // Tiptap's empty editor still emits "<p></p>", not "" -- strip tags before
  // checking for actual content so that case also falls back to the message.
  const isEmpty = about.content.replace(/<[^>]*>/g, "").trim().length === 0;

  return (
    <section className="box-border min-h-[calc(100dvh-65px)] px-[var(--site-gutter)] py-6 lg:py-10">
      <SectionHeader title={navItem?.label ?? "ABOUT"} />
      {isEmpty ? (
        <div
          className="max-w-[640px] animate-site-intro-fade py-16 text-center font-site-mono text-sm tracking-wide text-site-ink-muted"
          style={{ animationDelay: "0.5s" }}
        >
          소개가 없습니다
        </div>
      ) : (
        <div
          className="max-w-[640px] animate-site-intro-fade text-[17px] leading-[1.75] text-site-ink-body"
          style={{ animationDelay: "0.5s" }}
          dangerouslySetInnerHTML={{ __html: about.content }}
        />
      )}
    </section>
  );
}
