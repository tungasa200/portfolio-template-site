"use client";

import Image from "next/image";

export interface PhotoGridDetailItem {
  id: string;
  label: string;
  imageUrl?: string | null;
  thumbUrl?: string | null;
  width?: number | null;
  height?: number | null;
}

interface PhotoGridDetailProps {
  photos: PhotoGridDetailItem[];
  /** Opens the original-image lightbox at this photo's index — omitted
   * (tiles become inert) when there's nothing to show full-res. */
  onPhotoClick?: (index: number) => void;
}

// Square-tile grid used inside a Project/Exhibition detail page's GRID VIEW tab.
export function PhotoGridDetail({ photos, onPhotoClick }: PhotoGridDetailProps) {
  return (
    <div className="grid grid-cols-2 gap-3 animate-site-intro-fade sm:gap-4 lg:grid-cols-3" style={{ animationDelay: "0.55s" }}>
      {photos.map((photo, index) => {
        const url = photo.thumbUrl ?? photo.imageUrl;
        return (
          <div
            key={photo.id}
            onClick={url && onPhotoClick ? () => onPhotoClick(index) : undefined}
            className={`relative aspect-square overflow-hidden border border-site-ink bg-site-paper ${url ? "" : "site-placeholder-pattern"} ${url && onPhotoClick ? "cursor-zoom-in" : ""}`}
          >
            {url && (
              <Image
                src={url}
                alt={photo.label}
                fill
                sizes="(min-width: 1024px) 33vw, 50vw"
                className="object-cover"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
