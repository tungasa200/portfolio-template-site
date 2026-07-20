"use client";

import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Captions from "yet-another-react-lightbox/plugins/captions";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "./image-lightbox-theme.css";

export interface LightboxSlide {
  src: string;
  width?: number | null;
  height?: number | null;
  alt?: string;
  /** e.g. "PHOTO 01" or a GALLERY_SINGLE item's name — shown in the modal
   * only, never floated on top of the on-page thumbnail/tile. */
  title?: string;
  /** e.g. "1920 × 1280" or "1920 × 1280 · SUNSET WALK · Sep 2025". */
  description?: string;
}

interface ImageLightboxProps {
  slides: LightboxSlide[];
  index: number;
  open: boolean;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
}

// Original-image viewer shared by GRID VIEW, SLIDE VIEW, and GALLERY_SINGLE
// board list tiles — opens the full-resolution photo fit to the viewport
// with pinch/wheel zoom + drag-pan (Zoom plugin) and a dimensions/name/date
// caption (Captions plugin). Themed to the site's sharp/no-shadow editorial
// look via CSS custom-property overrides in ./image-lightbox-theme.css
// instead of yarl's default rounded/drop-shadow skin.
export function ImageLightbox({ slides, index, open, onClose, onIndexChange }: ImageLightboxProps) {
  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      slides={slides.map((slide) => ({
        src: slide.src,
        width: slide.width ?? undefined,
        height: slide.height ?? undefined,
        alt: slide.alt ?? "",
        title: slide.title,
        description: slide.description,
      }))}
      on={{ view: ({ index: nextIndex }) => onIndexChange?.(nextIndex) }}
      plugins={[Zoom, Captions]}
      zoom={{ maxZoomPixelRatio: 4, scrollToZoom: true }}
      captions={{ descriptionTextAlign: "center", descriptionMaxLines: 2 }}
      carousel={{ finite: slides.length <= 1 }}
      className="site-lightbox"
    />
  );
}
