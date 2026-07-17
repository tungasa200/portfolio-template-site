import { Skeleton } from "@/components/admin/Skeleton";

// Mirrors board/[boardId]/[itemId]/page.tsx's BoardItemEditor form shape.
export default function AdminBoardItemLoading() {
  return (
    <div className="admin-page">
      <Skeleton style={{ height: 28, width: 220, marginBottom: 20 }} />
      <Skeleton style={{ height: 200, width: "100%", marginBottom: 16 }} />
      <Skeleton style={{ height: 44, width: "100%", marginBottom: 12 }} />
      <Skeleton style={{ height: 44, width: "100%" }} />
    </div>
  );
}
