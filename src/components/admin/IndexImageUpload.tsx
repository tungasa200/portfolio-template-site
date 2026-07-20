"use client";

import { useRef, useState } from "react";
import {
  createDraftBoardItem,
  setBoardItemIndexImage,
  removeBoardItemIndexImage,
  updateBoardItemIndexImageThumbnail,
} from "@/lib/actions/board-items";
import { uploadImagePairToR2, uploadThumbnailBlob, fetchExistingImageBlob } from "@/lib/admin/upload-client";
import { THUMBNAIL_TARGETS } from "@/lib/admin/thumbnail";
import { ThumbnailCropModal } from "@/components/admin/ThumbnailCropModal";
import { useToast } from "@/components/admin/Toast";

export interface IndexImage {
  r2Key: string;
  /** Original's public URL — used only as the crop editor's source. */
  url: string | null;
  /** Web-optimized derived copy shown in the tile; falls back to `url` for
   * an image uploaded before thumbnails existed. */
  thumbUrl: string | null;
}

interface IndexImageUploadProps {
  boardId: string;
  // null for a not-yet-saved item — mirrors PhotoManager's lazy draft-create
  // contract (see BoardItemEditor's getDraftName/onItemCreated).
  boardItemId: string | null;
  // Controlled (like indexContent/dateValue elsewhere in BoardItemEditor),
  // not local state: this section unmounts whenever the admin toggles
  // "설명에 이미지 추가하기" off, so an internally-owned image would
  // reset to the stale initial prop on the next toggle-on instead of
  // reflecting an upload that happened earlier this session.
  indexImage: IndexImage | null;
  onIndexImageChange: (image: IndexImage | null) => void;
  getDraftName?: () => string;
  onItemCreated?: (id: string) => void;
}

// Single-image slot for the INDEX tab's cover photo — deliberately separate
// from PhotoManager (the body/GRID VIEW photos): no ordering, no "primary"
// concept, just one image the admin opts into independently of whatever
// photos (if any) are attached in the "사진" section above.
export function IndexImageUpload({
  boardId,
  boardItemId,
  indexImage,
  onIndexImageChange,
  getDraftName,
  onItemCreated,
}: IndexImageUploadProps) {
  const [itemId, setItemId] = useState(boardItemId);
  const [uploading, setUploading] = useState(false);
  const [cropSource, setCropSource] = useState<Blob | null>(null);
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const target = THUMBNAIL_TARGETS.indexImage;

  async function handleFile(file: File | undefined) {
    if (!file) return;
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

      const scope = { kind: "board-item" as const, boardId, itemId: currentItemId };
      const uploaded = await uploadImagePairToR2(file, scope, target);
      const result = await setBoardItemIndexImage(currentItemId, uploaded.original.r2Key, uploaded.thumb.r2Key);
      if (result.status === "success") {
        onIndexImageChange({ r2Key: uploaded.original.r2Key, url: uploaded.original.publicUrl, thumbUrl: uploaded.thumb.publicUrl });
      } else {
        toast(result.message, true);
      }

      if (currentItemId !== boardItemId) onItemCreated?.(currentItemId);
    } catch (err) {
      toast(err instanceof Error ? err.message : "업로드 중 오류가 발생했어요", true);
    } finally {
      setUploading(false);
    }
  }

  async function openThumbnailEditor() {
    if (!indexImage) return;
    try {
      const blob = await fetchExistingImageBlob(indexImage.r2Key);
      setCropSource(blob);
    } catch (err) {
      toast(err instanceof Error ? err.message : "원본을 불러오지 못했어요", true);
    }
  }

  async function handleCropConfirm(thumbBlob: Blob) {
    if (!itemId || !indexImage) return;
    try {
      const thumb = await uploadThumbnailBlob(thumbBlob, { kind: "board-item", boardId, itemId });
      await updateBoardItemIndexImageThumbnail(itemId, thumb.r2Key);
      onIndexImageChange({ ...indexImage, thumbUrl: thumb.publicUrl });
      toast("썸네일을 다시 잘랐어요");
    } catch (err) {
      toast(err instanceof Error ? err.message : "썸네일 저장에 실패했어요", true);
    } finally {
      setCropSource(null);
    }
  }

  async function remove() {
    if (!itemId) return;
    onIndexImageChange(null);
    try {
      await removeBoardItemIndexImage(itemId);
    } catch (err) {
      toast(err instanceof Error ? err.message : "이미지 삭제 중 오류가 발생했어요", true);
    }
  }

  return (
    <div className="admin-photo-manager-grid">
      {indexImage ? (
        <div className="admin-photo-tile is-square">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="admin-photo-tile-img" src={indexImage.thumbUrl ?? indexImage.url ?? undefined} alt="" />
          <div className="admin-photo-tile-actions">
            <button type="button" className="admin-photo-tile-mini-btn" onClick={openThumbnailEditor} title="썸네일 편집">
              ✏️
            </button>
            <button type="button" className="admin-photo-tile-mini-btn remove" onClick={remove} title="삭제">
              ✕
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="admin-photo-tile-add is-square"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <div className="admin-plus-circle">＋</div>
          <span style={{ fontSize: 13 }}>{uploading ? "업로드 중…" : "이미지 추가"}</span>
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        hidden
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
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
