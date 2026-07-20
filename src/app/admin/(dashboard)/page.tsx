import Link from "next/link";
import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { getAdminBasePath } from "@/lib/auth/admin-base-path";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { cacheForTenant } from "@/lib/tenant/site-cache";
import { r2PublicUrl, resolveDisplayUrl } from "@/lib/storage/r2";
import { resolveNavLabel } from "@/lib/site/nav-items";
import { NavVisibilityList } from "@/components/admin/NavVisibilityList";
import { HeroImageQuickUpload } from "@/components/admin/HeroImageQuickUpload";

const TARGET_LABEL: Record<string, string> = {
  HOME: "홈 화면",
  BOARD: "게시판",
  ABOUT: "소개 페이지",
  CONTACT: "문의 페이지",
  EXTERNAL_URL: "외부 링크",
};

export default async function AdminHomePage() {
  const { tenantId } = await getCurrentTenantContext();
  const adminBasePath = await getAdminBasePath();

  const [siteSettings, boards, navItems, unreadCount] = await cacheForTenant(["admin-home"], tenantId, () => {
    const db = forTenant(tenantId);
    return Promise.all([
      db.siteSettings.findUnique({ where: { tenantId } }),
      db.board.findMany({
        orderBy: { order: "asc" },
        include: { _count: { select: { items: { where: { isPublished: true } } } } },
      }),
      db.navItem.findMany({
        orderBy: { order: "asc" },
        include: { targetBoard: { select: { seq: true, name: true } } },
      }),
      db.contactSubmission.count({ where: { status: "NEW" } }),
    ]);
  });

  const heroImage = siteSettings?.heroImageKey
    ? {
        r2Key: siteSettings.heroImageKey,
        url: r2PublicUrl(siteSettings.heroImageKey),
        thumbUrl: resolveDisplayUrl(siteSettings.heroImageKey, siteSettings.heroThumbKey),
      }
    : null;

  const visibilityItems = navItems
    .filter((n) => n.targetKind !== "HOME")
    .map((n) => ({
      id: n.id,
      label: resolveNavLabel(n),
      target: TARGET_LABEL[n.targetKind] ?? "",
      visible: n.isVisible,
    }));

  return (
    <div className="admin-page">
      <div className="admin-section-card" style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24 }}>
        {boards.map((board) => (
          <div key={board.id} style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 34, fontWeight: 700 }}>{board._count.items}</div>
            <div style={{ fontSize: "14.5px", color: "var(--muted)" }}>{board.name} 게시물 공개 중</div>
          </div>
        ))}
        <div style={{ flex: 1, minWidth: 160 }}>
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: "var(--accent-ink)",
              background: "var(--accent)",
              display: "inline-block",
              padding: "0 10px",
              borderRadius: 8,
            }}
          >
            {unreadCount}
          </div>
          <div style={{ fontSize: "14.5px", color: "var(--muted)", marginTop: 6 }}>
            새로 온 메시지 ·{" "}
            <Link href={`${adminBasePath}/messages`} style={{ color: "var(--ink)", fontWeight: 700, textDecoration: "underline" }}>
              확인하기
            </Link>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>대표 이미지</h2>
      <div className="admin-home-preview-frame">
        <div className="admin-browser-chrome">
          <div className="admin-browser-dot" />
          <div className="admin-browser-dot" />
          <div className="admin-browser-dot" />
          <div className="admin-browser-url">{siteSettings?.siteName ?? ""}</div>
        </div>
        <div className="admin-hero-preview-body">
          <HeroImageQuickUpload heroImage={heroImage} />
        </div>
      </div>

      <div className="admin-section-card" style={{ marginTop: 24 }}>
        <h2>Quick Upload</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
          {boards.map((board) => (
            <Link key={board.id} href={`${adminBasePath}/board/${board.id}/new`} className="admin-btn">
              + 새 {board.name} 추가
            </Link>
          ))}
        </div>
      </div>

      <div className="admin-section-card" style={{ marginTop: 20 }}>
        <h2>페이지 노출</h2>
        <div style={{ marginTop: 20 }}>
          <NavVisibilityList items={visibilityItems} />
        </div>
      </div>
    </div>
  );
}
