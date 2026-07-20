"use client";

import { useRef, useState } from "react";
import { updateHeroImage } from "@/lib/actions/site-settings";
import { uploadImageToR2 } from "@/lib/admin/upload-client";
import { useToast } from "@/components/admin/Toast";

interface HeroImageQuickUploadProps {
  heroImageUrl: string | null;
}

export function HeroImageQuickUpload({ heroImageUrl }: HeroImageQuickUploadProps) {
  const [heroUrl, setHeroUrl] = useState(heroImageUrl);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const uploaded = await uploadImageToR2(file, { kind: "site", slot: "hero" });
      const result = await updateHeroImage(uploaded.r2Key);
      setHeroUrl(uploaded.publicUrl);
      if (result.message) toast(result.message, result.status === "error");
    } catch (err) {
      toast(err instanceof Error ? err.message : "업로드 중 오류가 발생했어요", true);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="admin-hero-photo-wrap">
      <div className="admin-hero-photo">
        {heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroUrl} alt="대표 사진" />
        ) : (
          <span className="admin-tag">대표 사진 (1600×1600)</span>
        )}
      </div>
      <button
        type="button"
        className="admin-hero-edit-btn"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        ✏️ {uploading ? "업로드 중…" : "대표 사진 바꾸기"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
