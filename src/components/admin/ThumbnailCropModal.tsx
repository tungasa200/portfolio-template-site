"use client";

import { useEffect, useMemo, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { generateThumbnailBlob, type CropRect, type ThumbnailTarget } from "@/lib/admin/thumbnail";

interface ThumbnailCropModalProps {
  /** The pixel source to crop from — either the in-memory File just picked,
   * or a Blob fetched from /api/admin/image-proxy for an already-uploaded
   * photo (see PhotoManager's "썸네일 편집" button). Callers own getting a
   * Blob either way so this component doesn't need to know which. */
  source: Blob;
  /** Caller guarantees target.aspect is non-null — nothing to open a
   * crop editor for on a contain-fit slot like the logo. */
  target: ThumbnailTarget;
  onConfirm: (thumbBlob: Blob, cropRect: CropRect) => void;
  onCancel: () => void;
}

// Reuses the admin-modal-* classes already established by MessagesInbox.tsx
// (admin.css:368-382) so this doesn't introduce a second modal style.
export function ThumbnailCropModal({ source, target, onConfirm, onCancel }: ThumbnailCropModalProps) {
  const aspect = target.aspect ?? 1;
  const objectUrl = useMemo(() => URL.createObjectURL(source), [source]);
  useEffect(() => () => URL.revokeObjectURL(objectUrl), [objectUrl]);

  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const rect: CropRect = croppedAreaPixels;
      const blob = await generateThumbnailBlob(source, target, rect);
      onConfirm(blob, rect);
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="admin-modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="admin-modal-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="admin-modal-close-btn" onClick={onCancel} aria-label="닫기">
          ✕
        </button>
        <h2 style={{ marginBottom: 16 }}>썸네일 편집</h2>
        <div style={{ position: "relative", width: "100%", height: 360, background: "var(--panel-2)" }}>
          <Cropper
            image={objectUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_area, pixels) => setCroppedAreaPixels(pixels)}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20 }}>
          <span style={{ fontSize: 13.5, color: "var(--muted)" }}>확대</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ flex: 1 }}
          />
        </div>
        <div className="admin-card-footer" style={{ marginTop: 20 }}>
          <button type="button" className="admin-btn" onClick={onCancel} disabled={saving}>
            취소
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary admin-btn-lg"
            onClick={handleConfirm}
            disabled={saving || !croppedAreaPixels}
          >
            {saving ? "적용 중…" : "적용하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
