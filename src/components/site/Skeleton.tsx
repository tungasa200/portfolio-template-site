// Loading-state placeholder block, shared by the tenant site's loading.tsx
// files. Deliberately distinct from site-placeholder-pattern (theme.css),
// which means "no photo uploaded yet" — this one means "still fetching",
// via a pulse instead of a static stripe pattern.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-site-placeholder-a ${className}`} />;
}
