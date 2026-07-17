import { Skeleton } from "@/components/admin/Skeleton";

export default function AdminAboutLoading() {
  return (
    <div className="admin-page">
      <Skeleton style={{ height: 36, width: 240, marginBottom: 20 }} />
      <Skeleton style={{ height: 320, width: "100%" }} />
    </div>
  );
}
