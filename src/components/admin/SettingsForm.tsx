"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateSiteSettings, updateHeroImage } from "@/lib/actions/site-settings";
import type { ActionFormState } from "@/lib/actions/site-settings";
import { uploadImageToR2 } from "@/lib/admin/upload-client";
import { useToast } from "@/components/admin/Toast";

interface SettingsFormProps {
  siteName: string;
  photographerName: string;
  contactEmail: string;
  footerText: string | null;
  heroImageUrl: string | null;
}

const initialState: ActionFormState = { status: "idle" };

export function SettingsForm({ siteName, photographerName, contactEmail, footerText, heroImageUrl }: SettingsFormProps) {
  const [state, formAction, isPending] = useActionState(updateSiteSettings, initialState);
  const [heroUrl, setHeroUrl] = useState(heroImageUrl);
  const [uploadingHero, setUploadingHero] = useState(false);
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.status !== "idle" && state.message) toast(state.message, state.status === "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function handleHeroFile(file: File) {
    setUploadingHero(true);
    try {
      const uploaded = await uploadImageToR2(file, "site");
      const result = await updateHeroImage(uploaded.r2Key);
      setHeroUrl(uploaded.publicUrl);
      if (result.message) toast(result.message, result.status === "error");
    } catch (err) {
      toast(err instanceof Error ? err.message : "업로드 중 오류가 발생했어요", true);
    } finally {
      setUploadingHero(false);
    }
  }

  return (
    <>
      <div className="admin-section-card">
        <h2>대표 이미지</h2>
        <p className="admin-section-desc">홈 화면 대표 사진이에요.</p>
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
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
          <button type="submit" className="admin-btn admin-btn-primary admin-btn-lg" disabled={isPending}>
            {isPending ? "저장 중…" : "저장하기"}
          </button>
        </div>
      </form>
    </>
  );
}
