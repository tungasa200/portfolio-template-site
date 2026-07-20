"use client";

import { useRef, useState, useTransition } from "react";
import {
  addBoardItemPhoto,
  removeBoardItemPhoto,
  reorderBoardItemPhotos,
  setPrimaryBoardItemPhoto,
} from "@/lib/actions/board-item-photos";
import { createDraftBoardItem } from "@/lib/actions/board-items";
import { uploadImageToR2 } from "@/lib/admin/upload-client";
import { useToast } from "@/components/admin/Toast";

export interface ManagedPhoto {
  id: string;
  url: string | null;
  isPrimary: boolean;
}

interface PhotoManagerProps {
  boardId: string;
  // null for a not-yet-saved item — the first photo picked lazily creates
  // the row (see getDraftName/onItemCreated) instead of requiring a save first.
  boardItemId: string | null;
  kind: "GALLERY_MULTI" | "GALLERY_SINGLE";
  initialPhotos: ManagedPhoto[];
  getDraftName?: () => string;
  onItemCreated?: (id: string) => void;
}

// maxPhotos caps a GALLERY_SINGLE board's items at exactly 1 (mirrors
// design/admin-mockup.html's editorPhotoMax) — hides the add tile once full
// and hides the badge/order controls since there's nothing to pick a
// thumbnail among. The server action re-enforces this cap independently
// (src/lib/actions/board-item-photos.ts) since a client-side cap is UX, not
// a security boundary.
export function PhotoManager({ boardId, boardItemId, kind, initialPhotos, getDraftName, onItemCreated }: PhotoManagerProps) {
  const [itemId, setItemId] = useState(boardItemId);
  const [photos, setPhotos] = useState(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [, startTransition] = useTransition();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxPhotos = kind === "GALLERY_SINGLE" ? 1 : null;
  const single = maxPhotos === 1;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const room = maxPhotos ? Math.max(maxPhotos - photos.length, 0) : files.length;
    const toUpload = files.slice(0, room);
    if (toUpload.length < files.length) {
      toast("이 게시판은 사진을 1장만 추가할 수 있어요", true);
    }
    if (toUpload.length === 0) return;

    setUploading(true);
    try {
      let currentItemId = itemId;
      if (!currentItemId) {
        const result = await createDraftBoardItem(boardId, getDraftName?.() ?? "");
        if ("error" in result) {
          toast(result.error, true);
          return;
        }
        currentItemId = result.id;
        setItemId(currentItemId);
      }

      for (const file of toUpload) {
        const uploaded = await uploadImageToR2(file, { kind: "board-item", boardId, itemId: currentItemId });
        const result = await addBoardItemPhoto(currentItemId, uploaded.r2Key, uploaded.width, uploaded.height);
        if (result.status === "success" && result.photoId) {
          setPhotos((prev) => [
            ...prev,
            { id: result.photoId!, url: uploaded.publicUrl, isPrimary: prev.length === 0 },
          ]);
        } else {
          toast(result.message ?? "사진 추가에 실패했어요", true);
        }
      }
      if (toUpload.length > 0) toast(toUpload.length > 1 ? `사진 ${toUpload.length}장을 추가했어요` : "사진을 추가했어요");
      // Fires only after the whole batch has persisted, so the parent's
      // URL/isNew swap (see BoardItemEditor) can't unmount this component
      // mid-upload.
      if (currentItemId !== boardItemId) onItemCreated?.(currentItemId);
    } catch (err) {
      toast(err instanceof Error ? err.message : "업로드 중 오류가 발생했어요", true);
    } finally {
      setUploading(false);
    }
  }

  function movePhoto(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    [next[index], next[j]] = [next[j], next[index]];
    setPhotos(next);
    startTransition(async () => {
      await reorderBoardItemPhotos(itemId!, next.map((p) => p.id));
    });
  }

  function setPrimary(id: string) {
    setPhotos((prev) => prev.map((p) => ({ ...p, isPrimary: p.id === id })));
    startTransition(async () => {
      await setPrimaryBoardItemPhoto(itemId!, id);
    });
    toast("대표 사진으로 지정했어요");
  }

  function remove(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    startTransition(async () => {
      await removeBoardItemPhoto(id);
    });
  }

  return (
    <div className="admin-photo-manager-grid">
      {photos.map((photo, idx) => (
        <div key={photo.id} className={`admin-photo-tile ${photo.isPrimary ? "is-active" : ""} ${single ? "is-square" : ""}`}>
          {photo.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="admin-photo-tile-img" src={photo.url} alt="" />
          )}
          {!single && (
            <button
              type="button"
              className={`admin-photo-tile-badge ${photo.isPrimary ? "active" : ""}`}
              onClick={() => setPrimary(photo.id)}
              title="대표 사진으로 지정"
            >
              대표
            </button>
          )}
          {!single && (
            <div className="admin-photo-tile-order">
              <button
                type="button"
                className="admin-photo-tile-mini-btn"
                disabled={idx === 0}
                onClick={() => movePhoto(idx, -1)}
                title="앞으로"
              >
                ◀
              </button>
              <button
                type="button"
                className="admin-photo-tile-mini-btn"
                disabled={idx === photos.length - 1}
                onClick={() => movePhoto(idx, 1)}
                title="뒤로"
              >
                ▶
              </button>
            </div>
          )}
          <div className="admin-photo-tile-actions">
            <button type="button" className="admin-photo-tile-mini-btn remove" onClick={() => remove(photo.id)} title="삭제">
              ✕
            </button>
          </div>
        </div>
      ))}
      {(!maxPhotos || photos.length < maxPhotos) && (
        <button
          type="button"
          className={`admin-photo-tile-add ${single ? "is-square" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <div className="admin-plus-circle">＋</div>
          <span style={{ fontSize: 13 }}>{uploading ? "업로드 중…" : "사진 추가"}</span>
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={!single}
        hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
