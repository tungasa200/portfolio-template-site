"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { createBoardItem, updateBoardItem, deleteBoardItem } from "@/lib/actions/board-items";
import type { ActionFormState } from "@/lib/actions/site-settings";
import { MonthPicker } from "@/components/admin/MonthPicker";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { PhotoManager, type ManagedPhoto } from "@/components/admin/PhotoManager";
import { IndexImageUpload, type IndexImage } from "@/components/admin/IndexImageUpload";
import { useToast } from "@/components/admin/Toast";

interface ExistingItem {
  id: string;
  name: string;
  dateValue: string | null;
  isPublished: boolean;
  indexEnabled: boolean;
  indexContent: string | null;
  indexImageEnabled: boolean;
  indexImage: IndexImage | null;
  photos: ManagedPhoto[];
}

interface BoardItemEditorProps {
  boardId: string;
  boardName: string;
  kind: "GALLERY_MULTI" | "GALLERY_SINGLE";
  item: ExistingItem | null;
  adminBasePath: string;
}

const initialState: ActionFormState = { status: "idle" };

// Shared editor for every board's items (GALLERY_MULTI-only sections hidden
// via `kind`), matching design/admin-mockup.html's single-editor-for-every-
// board structure. A NEW item's photo manager works immediately — the first
// photo picked lazily creates the row via PhotoManager's createDraftBoardItem
// call (BoardItemPhoto needs a real boardItemId to attach to, unlike the
// mockup's in-memory-only photo staging), and onPhotoItemCreated below syncs
// this editor onto that row so "저장하기" updates it instead of creating a
// second one.
export function BoardItemEditor({ boardId, boardName, kind, item, adminBasePath }: BoardItemEditorProps) {
  const [currentItem, setCurrentItem] = useState(item);
  const isNew = currentItem === null;
  const isMulti = kind === "GALLERY_MULTI";
  const action = isNew ? createBoardItem : updateBoardItem;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const toast = useToast();
  const [, startTransition] = useTransition();

  // Controlled (not defaultValue+ref): a <form action={...}> resets every
  // uncontrolled field to its defaultValue once the action settles (React's
  // built-in post-action form reset), which would otherwise snap this back
  // to currentItem.name mid-edit — see AGENTS.md bug notes.
  const [name, setName] = useState(currentItem?.name ?? "");
  const [dateValue, setDateValue] = useState(currentItem?.dateValue ?? "");
  const [indexEnabled, setIndexEnabled] = useState(currentItem?.indexEnabled ?? false);
  const [indexContent, setIndexContent] = useState(currentItem?.indexContent ?? "");
  const [indexImageEnabled, setIndexImageEnabled] = useState(currentItem?.indexImageEnabled ?? false);
  const [indexImage, setIndexImage] = useState(currentItem?.indexImage ?? null);
  const [isPublished, setIsPublished] = useState(currentItem?.isPublished ?? false);

  function handlePhotoItemCreated(id: string) {
    setCurrentItem((prev) =>
      prev ??
      {
        id,
        name: name.trim() || "새 항목",
        dateValue: "",
        isPublished: false,
        indexEnabled: false,
        indexContent: "",
        indexImageEnabled: false,
        indexImage: null,
        photos: [],
      }
    );
    // Swap the URL without a real Next.js navigation: router.replace would
    // cross into the [itemId] segment's own loading.tsx Suspense boundary,
    // which unmounts/remounts this whole editor and wipes whatever the user
    // has typed in the (uncontrolled) title input since the draft row was
    // created — see AGENTS.md bug notes. history.replaceState only updates
    // the address bar/back-button target, which is all this transition needs
    // since local state already carries the real id.
    window.history.replaceState(null, "", `${adminBasePath}/board/${boardId}/${id}`);
  }

  // create redirects straight to the new item's edit page on success (no
  // "idle"/"success" state ever reaches here for that path) — this effect
  // only ever fires for an update's success/error or a validation error.
  useEffect(() => {
    if (state.status !== "idle" && state.message) {
      toast(state.message, state.status === "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleDelete() {
    if (!currentItem) return;
    if (!window.confirm(`"${currentItem.name}"을(를) 삭제할까요? 되돌릴 수 없어요.`)) return;
    startTransition(async () => {
      await deleteBoardItem(currentItem.id, boardId);
    });
  }

  return (
    <div className="admin-page">
      <div className="admin-editor-header">
        <Link href={`${adminBasePath}/board/${boardId}`} className="admin-back-btn">
          ← {boardName} 목록으로
        </Link>
      </div>

      <form action={formAction}>
        {isNew ? (
          <input type="hidden" name="boardId" value={boardId} />
        ) : (
          <input type="hidden" name="itemId" value={currentItem.id} />
        )}
        <input type="hidden" name="dateValue" value={dateValue} />
        <input type="hidden" name="indexEnabled" value={String(indexEnabled)} />
        <input type="hidden" name="indexContent" value={indexContent} />
        <input type="hidden" name="indexImageEnabled" value={String(indexImageEnabled)} />
        <input type="hidden" name="isPublished" value={String(isPublished)} />

        <div className="admin-page-head">
          <input
            className="admin-item-title-input"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="새 항목"
            required
            autoFocus={isNew}
          />
        </div>

        <div className="admin-section-card">
          <h2>날짜</h2>
          <MonthPicker value={dateValue} onChange={setDateValue} />
        </div>

        {isMulti && (
          <div className="admin-section-card">
            <div className="admin-toggle-row">
              <div className="admin-toggle-row-text">
                <strong>설명 추가</strong>
              </div>
              <button
                type="button"
                className={`admin-switch ${indexEnabled ? "on" : ""}`}
                onClick={() => setIndexEnabled((v) => !v)}
              />
            </div>
            {indexEnabled && (
              <div style={{ marginTop: 18 }}>
                <RichTextEditor value={indexContent} onChange={setIndexContent} />
                <div className="admin-toggle-row" style={{ marginTop: 18 }}>
                  <div className="admin-toggle-row-text">
                    <strong>설명에 이미지 추가하기</strong>
                  </div>
                  <button
                    type="button"
                    className={`admin-switch ${indexImageEnabled ? "on" : ""}`}
                    onClick={() => setIndexImageEnabled((v) => !v)}
                  />
                </div>
                {indexImageEnabled && (
                  <div style={{ marginTop: 18 }}>
                    <IndexImageUpload
                      boardId={boardId}
                      boardItemId={currentItem?.id ?? null}
                      indexImage={indexImage}
                      onIndexImageChange={setIndexImage}
                      getDraftName={() => name.trim()}
                      onItemCreated={handlePhotoItemCreated}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="admin-section-card">
          <h2>사진</h2>
          <PhotoManager
            boardId={boardId}
            boardItemId={currentItem?.id ?? null}
            kind={kind}
            initialPhotos={currentItem?.photos ?? []}
            getDraftName={() => name.trim()}
            onItemCreated={handlePhotoItemCreated}
          />
        </div>

        <div className="admin-section-card">
          <div className="admin-toggle-row">
            <div className="admin-toggle-row-text">
              <strong>게시물 공개</strong>
            </div>
            <button
              type="button"
              className={`admin-switch ${isPublished ? "on" : ""}`}
              onClick={() => setIsPublished((v) => !v)}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28 }}>
          {currentItem ? (
            <button type="button" className="admin-btn admin-btn-danger-outline" onClick={handleDelete}>
              이 항목 삭제하기
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className="admin-btn admin-btn-primary admin-btn-lg" disabled={isPending}>
            {isPending ? "저장 중…" : "저장하기"}
          </button>
        </div>
      </form>
    </div>
  );
}
