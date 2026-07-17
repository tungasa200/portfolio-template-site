import type { CSSProperties } from "react";

// Loading-state placeholder block for admin loading.tsx files. Mirrors
// src/components/site/Skeleton.tsx but styled off admin.css's own custom
// properties (scoped to .admin-root) instead of the site's Tailwind theme
// class, so the two style systems stay independent — admin components use
// plain CSS classes + inline styles for one-off sizing, not Tailwind
// utilities (see src/components/admin/BoardItemGrid.tsx for the convention).
export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div className={`admin-skeleton ${className}`} style={style} />;
}
