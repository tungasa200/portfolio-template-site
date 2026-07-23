import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { cacheForTenant } from "@/lib/tenant/site-cache";
import { r2PublicUrl, resolveDisplayUrl } from "@/lib/storage/r2";
import { resolveNavLabel } from "@/lib/site/nav-items";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { NavVisibilityList } from "@/components/admin/NavVisibilityList";
import { SocialLinksManager } from "@/components/admin/SocialLinksManager";
import { ReplyEmailSettings } from "@/components/admin/ReplyEmailSettings";
import { ThemeSettings } from "@/components/admin/ThemeSettings";

const TARGET_LABEL: Record<string, string> = {
  HOME: "홈 화면",
  BOARD: "게시판",
  ABOUT: "소개 페이지",
  CONTACT: "문의 페이지",
  EXTERNAL_URL: "외부 링크",
};

export default async function AdminSettingsPage() {
  const { tenantId } = await getCurrentTenantContext();

  const [siteSettings, navItems, socialLinks] = await cacheForTenant(["admin-settings"], tenantId, () => {
    const db = forTenant(tenantId);
    return Promise.all([
      db.siteSettings.findUnique({ where: { tenantId } }),
      db.navItem.findMany({
        orderBy: { order: "asc" },
        include: { targetBoard: { select: { seq: true, name: true } } },
      }),
      db.socialLink.findMany({ orderBy: { order: "asc" } }),
    ]);
  });

  const navListItems = navItems.map((n) => ({
    id: n.id,
    label: resolveNavLabel(n),
    target: TARGET_LABEL[n.targetKind] ?? "",
    visible: n.isVisible,
  }));

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <span className="admin-page-eyebrow">사이트 설정</span>
        <h1 className="admin-page-title">내 사이트 정보</h1>
      </div>

      <SettingsForm
        siteName={siteSettings?.siteName ?? ""}
        ownerName={siteSettings?.ownerName ?? ""}
        contactEmail={siteSettings?.contactEmail ?? ""}
        footerText={siteSettings?.footerText ?? null}
        heroImage={
          siteSettings?.heroImageKey
            ? {
                r2Key: siteSettings.heroImageKey,
                url: r2PublicUrl(siteSettings.heroImageKey),
                thumbUrl: resolveDisplayUrl(siteSettings.heroImageKey, siteSettings.heroThumbKey),
              }
            : null
        }
        logoImageUrl={resolveDisplayUrl(siteSettings?.logoImageKey, siteSettings?.logoThumbKey)}
      />

      <div className="admin-section-card">
        <h2>메뉴 순서 및 공개</h2>
        <div style={{ marginTop: 20 }}>
          <NavVisibilityList items={navListItems} draggable />
        </div>
      </div>

      <div className="admin-section-card">
        <h2>SNS 링크</h2>
        <SocialLinksManager links={socialLinks.map((s) => ({ id: s.id, platform: s.platform, url: s.url }))} />
      </div>

      <ReplyEmailSettings connectedEmail={siteSettings?.replyEmailAddress ?? null} />

      <ThemeSettings
        themeName={siteSettings?.themeName ?? "editorial-default"}
        themeCustomInk={siteSettings?.themeCustomInk ?? null}
        themeCustomPaper={siteSettings?.themeCustomPaper ?? null}
      />
    </div>
  );
}
