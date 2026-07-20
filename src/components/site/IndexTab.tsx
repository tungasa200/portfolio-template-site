import Image from "next/image";

interface IndexTabProps {
  /** Trusted admin-authored rich HTML (same trust model as AboutPage.content
   * — not user-submitted, safe to render directly). */
  contentHtml: string;
  /** Item's primary photo, if it has one attached — omitted (not a
   * placeholder) when the item has no photos at all. */
  coverPhotoUrl?: string | null;
}

// INDEX tab content — per-item now, not per-board (see docs/roadmap.md's
// board redesign notes). The cover column only renders when the item
// actually has a photo; an item with no photos gets the text alone at full
// width instead of an empty placeholder box.
export function IndexTab({ contentHtml, coverPhotoUrl }: IndexTabProps) {
  return (
    <div
      className={`animate-site-intro-fade ${coverPhotoUrl ? "grid grid-cols-[1fr_1.2fr] gap-16" : ""}`}
      style={{ animationDelay: "0.55s" }}
    >
      <div
        className="max-w-[520px] text-[17px] leading-[1.75] text-site-ink-body"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
      {coverPhotoUrl && (
        <div className="relative flex aspect-[4/3] items-end overflow-hidden border border-site-ink bg-site-paper">
          <Image src={coverPhotoUrl} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
          <div className="relative px-[18px] py-4">
            <span className="border border-site-ink bg-site-paper px-2 py-1 font-site-mono text-[11px] tracking-wide text-site-ink-soft">
              COVER PHOTO
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
