import { convertHeicIfNeeded, generateThumbnailBlob, type CropRect, type ThumbnailTarget } from "@/lib/admin/thumbnail";

export interface UploadedImage {
  r2Key: string;
  publicUrl: string | null;
  width: number;
  height: number;
}

export interface UploadedThumbnail {
  r2Key: string;
  publicUrl: string | null;
}

export interface UploadedImagePair {
  original: UploadedImage;
  thumb: UploadedThumbnail;
}

export type UploadScope =
  | { kind: "board-item"; boardId: string; itemId: string }
  | { kind: "site"; slot: "hero" | "logo" };

function readImageDimensions(file: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      reject(new Error("이미지를 읽을 수 없어요."));
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  });
}

async function presignAndPut(
  blob: Blob,
  contentType: string,
  scope: UploadScope,
  variant: "original" | "thumb"
): Promise<{ r2Key: string; publicUrl: string | null }> {
  const presignRes = await fetch("/api/admin/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType, scope, variant }),
  });
  if (!presignRes.ok) {
    const body = await presignRes.json().catch(() => ({}));
    throw new Error(body.error ?? "업로드 URL을 받아오지 못했어요.");
  }
  const { uploadUrl, r2Key, publicUrl } = await presignRes.json();

  const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: blob });
  if (!putRes.ok) {
    throw new Error("사진 업로드에 실패했어요.");
  }

  return { r2Key, publicUrl };
}

// Every upload point now stores two objects per image: the original as
// picked (HEIC gets normalized to JPEG first — see convertHeicIfNeeded's
// comment for why that's not optional) and a canvas-derived WebP thumbnail
// cropped to `target`'s aspect. Both PUT in parallel — callers that upload
// several files (PhotoManager) also run these calls in parallel across
// files, fixing what used to be a fully sequential per-file upload loop.
export async function uploadImagePairToR2(
  rawFile: File,
  scope: UploadScope,
  target: ThumbnailTarget,
  cropRect?: CropRect
): Promise<UploadedImagePair> {
  const file = await convertHeicIfNeeded(rawFile);
  const [dims, thumbBlob] = await Promise.all([readImageDimensions(file), generateThumbnailBlob(file, target, cropRect)]);

  const [original, thumb] = await Promise.all([
    presignAndPut(file, file.type, scope, "original"),
    presignAndPut(thumbBlob, "image/webp", scope, "thumb"),
  ]);

  return { original: { ...original, width: dims.width, height: dims.height }, thumb };
}

// Re-crop path: the original already exists in R2, only a freshly-cropped
// thumbnail needs uploading (see ThumbnailCropModal + each upload point's
// "썸네일 편집" button).
export async function uploadThumbnailBlob(blob: Blob, scope: UploadScope): Promise<UploadedThumbnail> {
  return presignAndPut(blob, "image/webp", scope, "thumb");
}

// Re-fetches a previously uploaded original through the admin-only
// same-origin proxy (src/app/api/admin/image-proxy/route.ts) so it can be
// redrawn into a <canvas> for re-cropping — a direct cross-origin fetch of
// the R2 public URL would need bucket-level CORS, which isn't configured
// (see getR2Object's comment in src/lib/storage/r2.ts).
export async function fetchExistingImageBlob(r2Key: string): Promise<Blob> {
  const res = await fetch(`/api/admin/image-proxy?key=${encodeURIComponent(r2Key)}`);
  if (!res.ok) {
    throw new Error("원본 이미지를 불러오지 못했어요.");
  }
  return res.blob();
}
