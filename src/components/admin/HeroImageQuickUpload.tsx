"use client";

import { useRef, useState } from "react";
import { updateHeroImage, updateHeroImageThumbnail } from "@/lib/actions/site-settings";
import { uploadImagePairToR2, uploadThumbnailBlob, fetchExistingImageBlob } from "@/lib/admin/upload-client";
import { THUMBNAIL_TARGETS } from "@/lib/admin/thumbnail";
import { ThumbnailCropModal } from "@/components/admin/ThumbnailCropModal";
import { useToast } from "@/components/admin/Toast";

export interface HeroImage {
  r2Key: string;
  /** Original's public URL — used only as the crop editor's source. */
  url: string | null;
  /** Web-optimized derived copy actually rendered; falls back to `url` for
   * a hero uploaded before thumbnails existed. */
  thumbUrl: string | null;
}

interface HeroImageQuickUploadProps {
  heroImage: HeroImage | null;
}

export function HeroImageQuickUpload({ heroImage: initialHeroImage }: HeroImageQuickUploadProps) {
  const [heroImage, setHeroImage] = useState(initialHeroImage);
  const [uploading, setUploading] = useState(false);
  const [cropSource, setCropSource] = useState<Blob | null>(null);
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const target = THUMBNAIL_TARGETS.hero;

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const uploaded = await uploadImagePairToR2(file, { kind: "site", slot: "hero" }, target);
      const result = await updateHeroImage(uploaded.original.r2Key, uploaded.thumb.r2Key);
      setHeroImage({ r2Key: uploaded.original.r2Key, url: uploaded.original.publicUrl, thumbUrl: uploaded.thumb.publicUrl });
      if (result.message) toast(result.message, result.status === "error");
    } catch (err) {
      toast(err instanceof Error ? err.message : "업로드 중 오류가 발생했어요", true);
    } finally {
      setUploading(false);
    }
  }

  async function openThumbnailEditor() {
    if (!heroImage) return;
    try {
      const blob = await fetchExistingImageBlob(heroImage.r2Key);
      setCropSource(blob);
    } catch (err) {
      toast(err instanceof Error ? err.message : "원본을 불러오지 못했어요", true);
    }
  }

  async function handleCropConfirm(thumbBlob: Blob) {
    if (!heroImage) return;
    try {
      const thumb = await uploadThumbnailBlob(thumbBlob, { kind: "site", slot: "hero" });
      const result = await updateHeroImageThumbnail(thumb.r2Key);
      setHeroImage({ ...heroImage, thumbUrl: thumb.publicUrl });
      if (result.message) toast(result.message, result.status === "error");
    } catch (err) {
      toast(err instanceof Error ? err.message : "썸네일 저장에 실패했어요", true);
    } finally {
      setCropSource(null);
    }
  }

  return (
    <div className="admin-hero-photo-wrap">
      <div className="admin-hero-photo">
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImage.thumbUrl ?? heroImage.url ?? undefined} alt="대표 사진" />
        ) : (
          <span className="admin-tag">대표 사진 (1600×1600)</span>
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="admin-hero-edit-btn"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          ✏️ {uploading ? "업로드 중…" : "대표 사진 바꾸기"}
        </button>
        {heroImage && (
          <button type="button" className="admin-hero-edit-btn" onClick={openThumbnailEditor} disabled={uploading}>
            🖼️ 썸네일 편집
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {cropSource && (
        <ThumbnailCropModal
          source={cropSource}
          target={target}
          onConfirm={(thumbBlob) => handleCropConfirm(thumbBlob)}
          onCancel={() => setCropSource(null)}
        />
      )}
    </div>
  );
}
