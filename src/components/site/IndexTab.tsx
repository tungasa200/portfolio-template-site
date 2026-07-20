import Image from "next/image";
import { indexImageRatioWeights, type IndexImageRatio } from "@/lib/site/index-image-ratio";

interface IndexTabProps {
  /** Trusted admin-authored rich HTML (same trust model as AboutPage.content
   * — not user-submitted, safe to render directly). */
  contentHtml: string;
  /** Item's primary photo, if it has one attached — omitted (not a
   * placeholder) when the item has no photos at all. */
  coverPhotoUrl?: string | null;
  /** Original pixel dimensions — required to render the cover photo at its
   * true aspect ratio (next/image needs real width/height for a remote
   * image, see IndexImageUpload's comment). Missing on rows uploaded before
   * this column existed, which fall back to a fixed 4:3 box below. */
  coverPhotoWidth?: number | null;
  coverPhotoHeight?: number | null;
  /** Image:text column-width split, admin-configurable per item. */
  imageRatio?: IndexImageRatio;
}

// INDEX tab content — per-item now, not per-board (see docs/roadmap.md's
// board redesign notes). The cover column only renders when the item
// actually has a photo; an item with no photos gets the text alone at full
// width instead of an empty placeholder box.
export function IndexTab({
  contentHtml,
  coverPhotoUrl,
  coverPhotoWidth,
  coverPhotoHeight,
  imageRatio = "RATIO_5_5",
}: IndexTabProps) {
  const [imageWeight, textWeight] = indexImageRatioWeights(imageRatio);
  const hasDimensions = !!(coverPhotoWidth && coverPhotoHeight);

  return (
    <div
      className="animate-site-intro-fade"
      style={{
        animationDelay: "0.55s",
        ...(coverPhotoUrl
          ? { display: "grid", gridTemplateColumns: `${textWeight}fr ${imageWeight}fr`, gap: "4rem" }
          : {}),
      }}
    >
      <div
        className="max-w-[520px] text-[17px] leading-[1.75] text-site-ink-body"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
      {coverPhotoUrl &&
        (hasDimensions ? (
          <div className="overflow-hidden border border-site-ink bg-site-paper">
            <Image
              src={coverPhotoUrl}
              alt=""
              width={coverPhotoWidth}
              height={coverPhotoHeight}
              sizes="(min-width: 768px) 50vw, 100vw"
              style={{ width: "100%", height: "auto" }}
            />
          </div>
        ) : (
          <div className="relative aspect-[4/3] overflow-hidden border border-site-ink bg-site-paper">
            <Image src={coverPhotoUrl} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
          </div>
        ))}
    </div>
  );
}
