export interface PhotoGridDetailItem {
  id: string;
  label: string;
}

interface PhotoGridDetailProps {
  photos: PhotoGridDetailItem[];
}

// Square-tile grid used inside a Project/Exhibition detail page's GRID VIEW tab.
export function PhotoGridDetail({ photos }: PhotoGridDetailProps) {
  return (
    <div className="grid grid-cols-3 gap-4 animate-site-intro-fade" style={{ animationDelay: "0.55s" }}>
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="relative flex aspect-square items-end overflow-hidden border border-site-ink bg-site-paper site-placeholder-pattern"
        >
          <div className="relative flex w-full items-end justify-between px-4 py-3.5">
            <span className="border border-site-ink bg-site-paper px-2 py-1 font-site-mono text-[11px] tracking-wide text-site-ink-soft">
              {photo.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
