"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateSiteSettings, updateHeroImage, updateLogoImage, removeLogoImage } from "@/lib/actions/site-settings";
import type { ActionFormState } from "@/lib/actions/site-settings";
import { uploadImageToR2 } from "@/lib/admin/upload-client";
import { useToast } from "@/components/admin/Toast";
import { SiteTitleBox } from "@/components/site/SiteTitleBox";

interface SettingsFormProps {
  siteName: string;
  photographerName: string;
  contactEmail: string;
  footerText: string | null;
  heroImageUrl: string | null;
  logoImageUrl: string | null;
}

const initialState: ActionFormState = { status: "idle" };

export function SettingsForm({
  siteName,
  photographerName,
  contactEmail,
  footerText,
  heroImageUrl,
  logoImageUrl,
}: SettingsFormProps) {
  const [state, formAction, isPending] = useActionState(updateSiteSettings, initialState);
  const [heroUrl, setHeroUrl] = useState(heroImageUrl);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [logoUrl, setLogoUrl] = useState(logoImageUrl);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.status !== "idle" && state.message) toast(state.message, state.status === "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function handleHeroFile(file: File) {
    setUploadingHero(true);
    try {
      const uploaded = await uploadImageToR2(file, { kind: "site", slot: "hero" });
      const result = await updateHeroImage(uploaded.r2Key);
      setHeroUrl(uploaded.publicUrl);
      if (result.message) toast(result.message, result.status === "error");
    } catch (err) {
      toast(err instanceof Error ? err.message : "업로드 중 오류가 발생했어요", true);
    } finally {
      setUploadingHero(false);
    }
  }

  async function handleLogoFile(file: File) {
    setUploadingLogo(true);
    try {
      const uploaded = await uploadImageToR2(file, { kind: "site", slot: "logo" });
      const result = await updateLogoImage(uploaded.r2Key);
      setLogoUrl(uploaded.publicUrl);
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
              <input type="text" name="photographerName" defaultValue={photographerName} required />
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
              disabled={uploadingHero}
            >
              ✏️ {uploadingHero ? "업로드 중…" : "대표 사진 바꾸기"}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleHeroFile(file);
              e.target.value = "";
            }}
          />
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
            accept="image/jpeg,image/png,image/webp"
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
