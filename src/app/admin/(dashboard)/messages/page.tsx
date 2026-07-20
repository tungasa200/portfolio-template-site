import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { getAdminBasePath } from "@/lib/auth/admin-base-path";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { cacheForTenant } from "@/lib/tenant/site-cache";
import { MessagesInbox } from "@/components/admin/MessagesInbox";

function formatKoreanDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default async function AdminMessagesPage() {
  const { tenantId } = await getCurrentTenantContext();

  const [submissions, siteSettings] = await cacheForTenant(["admin-messages"], tenantId, () => {
    const db = forTenant(tenantId);
    return Promise.all([
      db.contactSubmission.findMany({
        where: { status: { in: ["NEW", "READ"] } },
        orderBy: { createdAt: "desc" },
      }),
      db.siteSettings.findUnique({ where: { tenantId } }),
    ]);
  });

  const canReply = Boolean(siteSettings?.replyEmailAddress && siteSettings?.replyEmailAppPasswordEnc);
  const settingsHref = `${await getAdminBasePath()}/settings`;

  return (
    <div className="admin-page" style={{ maxWidth: 900 }}>
      <div className="admin-page-head">
        <div className="admin-page-eyebrow">문의</div>
        <h1 className="admin-page-title">받은 메시지</h1>
        <p className="admin-page-desc">방문자가 연락처 페이지에서 보낸 메시지예요.</p>
      </div>
      <MessagesInbox
        canReply={canReply}
        settingsHref={settingsHref}
        messages={submissions.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          message: s.message,
          dateLabel: formatKoreanDate(s.createdAt),
          isNew: s.status === "NEW",
          replyMessage: s.replyMessage,
        }))}
      />
    </div>
  );
}
