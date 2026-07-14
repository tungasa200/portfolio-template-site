import Link from "next/link";

export interface PhotoGridItem {
  id: string;
  href: string;
  tag: string;
  title: string;
  meta: string;
}

interface PhotoGridProps {
  items: PhotoGridItem[];
}

// Bordered 3-col card grid — shared by the Project (Photo) and Exhibition
// (Work) list views, which use an identical template in the mockup.
export function PhotoGrid({ items }: PhotoGridProps) {
  return (
    <div className="grid grid-cols-3 gap-4 animate-site-intro-fade" style={{ animationDelay: "0.5s" }}>
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="block border border-site-ink bg-site-paper text-inherit no-underline"
        >
          <div className="relative aspect-[4/3] overflow-hidden site-placeholder-pattern">
            <span className="absolute bottom-4 left-[18px] z-10 border border-site-ink bg-site-paper px-2 py-1 font-site-mono text-[11px] tracking-wide text-site-ink-soft">
              {item.tag}
            </span>
          </div>
          <div className="flex items-baseline justify-between border-t border-site-ink px-[22px] py-5">
            <span className="font-site-display text-xl">{item.title}</span>
            <span className="font-site-mono text-[11px] tracking-wide text-site-ink-muted">
              {item.meta}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
