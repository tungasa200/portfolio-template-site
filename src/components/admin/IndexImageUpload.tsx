"use client";

import { useRef, useState } from "react";
import { createDraftBoardItem, setBoardItemIndexImage, removeBoardItemIndexImage } from "@/lib/actions/board-items";
import { uploadImageToR2 } from "@/lib/admin/upload-client";
import { useToast } from "@/components/admin/Toast";

interface IndexImageUploadProps {
  boardId: string;
  // null for a not-yet-saved item — mirrors PhotoManager's lazy draft-create
  // contract (see BoardItemEditor's getDraftName/onItemCreated).
  boardItemId: string | null;
  // Controlled (like indexContent/dateValue elsewhere in BoardItemEditor),
  // not local state: this section unmounts whenever the admin toggles
  // "설명에 이미지 추가하기" off, so an internally-owned imageUrl would
  // reset to the stale initial prop on the next toggle-on instead of
  // reflecting an upload that happened earlier this session.
  imageUrl: string | null;
  onImageUrlChange: (url: string | null) => void;
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
  imageUrl,
  onImageUrlChange,
  getDraftName,
  onItemCreated,
}: IndexImageUploadProps) {
  const [itemId, setItemId] = useState(boardItemId);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      const uploaded = await uploadImageToR2(file, { kind: "board-item", boardId, itemId: currentItemId });
      const result = await setBoardItemIndexImage(currentItemId, uploaded.r2Key);
      if (result.status === "success") {
        onImageUrlChange(uploaded.publicUrl);
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

  async function remove() {
    if (!itemId) return;
    onImageUrlChange(null);
    try {
      await removeBoardItemIndexImage(itemId);
    } catch (err) {
      toast(err instanceof Error ? err.message : "이미지 삭제 중 오류가 발생했어요", true);
    }
  }

  return (
    <div className="admin-photo-manager-grid">
      {imageUrl ? (
        <div className="admin-photo-tile is-square">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="admin-photo-tile-img" src={imageUrl} alt="" />
          <div className="admin-photo-tile-actions">
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
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
