import Image from "next/image";

export interface PhotoGridDetailItem {
  id: string;
  label: string;
  imageUrl?: string | null;
  thumbUrl?: string | null;
}

interface PhotoGridDetailProps {
  photos: PhotoGridDetailItem[];
}

// Square-tile grid used inside a Project/Exhibition detail page's GRID VIEW tab.
export function PhotoGridDetail({ photos }: PhotoGridDetailProps) {
  return (
    <div className="grid grid-cols-3 gap-4 animate-site-intro-fade" style={{ animationDelay: "0.55s" }}>
      {photos.map((photo) => {
        const url = photo.thumbUrl ?? photo.imageUrl;
        return (
          <div
            key={photo.id}
            className={`relative flex aspect-square items-end overflow-hidden border border-site-ink bg-site-paper ${url ? "" : "site-placeholder-pattern"}`}
          >
            {url && (
              <Image
                src={url}
                alt={photo.label}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover"
              />
            )}
            <div className="relative flex w-full items-end justify-between px-4 py-3.5">
              <span className="border border-site-ink bg-site-paper px-2 py-1 font-site-mono text-[11px] tracking-wide text-site-ink-soft">
                {photo.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
