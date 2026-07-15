"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { reorderBoardItems, toggleBoardItemPublished } from "@/lib/actions/board-items";
import { useToast } from "@/components/admin/Toast";

export interface BoardGridItem {
  id: string;
  name: string;
  dateLabel: string;
  isPublished: boolean;
  thumbnailUrl: string | null;
}

interface BoardItemGridProps {
  boardId: string;
  kind: "GALLERY_MULTI" | "GALLERY_SINGLE";
  items: BoardGridItem[];
}

// GALLERY_SINGLE boards drop the title/date row and become square tiles —
// see design/admin-mockup.html's siteCard() comment: a one-photo-per-item
// gallery reads as a pure image wall, name/date move to a hover tooltip.
export function BoardItemGrid({ boardId, kind, items: initialItems }: BoardItemGridProps) {
  const [items, setItems] = useState(initialItems);
  const [reorderMode, setReorderMode] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const toast = useToast();
  const showBody = kind !== "GALLERY_SINGLE";

  function toggleReorderMode() {
    if (reorderMode) toast("순서가 저장됐어요");
    setReorderMode((v) => !v);
  }

  function handleDrop(targetId: string) {
    setDragOverId(null);
    if (!dragId || dragId === targetId) return;
    const next = [...items];
    const fromIndex = next.findIndex((i) => i.id === dragId);
    const toIndex = next.findIndex((i) => i.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setItems(next);
    setDragId(null);
    startTransition(async () => {
      await reorderBoardItems(boardId, next.map((i) => i.id));
    });
  }

  function handleTogglePublished(item: BoardGridItem) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isPublished: !i.isPublished } : i)));
    startTransition(async () => {
      await toggleBoardItemPublished(item.id);
    });
    toast(!item.isPublished ? `"${item.name}" 공개로 전환했어요` : `"${item.name}" 비공개로 전환했어요`);
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 20 }}>
        <button type="button" className={`admin-btn ${reorderMode ? "admin-btn-primary" : ""}`} onClick={toggleReorderMode}>
          {reorderMode ? "완료" : "순서 변경"}
        </button>
        <Link href={`/board/${boardId}/new`} className="admin-btn admin-btn-primary">
          + NEW
        </Link>
      </div>

      <div className="admin-site-grid">
        {items.map((item) => (
          <div
            key={item.id}
            className={`admin-site-card ${reorderMode ? "is-draggable" : ""} ${dragOverId === item.id ? "drag-over" : ""} ${dragId === item.id ? "is-dragging" : ""}`}
            title={showBody ? undefined : `${item.name} · ${item.dateLabel}`}
            draggable={reorderMode}
            onDragStart={() => setDragId(item.id)}
            onDragOver={(e) => {
              if (!reorderMode) return;
              e.preventDefault();
              if (item.id !== dragId) setDragOverId(item.id);
            }}
            onDrop={() => reorderMode && handleDrop(item.id)}
            onDragEnd={() => {
              setDragId(null);
              setDragOverId(null);
            }}
          >
            {reorderMode ? (
              <div className="admin-site-card-drag-handle" title="드래그해서 순서 변경">
                ⠿
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className={`admin-site-card-toggle ${item.isPublished ? "is-published" : ""}`}
                  onClick={() => handleTogglePublished(item)}
                  title={item.isPublished ? "비공개로 전환" : "공개로 전환"}
                >
                  {item.isPublished ? "공개" : "비공개"}
                </button>
                <Link href={`/board/${boardId}/${item.id}`} className="admin-site-card-edit" title="수정하기">
                  ✏️
                </Link>
              </>
            )}
            <div className={`admin-site-card-photo ${showBody ? "" : "is-square"}`}>
              {item.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.thumbnailUrl} alt="" />
              )}
            </div>
            {showBody && (
              <div className="admin-site-card-body">
                <span className="admin-site-card-title">{item.name}</span>
                <span className="admin-site-card-meta">{item.dateLabel}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
