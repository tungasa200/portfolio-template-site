// Client-only image pipeline: HEIC→JPEG normalization, then a canvas-based
// crop+resize+WebP-encode used to derive every upload point's thumbnail.
// No server-side image processing (sharp etc.) — see docs/decisions.md's
// "browser canvas, not server sharp" call for the R2 direct-upload flow.

export interface ThumbnailTarget {
  /** Target crop aspect (width/height). `null` means "never crop" — resize
   * only, preserving the source's own aspect (used for the logo, which is
   * shown with object-fit:contain, never cover). */
  aspect: number | null;
  maxWidth?: number;
  maxHeight?: number;
}

// One entry per upload point — aspect matches exactly the box each image is
// displayed in on the public site, so the default center-crop already looks
// correct without editing.
export const THUMBNAIL_TARGETS = {
  boardItemPhotoWide: { aspect: 4 / 3, maxWidth: 1400 }, // PhotoGrid.tsx GALLERY_MULTI cards
  boardItemPhotoSquare: { aspect: 1, maxWidth: 1400 }, // PhotoGrid.tsx GALLERY_SINGLE tiles
  indexImage: { aspect: 4 / 3, maxWidth: 1400 }, // IndexTab.tsx cover box
  hero: { aspect: 1, maxWidth: 1600 }, // homepage hero box
  logo: { aspect: null, maxHeight: 480 }, // SiteTitleBox.tsx — contain, no crop
} as const satisfies Record<string, ThumbnailTarget>;

export function thumbnailTargetForBoardItemPhoto(kind: "GALLERY_MULTI" | "GALLERY_SINGLE"): ThumbnailTarget {
  return kind === "GALLERY_SINGLE" ? THUMBNAIL_TARGETS.boardItemPhotoSquare : THUMBNAIL_TARGETS.boardItemPhotoWide;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const HEIC_EXTENSION_RE = /\.(heic|heif)$/i;
const HEIC_MIME_RE = /heic|heif/i;

// iPhones default to HEIC and report inconsistent MIME types across OSes
// (sometimes "", sometimes "image/heic") — check both the name and type.
// Converts the *original* too, not just the thumbnail: non-Safari browsers
// can't decode HEIC in <img>/next/image at all, so storing it unconverted
// would render as a broken image for the vast majority of site visitors.
// This is a format-compatibility fix, not a re-compression of the original
// — quality 0.92 keeps it visually lossless.
export async function convertHeicIfNeeded(file: File): Promise<File> {
  const looksHeic = HEIC_EXTENSION_RE.test(file.name) || HEIC_MIME_RE.test(file.type);
  if (!looksHeic) return file;

  const heic2any = (await import("heic2any")).default;
  const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  const blob = Array.isArray(result) ? result[0] : result;
  const newName = file.name.replace(HEIC_EXTENSION_RE, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}

function centerCropRect(srcWidth: number, srcHeight: number, aspect: number): CropRect {
  const srcAspect = srcWidth / srcHeight;
  const width = srcAspect > aspect ? srcHeight * aspect : srcWidth;
  const height = srcAspect > aspect ? srcHeight : srcWidth / aspect;
  return { x: (srcWidth - width) / 2, y: (srcHeight - height) / 2, width, height };
}

function destSizeForTarget(cropWidth: number, cropHeight: number, target: ThumbnailTarget): { width: number; height: number } {
  const maxDim = target.aspect === null ? target.maxHeight : target.maxWidth;
  const sourceDim = target.aspect === null ? cropHeight : cropWidth;
  // Never upscale — a smaller-than-target original just keeps its own size.
  const scale = maxDim ? Math.min(1, maxDim / sourceDim) : 1;
  return { width: Math.round(cropWidth * scale), height: Math.round(cropHeight * scale) };
}

// `cropRect` omitted → auto center-crop to `target.aspect` (default
// behavior); passed in → whatever region the crop editor's user selected.
// `target.aspect === null` (logo) ignores `cropRect` entirely — there's
// nothing to crop, only resize.
export async function generateThumbnailBlob(source: Blob, target: ThumbnailTarget, cropRect?: CropRect): Promise<Blob> {
  const bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
  try {
    const rect =
      target.aspect === null
        ? { x: 0, y: 0, width: bitmap.width, height: bitmap.height }
        : (cropRect ?? centerCropRect(bitmap.width, bitmap.height, target.aspect));
    const { width: destWidth, height: destHeight } = destSizeForTarget(rect.width, rect.height, target);

    const canvas = document.createElement("canvas");
    canvas.width = destWidth;
    canvas.height = destHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("캔버스를 사용할 수 없어요.");
    ctx.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height, 0, 0, destWidth, destHeight);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("썸네일 생성에 실패했어요."))),
        "image/webp",
        0.82
      );
    });
  } finally {
    bitmap.close();
  }
}
