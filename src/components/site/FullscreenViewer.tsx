"use client";

import Image from "next/image";

export interface FullscreenPhoto {
  id: string;
  label: string;
  /** Original, full quality — used only for the large active image below. */
  imageUrl?: string | null;
  /** Web-optimized derived copy — used for the filmstrip tiles, which are
   * rendered small enough that the original would be wasted bandwidth. */
  thumbUrl?: string | null;
  width?: number | null;
  height?: number | null;
}

interface FullscreenViewerProps {
  photos: FullscreenPhoto[];
  activeIndex: number;
  onSelect: (index: number) => void;
  /** Opens the original-image lightbox on the active image — omitted makes
   * the main image inert (thumbnail strip navigation still works either way). */
  onExpand?: (index: number) => void;
}

// Main image box + horizontal thumbnail strip, used by the SLIDE VIEW tab
// on a GALLERY_MULTI board item's detail page. At lg+ the box fills
// whatever vertical space DetailTabs hands it (h-full, capped by the
// page's own fixed viewport height — see board/[seq]/[itemSlug]/page.tsx)
// instead of a fixed aspect-video ratio, so it's always the max height the
// screen has room for. Below lg that page is a normal scrolling flow with
// no ancestor height to inherit, so the box gets its own dvh-based height
// instead — without it, next/image's `fill` would resolve against a
// zero-height flex ancestor (fill is absolutely positioned and so
// contributes nothing to that ancestor's auto height) and the main image
// just wouldn't render. The main image uses object-fit: contain (never
// crops — the box's height is fixed but its rendered width follows each
// photo's real aspect ratio), while thumbnails use object-fit: cover (a
// small fixed tile reads better cropped-to-fill than letterboxed).
function NavArrow({ direction, onClick }: { direction: "prev" | "next"; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={direction === "prev" ? "Previous photo" : "Next photo"}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-site-ink bg-site-paper lg:h-[34px] lg:w-[34px]"
      style={direction === "prev" ? { left: "16px" } : { right: "16px" }}
    >
      <div
        style={{
          width: "8px",
          height: "8px",
          borderRight: "1px solid var(--color-site-ink)",
          borderBottom: "1px solid var(--color-site-ink)",
          transform: direction === "prev" ? "rotate(135deg)" : "rotate(-45deg)",
        }}
      />
    </button>
  );
}

export function FullscreenViewer({ photos, activeIndex, onSelect, onExpand }: FullscreenViewerProps) {
  const active = photos[activeIndex] ?? photos[0];

  return (
    <div
      className="flex h-[75dvh] flex-col animate-site-intro-fade lg:h-full lg:min-h-0"
      style={{ animationDelay: "0.55s" }}
    >
      <div
        onClick={active?.imageUrl && onExpand ? () => onExpand(activeIndex) : undefined}
        className={`relative flex w-full flex-1 items-end overflow-hidden bg-site-paper lg:min-h-0 ${active?.imageUrl ? "" : "site-placeholder-pattern"} ${active?.imageUrl && onExpand ? "cursor-zoom-in" : ""}`}
      >
        {active?.imageUrl && (
          <Image src={active.imageUrl} alt={active.label} fill sizes="100vw" className="object-contain" />
        )}
        {photos.length > 1 && (
          <>
            <NavArrow direction="prev" onClick={() => onSelect((activeIndex - 1 + photos.length) % photos.length)} />
            <NavArrow direction="next" onClick={() => onSelect((activeIndex + 1) % photos.length)} />
          </>
        )}
      </div>
      <div className="mt-5 flex shrink-0 justify-center gap-3 overflow-x-auto pb-1">
        {photos.map((photo, index) => {
          const isActive = index === activeIndex;
          const stripUrl = photo.thumbUrl ?? photo.imageUrl;
          return (
            <div
              key={photo.id}
              onClick={() => onSelect(index)}
              className={`relative aspect-[4/3] w-[100px] min-w-[100px] shrink-0 cursor-pointer overflow-hidden ${stripUrl ? "" : "site-placeholder-pattern"}`}
              style={{
                opacity: isActive ? 1 : 0.4,
                border: isActive ? "1px solid var(--color-site-ink)" : "1px solid transparent",
              }}
            >
              {stripUrl && <Image src={stripUrl} alt={photo.label} fill sizes="100px" className="object-cover" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
