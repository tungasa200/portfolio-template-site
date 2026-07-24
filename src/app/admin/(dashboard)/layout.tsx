import type { ReactNode } from "react";
import { auth } from "@/lib/auth/auth";
import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { getAdminBasePath } from "@/lib/auth/admin-base-path";
import { ROOT_DOMAIN } from "@/lib/tenant/domain-mode";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { prisma } from "@/lib/db/client";
import { withDbRetry } from "@/lib/db/with-retry";
import { cacheForTenant } from "@/lib/tenant/site-cache";
import { ToastProvider } from "@/components/admin/Toast";
import { AdminShell, type AdminNavEntry } from "@/components/admin/AdminShell";
import { ADMIN_ICON_PATHS } from "@/components/admin/icons";
import "./admin.css";

// Route group (not a URL segment) so /admin is protected while /admin/login
// isn't, without two page.tsx files resolving to the same URL.
export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const { tenantId } = await getCurrentTenantContext();
  const session = await auth();
  const adminBasePath = await getAdminBasePath();

  // Tenant itself carries no tenantId column (platform-level model, see
  // prisma/schema.prisma) — the one other sanctioned unscoped lookup besides
  // src/lib/tenant/resolve-tenant.ts, needed here only for the "내 사이트
  // 보기" link's hostname.
  const [tenant, siteSettings, boards, navItems, unreadCount] = await cacheForTenant(["admin-layout"], tenantId, () => {
    const db = forTenant(tenantId);
    return Promise.all([
      withDbRetry(() => prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true, customDomain: true } })),
      db.siteSettings.findUnique({ where: { tenantId } }),
      db.board.findMany({ orderBy: { order: "asc" } }),
      db.navItem.findMany({
        where: { targetKind: { not: "CONTACT" } }, // no admin management screen for Contact
        orderBy: { order: "asc" },
        include: { targetBoard: { select: { id: true, seq: true, name: true, kind: true } } },
      }),
      db.contactSubmission.count({ where: { status: "NEW" } }),
    ]);
  });

  const boardIcon = (kind: string) => (kind === "GALLERY_SINGLE" ? ADMIN_ICON_PATHS.boardSingle : ADMIN_ICON_PATHS.boardMulti);

  // href is browser-facing and varies by access mode (see
  // src/lib/auth/admin-base-path.ts); matchPath is the canonical
  // /admin/* route AdminShell compares against usePathname() for active-tab
  // highlighting, which stays the same regardless of access mode.
  const dynamicNavItems: AdminNavEntry[] = navItems
    .map((n): AdminNavEntry | null => {
      if (n.targetKind === "HOME")
        return { id: n.id, href: adminBasePath || "/", matchPath: "/admin", label: "HOME", iconPath: ADMIN_ICON_PATHS.home };
      if (n.targetKind === "ABOUT")
        return {
          id: n.id,
          href: `${adminBasePath}/about`,
          matchPath: "/admin/about",
          label: n.label,
          iconPath: ADMIN_ICON_PATHS.about,
        };
      if (n.targetKind === "BOARD" && n.targetBoard) {
        return {
          id: n.id,
          href: `${adminBasePath}/board/${n.targetBoard.id}`,
          matchPath: `/admin/board/${n.targetBoard.id}`,
          label: n.targetBoard.name,
          iconPath: boardIcon(n.targetBoard.kind),
        };
      }
      return null;
    })
    .filter((x): x is AdminNavEntry => x !== null);

  const navEntries: AdminNavEntry[] = [
    ...dynamicNavItems,
    {
      id: "messages",
      href: `${adminBasePath}/messages`,
      matchPath: "/admin/messages",
      label: "메시지",
      iconPath: ADMIN_ICON_PATHS.messages,
      badge: unreadCount,
    },
    {
      id: "settings",
      href: `${adminBasePath}/settings`,
      matchPath: "/admin/settings",
      label: "설정",
      iconPath: ADMIN_ICON_PATHS.settings,
    },
  ];

  const protocol = ROOT_DOMAIN.includes("localhost") ? "http" : "https";
  // Per-customer-fork model (docs/decisions.md): each deployment only ever
  // has one real tenant, and proxy.ts already treats the bare ROOT_DOMAIN
  // (and www.ROOT_DOMAIN) as that tenant's canonical address, checked
  // *before* the {slug}.ROOT_DOMAIN subdomain branch -- so bare ROOT_DOMAIN
  // is correct here too, not {tenant.slug}.{ROOT_DOMAIN}. The old
  // slug-subdomain form was leftover from this project's original
  // multi-tenant-SaaS design (before the fork-per-customer pivot) and,
  // since nothing in this codebase ever sets tenant.customDomain, always
  // produced a "내 사이트 보기" link visitors don't need to use.
  const siteUrl = tenant
    ? tenant.customDomain
      ? `${protocol}://${tenant.customDomain}`
      : `${protocol}://${ROOT_DOMAIN}`
    : null;

  return (
    <div className="admin-root">
      <ToastProvider>
        <AdminShell
          siteName={siteSettings?.siteName ?? "내 사이트"}
          userEmail={session?.user?.email ?? ""}
          siteUrl={siteUrl}
          navItems={navEntries}
        >
          {children}
        </AdminShell>
      </ToastProvider>
    </div>
  );
}

