"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { logoutAction } from "@/lib/actions/auth";
import { AdminNavIcon, ADMIN_ICON_PATHS } from "@/components/admin/icons";

export interface AdminNavEntry {
  id: string;
  href: string;
  label: string;
  iconPath: string;
  badge?: number;
}

interface AdminShellProps {
  siteName: string;
  userEmail: string;
  siteUrl: string | null;
  navItems: AdminNavEntry[];
  children: ReactNode;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ siteName, userEmail, siteUrl, navItems, children }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="admin-shell">
      <nav className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div className="admin-brand-dot">{siteName.charAt(0).toUpperCase() || "?"}</div>
          <div>
            <div className="admin-brand-name">{siteName}</div>
            <div className="admin-brand-sub">사이트 관리</div>
          </div>
        </div>

        <div className="admin-nav-list">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`admin-nav-item ${isActive(pathname, item.href) ? "active" : ""}`}
            >
              <AdminNavIcon path={item.iconPath} />
              <span className="admin-nav-label">{item.label}</span>
              {!!item.badge && <span className="admin-nav-badge">{item.badge}</span>}
            </Link>
          ))}
        </div>

        {siteUrl && (
          <a className="admin-sidebar-view-site" href={siteUrl} target="_blank" rel="noreferrer">
            내 사이트 보기 ↗
          </a>
        )}

        <div className="admin-sidebar-foot">
          <div className="admin-user-chip">
            <div className="admin-user-avatar">{userEmail.charAt(0).toUpperCase()}</div>
            <div className="admin-user-email">{userEmail}</div>
          </div>
          <button
            type="button"
            className="admin-nav-item"
            style={{ opacity: 0.8, marginTop: 2 }}
            onClick={async () => {
              // Hard nav, not the Next.js client router — see
              // src/lib/actions/auth.ts's top comment for why.
              window.location.href = await logoutAction();
            }}
          >
            <AdminNavIcon path={ADMIN_ICON_PATHS.logout} />
            <span className="admin-nav-label">로그아웃</span>
          </button>
        </div>
      </nav>

      <main className="admin-main">{children}</main>
    </div>
  );
}
