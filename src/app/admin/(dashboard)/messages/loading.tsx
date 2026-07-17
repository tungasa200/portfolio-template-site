import { Skeleton } from "@/components/admin/Skeleton";

// Mirrors messages/page.tsx's head + MessagesInbox row list.
export default function AdminMessagesLoading() {
  return (
    <div className="admin-page" style={{ maxWidth: 900 }}>
      <div className="admin-page-head">
        <Skeleton style={{ height: 13, width: 60, marginBottom: 8 }} />
        <Skeleton style={{ height: 28, width: 160 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} style={{ height: 64, width: "100%" }} />
        ))}
      </div>
    </div>
  );
}
