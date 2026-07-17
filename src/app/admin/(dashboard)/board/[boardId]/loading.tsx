import { Skeleton } from "@/components/admin/Skeleton";

// Mirrors board/[boardId]/page.tsx's heading + BoardItemGrid thumbnails.
export default function AdminBoardLoading() {
  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <Skeleton style={{ height: 28, width: 200 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginTop: 20 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} style={{ aspectRatio: "1 / 1", width: "100%" }} />
        ))}
      </div>
    </div>
  );
}
