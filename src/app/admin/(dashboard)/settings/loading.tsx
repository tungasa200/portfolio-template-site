import { Skeleton } from "@/components/admin/Skeleton";

// Mirrors settings/page.tsx's head + SettingsForm + the section cards below it.
export default function AdminSettingsLoading() {
  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <Skeleton style={{ height: 13, width: 80, marginBottom: 8 }} />
        <Skeleton style={{ height: 28, width: 180 }} />
      </div>
      <Skeleton style={{ height: 220, width: "100%", marginTop: 20 }} />
      <div className="admin-section-card" style={{ marginTop: 24 }}>
        <Skeleton style={{ height: 120, width: "100%" }} />
      </div>
      <div className="admin-section-card" style={{ marginTop: 20 }}>
        <Skeleton style={{ height: 80, width: "100%" }} />
      </div>
    </div>
  );
}
