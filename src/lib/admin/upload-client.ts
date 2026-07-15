export interface UploadedImage {
  r2Key: string;
  publicUrl: string | null;
  width: number;
  height: number;
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
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

// Client captures width/height via Image() decode before requesting the
// presign (per docs/roadmap.md's R2 upload flow), then uploads directly to
// R2 with the presigned PUT URL from POST /api/admin/upload-url — the
// browser never round-trips the file bytes through our own server.
export async function uploadImageToR2(file: File, scope: "board-items" | "site"): Promise<UploadedImage> {
  const dims = await readImageDimensions(file);

  const presignRes = await fetch("/api/admin/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type, scope }),
  });
  if (!presignRes.ok) {
    const body = await presignRes.json().catch(() => ({}));
    throw new Error(body.error ?? "업로드 URL을 받아오지 못했어요.");
  }
  const { uploadUrl, r2Key, publicUrl } = await presignRes.json();

  const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!putRes.ok) {
    throw new Error("사진 업로드에 실패했어요.");
  }

  return { r2Key, publicUrl, width: dims.width, height: dims.height };
}
