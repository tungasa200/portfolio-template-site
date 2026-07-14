import type { ReactNode } from "react";
import { Playfair_Display, Inter, JetBrains_Mono } from "next/font/google";
import { requireTenant } from "@/lib/tenant/resolve-tenant";
import { resolveNavHref } from "@/lib/site/nav-items";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
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
    label: item.label,
    href: resolveNavHref(item),
    external: item.type === "EXTERNAL_URL",
  }));

  const socialLinks = tenant.socialLinks.map((link) => ({
    id: link.id,
    platform: link.platform,
    url: link.url,
  }));

  const siteName = tenant.siteSettings?.siteName ?? tenant.slug;
  const photographerName = tenant.siteSettings?.photographerName ?? tenant.slug;

  return (
    <div
      className={`${playfair.variable} ${inter.variable} ${jetbrainsMono.variable} flex min-h-screen bg-site-paper font-site-sans text-site-ink`}
    >
      <Nav siteName={siteName} navItems={navItems} socialLinks={socialLinks} />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1">{children}</div>
        <Footer photographerName={photographerName} footerText={tenant.siteSettings?.footerText} />
      </main>
    </div>
  );
}
