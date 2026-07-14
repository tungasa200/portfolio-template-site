export interface FullscreenPhoto {
  id: string;
  label: string;
}

interface FullscreenViewerProps {
  photos: FullscreenPhoto[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

// Main image box + horizontal thumbnail strip, used by the FULLSCREEN VIEW
// tab on Project/Exhibition detail pages.
export function FullscreenViewer({ photos, activeIndex, onSelect }: FullscreenViewerProps) {
  const active = photos[activeIndex] ?? photos[0];

  return (
    <div className="animate-site-intro-fade" style={{ animationDelay: "0.55s" }}>
      <div className="relative flex aspect-video w-full items-end overflow-hidden border border-site-ink bg-site-paper site-placeholder-pattern">
        {active && (
          <div className="relative px-6 py-5">
            <span className="border border-site-ink bg-site-paper px-2.5 py-1.5 font-site-mono text-xs tracking-wide text-site-ink-soft">
              {active.label}
            </span>
          </div>
        )}
      </div>
      <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
        {photos.map((photo, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={photo.id}
              onClick={() => onSelect(index)}
              className="relative aspect-[4/3] w-[100px] min-w-[100px] shrink-0 cursor-pointer overflow-hidden site-placeholder-pattern"
              style={{
                opacity: isActive ? 1 : 0.4,
                border: isActive ? "1px solid var(--color-site-ink)" : "1px solid transparent",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
