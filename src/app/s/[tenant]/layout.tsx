import type { CSSProperties, ReactNode } from "react";
import { Playfair_Display, Inter, JetBrains_Mono } from "next/font/google";
import { requireTenant } from "@/lib/tenant/resolve-tenant";
import { resolveNavHref, resolveNavLabel } from "@/lib/site/nav-items";
import { resolveDisplayUrl } from "@/lib/storage/r2";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { resolveThemeColors, themeCssVars } from "@/lib/site/theme-presets";
import "./theme.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// No paths known at build time (tenants are created dynamically, long after
// this app is deployed) — returning [] here is what makes Next treat
// /s/[tenant]/** as statically renderable with an on-demand ISR fallback
// (dynamicParams defaults to true) instead of fully dynamic SSR-per-request.
// Without this export, the route can't be cached at the page/route level at
// all, no matter what revalidate is set to.
export async function generateStaticParams() {
  return [];
}

// Real freshness comes from revalidateTenantSite() (called by every admin
// mutation) via revalidatePath, not from this timer — this is just a
// safety net in case an invalidation call is ever missed.
export const revalidate = 86400; // 1 day, in seconds — must be a literal, not an expression

// Reached via proxy.ts rewriting {slug}.{ROOT_DOMAIN}/* and custom domains
// to /s/{tenant}/*. This layout resolves the tenant once (cached, shared
// with page.tsx below it) and renders the shared sidebar/footer chrome
// ported from design/Photographer Portfolio.dc.html.
export default async function TenantSiteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantKey } = await params;
  const tenant = await requireTenant(tenantKey);

  const navItems = tenant.navItems.map((item) => ({
    id: item.id,
    label: resolveNavLabel(item),
    href: resolveNavHref(item),
    external: item.targetKind === "EXTERNAL_URL",
  }));

  const socialLinks = tenant.socialLinks.map((link) => ({
    id: link.id,
    platform: link.platform,
    url: link.url,
  }));

  const siteName = tenant.siteSettings?.siteName ?? tenant.slug;
  const ownerName = tenant.siteSettings?.ownerName ?? tenant.slug;
  const logoUrl = resolveDisplayUrl(tenant.siteSettings?.logoImageKey, tenant.siteSettings?.logoThumbKey);
  const { ink, paper } = resolveThemeColors(tenant.siteSettings);

  return (
    <div
      className={`${playfair.variable} ${inter.variable} ${jetbrainsMono.variable} flex min-h-screen bg-site-paper font-site-sans text-site-ink`}
      style={themeCssVars(ink, paper) as CSSProperties}
    >
      <Nav siteName={siteName} logoUrl={logoUrl} navItems={navItems} socialLinks={socialLinks} />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1">{children}</div>
        <Footer ownerName={ownerName} footerText={tenant.siteSettings?.footerText} />
      </main>
    </div>
  );
}
