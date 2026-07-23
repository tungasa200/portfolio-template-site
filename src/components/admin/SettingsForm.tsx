"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  updateSiteSettings,
  updateHeroImage,
  updateHeroImageThumbnail,
  updateLogoImage,
  removeLogoImage,
} from "@/lib/actions/site-settings";
import type { ActionFormState } from "@/lib/actions/site-settings";
import { uploadImagePairToR2, uploadThumbnailBlob, fetchExistingImageBlob } from "@/lib/admin/upload-client";
import { THUMBNAIL_TARGETS } from "@/lib/admin/thumbnail";
import { ThumbnailCropModal } from "@/components/admin/ThumbnailCropModal";
import { useToast } from "@/components/admin/Toast";
import { SiteTitleBox } from "@/components/site/SiteTitleBox";
import type { HeroImage } from "@/components/admin/HeroImageQuickUpload";

interface SettingsFormProps {
  siteName: string;
  ownerName: string;
  contactEmail: string;
  footerText: string | null;
  heroImage: HeroImage | null;
  logoImageUrl: string | null;
}

const initialState: ActionFormState = { status: "idle" };

export function SettingsForm({
  siteName,
  ownerName,
  contactEmail,
  footerText,
  heroImage: initialHeroImage,
  logoImageUrl,
}: SettingsFormProps) {
  const [state, formAction, isPending] = useActionState(updateSiteSettings, initialState);
  const [heroImage, setHeroImage] = useState(initialHeroImage);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [heroCropSource, setHeroCropSource] = useState<Blob | null>(null);
  const [logoUrl, setLogoUrl] = useState(logoImageUrl);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const heroTarget = THUMBNAIL_TARGETS.hero;

  useEffect(() => {
    if (state.status !== "idle" && state.message) toast(state.message, state.status === "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function handleHeroFile(file: File) {
    setUploadingHero(true);
    try {
      const uploaded = await uploadImagePairToR2(file, { kind: "site", slot: "hero" }, heroTarget);
      const result = await updateHeroImage(uploaded.original.r2Key, uploaded.thumb.r2Key);
      setHeroImage({ r2Key: uploaded.original.r2Key, url: uploaded.original.publicUrl, thumbUrl: uploaded.thumb.publicUrl });
      if (result.message) toast(result.message, result.status === "error");
    } catch (err) {
      toast(err instanceof Error ? err.message : "업로드 중 오류가 발생했어요", true);
    } finally {
      setUploadingHero(false);
    }
  }

  async function openHeroThumbnailEditor() {
    if (!heroImage) return;
    try {
      const blob = await fetchExistingImageBlob(heroImage.r2Key);
      setHeroCropSource(blob);
    } catch (err) {
      toast(err instanceof Error ? err.message : "원본을 불러오지 못했어요", true);
    }
  }

  async function handleHeroCropConfirm(thumbBlob: Blob) {
    if (!heroImage) return;
    try {
      const thumb = await uploadThumbnailBlob(thumbBlob, { kind: "site", slot: "hero" });
      const result = await updateHeroImageThumbnail(thumb.r2Key);
      setHeroImage({ ...heroImage, thumbUrl: thumb.publicUrl });
      if (result.message) toast(result.message, result.status === "error");
    } catch (err) {
      toast(err instanceof Error ? err.message : "썸네일 저장에 실패했어요", true);
    } finally {
      setHeroCropSource(null);
    }
  }

  async function handleLogoFile(file: File) {
    setUploadingLogo(true);
    try {
      const uploaded = await uploadImagePairToR2(file, { kind: "site", slot: "logo" }, THUMBNAIL_TARGETS.logo);
      const result = await updateLogoImage(uploaded.original.r2Key, uploaded.thumb.r2Key);
      setLogoUrl(uploaded.thumb.publicUrl ?? uploaded.original.publicUrl);
      if (result.message) toast(result.message, result.status === "error");
    } catch (err) {
      toast(err instanceof Error ? err.message : "업로드 중 오류가 발생했어요", true);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleLogoRemove() {
    setUploadingLogo(true);
    try {
      const result = await removeLogoImage();
      setLogoUrl(null);
      if (result.message) toast(result.message, result.status === "error");
    } catch (err) {
      toast(err instanceof Error ? err.message : "제거 중 오류가 발생했어요", true);
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <>
      <form action={formAction}>
        <div className="admin-section-card">
          <h2>기본 정보</h2>
          <div className="admin-field-row">
            <div className="admin-field">
              <label>사이트 이름</label>
              <input type="text" name="siteName" defaultValue={siteName} required />
            </div>
            <div className="admin-field">
              <label>이름</label>
              <input type="text" name="ownerName" defaultValue={ownerName} required />
            </div>
            <div className="admin-field">
              <label>이메일</label>
              <input type="email" name="contactEmail" defaultValue={contactEmail} required />
            </div>
            <div className="admin-field">
              <label>
                하단 문구 <span style={{ fontWeight: 400, color: "var(--muted)" }}>(선택)</span>
              </label>
              <input type="text" name="footerText" defaultValue={footerText ?? ""} placeholder="© 2026 ALL RIGHTS RESERVED" />
            </div>
          </div>
          <div className="admin-card-footer">
            <button type="submit" className="admin-btn admin-btn-primary admin-btn-lg" disabled={isPending}>
              {isPending ? "저장 중…" : "저장하기"}
            </button>
          </div>
        </div>
      </form>

      <div className="admin-branding-row">
        <div className="admin-section-card">
          <h2>대표 이미지</h2>
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
                disabled={uploadingHero}
              >
                ✏️ {uploadingHero ? "업로드 중…" : "대표 사진 바꾸기"}
              </button>
              {heroImage && (
                <button type="button" className="admin-hero-edit-btn" onClick={openHeroThumbnailEditor} disabled={uploadingHero}>
                  🖼️ 썸네일 편집
                </button>
              )}
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleHeroFile(file);
              e.target.value = "";
            }}
          />
          {heroCropSource && (
            <ThumbnailCropModal
              source={heroCropSource}
              target={heroTarget}
              onConfirm={(thumbBlob) => handleHeroCropConfirm(thumbBlob)}
              onCancel={() => setHeroCropSource(null)}
            />
          )}
        </div>

        <div className="admin-section-card">
          <h2>메뉴 로고</h2>
          <div className="admin-logo-editor">
            <div className="admin-logo-preview">
              <SiteTitleBox
                siteName={siteName || "사이트 이름"}
                logoUrl={logoUrl}
                textClassName="text-2xl tracking-wide"
                textStyle={{ color: "#fff", fontFamily: "var(--font-playfair, serif)" }}
              />
            </div>
            <div className="admin-logo-editor-actions">
              <button
                type="button"
                className="admin-logo-btn"
                onClick={() => logoFileRef.current?.click()}
                disabled={uploadingLogo}
              >
                ✏️ {uploadingLogo ? "처리 중…" : "로고 이미지 업로드"}
              </button>
              {logoUrl && (
                <button
                  type="button"
                  className="admin-logo-btn"
                  onClick={handleLogoRemove}
                  disabled={uploadingLogo}
                >
                  되돌리기
                </button>
              )}
            </div>
          </div>
          <input
            ref={logoFileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleLogoFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </>
  );
}
