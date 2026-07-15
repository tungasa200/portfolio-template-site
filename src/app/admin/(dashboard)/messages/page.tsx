import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { MessagesInbox } from "@/components/admin/MessagesInbox";

function formatKoreanDate(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export default async function AdminMessagesPage() {
  const { tenantId } = await getCurrentTenantContext();
  const db = forTenant(tenantId);

  const submissions = await db.contactSubmission.findMany({
    where: { status: { in: ["NEW", "READ"] } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="admin-page" style={{ maxWidth: 900 }}>
      <div className="admin-page-head">
        <div className="admin-page-eyebrow">문의</div>
        <h1 className="admin-page-title">받은 메시지</h1>
        <p className="admin-page-desc">방문자가 연락처 페이지에서 보낸 메시지예요.</p>
      </div>
      <MessagesInbox
        messages={submissions.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          message: s.message,
          dateLabel: formatKoreanDate(s.createdAt),
          isNew: s.status === "NEW",
        }))}
      />
    </div>
  );
}
