import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export interface PhotoGridItem {
  id: string;
  /** Omit for a static, non-clickable tile — GALLERY_SINGLE board items have
   * no detail page to link to (see docs/roadmap.md's board redesign). */
  href?: string;
  title: string;
  meta: string;
  /** Cover photo's public R2 URL — null/undefined renders the striped
   * placeholder (no photo uploaded yet, or R2_PUBLIC_HOSTNAME unset). */
  imageUrl?: string | null;
}

interface PhotoGridProps {
  items: PhotoGridItem[];
}

function CardShell({ href, children }: { href?: string; children: ReactNode }) {
  const className = "block border border-site-ink bg-site-paper text-inherit no-underline";
  return href ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}

// Bordered 3-col card grid — shared by every board's list view (both
// GALLERY_MULTI and GALLERY_SINGLE kinds use the same template). No more
// per-item tag/category badge — boards no longer have category/venue
// (see docs/progress.md's unified item-model decision).
export function PhotoGrid({ items }: PhotoGridProps) {
  return (
    <div className="grid grid-cols-3 gap-4 animate-site-intro-fade" style={{ animationDelay: "0.5s" }}>
      {items.map((item) => (
        <CardShell key={item.id} href={item.href}>
          <div className={`relative aspect-[4/3] overflow-hidden ${item.imageUrl ? "" : "site-placeholder-pattern"}`}>
            {item.imageUrl && (
              <Image
                src={item.imageUrl}
                alt={item.title}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover"
              />
            )}
          </div>
          <div className="flex items-baseline justify-between border-t border-site-ink px-[22px] py-5">
            <span className="font-site-display text-xl">{item.title}</span>
            <span className="font-site-mono text-[11px] tracking-wide text-site-ink-muted">
              {item.meta}
            </span>
          </div>
        </CardShell>
      ))}
    </div>
  );
}
