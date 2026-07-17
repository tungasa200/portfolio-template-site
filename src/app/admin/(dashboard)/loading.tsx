import { Skeleton } from "@/components/admin/Skeleton";

// Mirrors page.tsx's stat row + hero preview so nothing shifts once the
// real content swaps in. Rarely seen once admin-layout's data is cached
// (see cacheForTenant usage in layout.tsx) — mainly a safety net for cold
// cache hits, and what makes Next prefetch this route at all.
export default function AdminHomeLoading() {
  return (
    <div className="admin-page">
      <div className="admin-section-card" style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ flex: 1, minWidth: 160 }}>
            <Skeleton style={{ height: 34, width: 60 }} />
            <Skeleton style={{ height: 14, width: 110, marginTop: 8 }} />
          </div>
        ))}
      </div>
      <Skeleton style={{ height: 18, width: 96, marginBottom: 10 }} />
      <Skeleton className="admin-home-preview-frame" style={{ height: 260, width: "100%" }} />
    </div>
  );
}
