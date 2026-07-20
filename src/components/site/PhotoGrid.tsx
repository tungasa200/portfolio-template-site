"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ImageLightbox } from "./ImageLightbox";

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
  /** Original, full-quality URL — backs the GALLERY_SINGLE lightbox (unused
   * for GALLERY_MULTI, whose tiles navigate to a detail page instead). */
  originalUrl?: string | null;
  width?: number | null;
  height?: number | null;
}

interface PhotoGridProps {
  items: PhotoGridItem[];
  /** GALLERY_SINGLE boards render as a label-less 1:1 image wall — see
   * design/admin-mockup.html's siteCard() comment: a one-photo-per-item
   * gallery reads as a pure image wall, name/date move to a hover tooltip. */
  kind: "GALLERY_MULTI" | "GALLERY_SINGLE";
}

function CardShell({
  href,
  title,
  onClick,
  children,
}: {
  href?: string;
  title?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const className = `block border border-site-ink bg-site-paper text-inherit no-underline ${onClick ? "cursor-zoom-in" : ""}`;
  if (href) {
    return (
      <Link href={href} className={className} title={title}>
        {children}
      </Link>
    );
  }
  return (
    <div className={className} title={title} onClick={onClick}>
      {children}
    </div>
  );
}

// Bordered 3-col card grid, shared by every board's list view. GALLERY_MULTI
// boards show a 4:3 photo + title/meta row; GALLERY_SINGLE boards drop the
// title/date row entirely and become 1:1 square tiles (name/date surface via
// a native title-attribute tooltip instead — see docs/progress.md's unified
// item-model decision).
export function PhotoGrid({ items, kind }: PhotoGridProps) {
  const showBody = kind !== "GALLERY_SINGLE";
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Only GALLERY_SINGLE tiles open the lightbox (GALLERY_MULTI tiles
  // navigate to their own detail page via `href` instead) — filtered
  // separately so lightbox indices line up with clicked tiles regardless of
  // which items are missing a photo.
  const photoItems = showBody ? [] : items.filter((item) => item.originalUrl);

  if (items.length === 0) {
    return (
      <div
        className="animate-site-intro-fade py-16 text-center font-site-mono text-sm tracking-wide text-site-ink-muted"
        style={{ animationDelay: "0.5s" }}
      >
        게시물이 없습니다
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 animate-site-intro-fade" style={{ animationDelay: "0.5s" }}>
      {items.map((item) => {
        const photoIndex = photoItems.findIndex((p) => p.id === item.id);
        return (
          <CardShell
            key={item.id}
            href={item.href}
            title={showBody ? undefined : `${item.title} · ${item.meta}`}
            onClick={photoIndex >= 0 ? () => setLightboxIndex(photoIndex) : undefined}
          >
            <div
              className={`relative overflow-hidden ${showBody ? "aspect-[4/3]" : "aspect-square"} ${item.imageUrl ? "" : "site-placeholder-pattern"}`}
            >
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
            {showBody && (
              <div className="flex items-baseline justify-between border-t border-site-ink px-[22px] py-5">
                <span className="font-site-display text-xl">{item.title}</span>
                <span className="font-site-mono text-[11px] tracking-wide text-site-ink-muted">
                  {item.meta}
                </span>
              </div>
            )}
          </CardShell>
        );
      })}
      <ImageLightbox
        open={lightboxIndex !== null}
        index={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
        slides={photoItems.map((item) => ({
          src: item.originalUrl ?? "",
          width: item.width,
          height: item.height,
          alt: item.title,
          title: item.title,
          description:
            item.width && item.height ? `${item.width} × ${item.height} · ${item.meta}` : item.meta,
        }))}
      />
    </div>
  );
}
