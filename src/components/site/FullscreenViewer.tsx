import Image from "next/image";

export interface FullscreenPhoto {
  id: string;
  label: string;
  imageUrl?: string | null;
}

interface FullscreenViewerProps {
  photos: FullscreenPhoto[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

// Main image box + horizontal thumbnail strip, used by the SLIDE VIEW tab
// on a GALLERY_MULTI board item's detail page. The box fills whatever
// vertical space DetailTabs hands it (h-full, capped by the page's own
// fixed viewport height — see board/[seq]/[itemSlug]/page.tsx) instead of
// a fixed aspect-video ratio, so it's always the max height the screen has
// room for. The main image uses object-fit: contain (never crops — the
// box's height is fixed but its rendered width follows each photo's real
// aspect ratio), while thumbnails use object-fit: cover (a small fixed
// tile reads better cropped-to-fill than letterboxed).
export function FullscreenViewer({ photos, activeIndex, onSelect }: FullscreenViewerProps) {
  const active = photos[activeIndex] ?? photos[0];

  return (
    <div className="flex h-full min-h-0 flex-col animate-site-intro-fade" style={{ animationDelay: "0.55s" }}>
      <div
        className={`relative flex min-h-0 w-full flex-1 items-end overflow-hidden border border-site-ink bg-site-paper ${active?.imageUrl ? "" : "site-placeholder-pattern"}`}
      >
        {active?.imageUrl && (
          <Image src={active.imageUrl} alt={active.label} fill sizes="100vw" className="object-contain" />
        )}
        {active && (
          <div className="relative px-6 py-5">
            <span className="border border-site-ink bg-site-paper px-2.5 py-1.5 font-site-mono text-xs tracking-wide text-site-ink-soft">
              {active.label}
            </span>
          </div>
        )}
      </div>
      <div className="mt-5 flex shrink-0 gap-3 overflow-x-auto pb-1">
        {photos.map((photo, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={photo.id}
              onClick={() => onSelect(index)}
              className={`relative aspect-[4/3] w-[100px] min-w-[100px] shrink-0 cursor-pointer overflow-hidden ${photo.imageUrl ? "" : "site-placeholder-pattern"}`}
              style={{
                opacity: isActive ? 1 : 0.4,
                border: isActive ? "1px solid var(--color-site-ink)" : "1px solid transparent",
              }}
            >
              {photo.imageUrl && (
                <Image src={photo.imageUrl} alt={photo.label} fill sizes="100px" className="object-cover" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
