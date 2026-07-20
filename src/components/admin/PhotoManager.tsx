"use client";

import { useRef, useState, useTransition } from "react";
import {
  addBoardItemPhotos,
  removeBoardItemPhoto,
  reorderBoardItemPhotos,
  setPrimaryBoardItemPhoto,
  updateBoardItemPhotoThumbnail,
} from "@/lib/actions/board-item-photos";
import { createDraftBoardItem } from "@/lib/actions/board-items";
import { uploadImagePairToR2, uploadThumbnailBlob, fetchExistingImageBlob } from "@/lib/admin/upload-client";
import { thumbnailTargetForBoardItemPhoto } from "@/lib/admin/thumbnail";
import { ThumbnailCropModal } from "@/components/admin/ThumbnailCropModal";
import { useToast } from "@/components/admin/Toast";

export interface ManagedPhoto {
  id: string;
  r2Key: string;
  /** Original's public URL — used as the crop editor's source, never
   * rendered directly (the tile always shows thumbUrl). */
  url: string | null;
  /** Web-optimized derived copy shown in the grid; falls back to `url` for
   * photos uploaded before thumbnails existed. */
  thumbUrl: string | null;
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
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [cropSource, setCropSource] = useState<Blob | null>(null);
  const [, startTransition] = useTransition();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxPhotos = kind === "GALLERY_SINGLE" ? 1 : null;
  const single = maxPhotos === 1;
  const target = thumbnailTargetForBoardItemPhoto(kind);

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

      // Every file's (original + thumbnail) pair uploads in parallel, and
      // all resulting rows are persisted in one batch call afterward — see
      // addBoardItemPhotos's comment for why a per-file loop used to be
      // both slow (fully sequential) and race-prone (order/isPrimary).
      const scope = { kind: "board-item" as const, boardId, itemId: currentItemId };
      const uploads = await Promise.all(toUpload.map((file) => uploadImagePairToR2(file, scope, target)));
      const result = await addBoardItemPhotos(
        currentItemId,
        uploads.map((u) => ({ r2Key: u.original.r2Key, thumbR2Key: u.thumb.r2Key, width: u.original.width, height: u.original.height }))
      );

      if (result.status === "success") {
        setPhotos((prev) => [
          ...prev,
          ...result.photoIds.map((photoId, i) => ({
            id: photoId,
            r2Key: uploads[i].original.r2Key,
            url: uploads[i].original.publicUrl,
            thumbUrl: uploads[i].thumb.publicUrl,
            isPrimary: prev.length === 0 && i === 0,
          })),
        ]);
        toast(toUpload.length > 1 ? `사진 ${toUpload.length}장을 추가했어요` : "사진을 추가했어요");
      } else {
        toast(result.message, true);
      }
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

  async function openThumbnailEditor(photo: ManagedPhoto) {
    try {
      const blob = await fetchExistingImageBlob(photo.r2Key);
      setCropSource(blob);
      setEditingPhotoId(photo.id);
    } catch (err) {
      toast(err instanceof Error ? err.message : "원본을 불러오지 못했어요", true);
    }
  }

  async function handleCropConfirm(thumbBlob: Blob) {
    if (!editingPhotoId || !itemId) return;
    try {
      const thumb = await uploadThumbnailBlob(thumbBlob, { kind: "board-item", boardId, itemId });
      await updateBoardItemPhotoThumbnail(editingPhotoId, thumb.r2Key);
      setPhotos((prev) => prev.map((p) => (p.id === editingPhotoId ? { ...p, thumbUrl: thumb.publicUrl } : p)));
      toast("썸네일을 다시 잘랐어요");
    } catch (err) {
      toast(err instanceof Error ? err.message : "썸네일 저장에 실패했어요", true);
    } finally {
      setEditingPhotoId(null);
      setCropSource(null);
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
          {(photo.thumbUrl ?? photo.url) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="admin-photo-tile-img" src={photo.thumbUrl ?? photo.url ?? undefined} alt="" />
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
            <button
              type="button"
              className="admin-photo-tile-mini-btn"
              onClick={() => openThumbnailEditor(photo)}
              title="썸네일 편집"
            >
              ✏️
            </button>
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
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        multiple={!single}
        hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {cropSource && (
        <ThumbnailCropModal
          source={cropSource}
          target={target}
          onConfirm={(thumbBlob) => handleCropConfirm(thumbBlob)}
          onCancel={() => {
            setEditingPhotoId(null);
            setCropSource(null);
          }}
        />
      )}
    </div>
  );
}
