"use client";

import { useRef, useState, useTransition } from "react";
import { toggleNavItemVisibility, reorderNavItems, renameNavItem } from "@/lib/actions/nav-items";
import { renameBoard } from "@/lib/actions/boards";
import { useToast } from "@/components/admin/Toast";

export interface NavVisibilityItem {
  id: string;
  label: string;
  target: string;
  visible: boolean;
  targetKind: string;
  /** Only set when targetKind === "BOARD" — routes rename to renameBoard(boardId, …)
   * instead of renameNavItem(id, …), since Board.name (not NavItem.label) is the
   * name the public site actually renders for board entries. */
  boardId?: string;
}

interface NavVisibilityListProps {
  items: NavVisibilityItem[];
  /** Settings' list is drag-reorderable; Home's quick-toggle list isn't
   * (design/admin-mockup.html's renderHomeVisibility has no drag handle). */
  draggable?: boolean;
}

// Backs both Settings' "메뉴 순서 및 공개" list and Home's "페이지 노출"
// quick-toggle list — both read/write the same NavItem rows, so they can
// never drift out of sync (see design/admin-mockup.html's comment on this).
export function NavVisibilityList({ items: initialItems, draggable = false }: NavVisibilityListProps) {
  const [items, setItems] = useState(initialItems);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleToggle(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, visible: !n.visible } : n)));
    startTransition(async () => {
      await toggleNavItemVisibility(id);
    });
    const item = items.find((n) => n.id === id);
    if (item) toast(`${item.label} ${!item.visible ? "공개" : "비공개"}로 설정했어요`);
  }

  function handleDrop(targetId: string) {
    setDragOverId(null);
    if (!dragId || dragId === targetId) return;
    const next = [...items];
    const fromIndex = next.findIndex((n) => n.id === dragId);
    const toIndex = next.findIndex((n) => n.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setItems(next);
    setDragId(null);
    startTransition(async () => {
      await reorderNavItems(next.map((n) => n.id));
    });
  }

  function commitRename(item: NavVisibilityItem) {
    setRenamingId(null);
    const trimmed = inputRef.current?.value.trim();
    const finalName = trimmed || item.label;
    if (finalName === item.label) return;
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, label: finalName } : n)));
    startTransition(async () => {
      const result =
        item.targetKind === "BOARD" && item.boardId
          ? await renameBoard(item.boardId, finalName)
          : await renameNavItem(item.id, finalName);
      toast(result.message ?? "이름이 바뀌었어요", result.status === "error");
    });
  }

  return (
    <div className="admin-reorder-list">
      {items.map((item) => (
        <div
          key={item.id}
          className={`admin-reorder-row ${dragOverId === item.id ? "drag-over" : ""}`}
          onDragOver={
            draggable
              ? (e) => {
                  e.preventDefault();
                  if (item.id !== dragId) setDragOverId(item.id);
                }
              : undefined
          }
          onDrop={draggable ? () => handleDrop(item.id) : undefined}
        >
          {draggable && (
            <div
              className="admin-reorder-drag-handle"
              draggable
              onDragStart={(e) => {
                setDragId(item.id);
                // draggable=true lives on the handle icon, so the browser's
                // default drag image would just be that icon -- use the whole row.
                const row = e.currentTarget.closest(".admin-reorder-row");
                if (row instanceof HTMLElement) {
                  e.dataTransfer.setDragImage(row, 20, row.offsetHeight / 2);
                }
              }}
              onDragEnd={() => {
                setDragId(null);
                setDragOverId(null);
              }}
              title="드래그해서 순서 변경"
            >
              ⠿
            </div>
          )}
          <div className="admin-reorder-main">
            {renamingId === item.id ? (
              <input
                ref={inputRef}
                className="admin-reorder-name-input"
                defaultValue={item.label}
                maxLength={20}
                autoFocus
                onBlur={() => commitRename(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
              />
            ) : (
              <strong>{item.label}</strong>
            )}
            <span>{item.target}</span>
          </div>
          <button
            type="button"
            className="admin-reorder-rename-btn"
            title={`${item.label} 이름 바꾸기`}
            onClick={() => setRenamingId(item.id)}
          >
            ✏️
          </button>
          <button
            type="button"
            className={`admin-switch ${item.visible ? "on" : ""}`}
            onClick={() => handleToggle(item.id)}
            aria-label={`${item.label} ${item.visible ? "비공개로 전환" : "공개로 전환"}`}
          />
        </div>
      ))}
    </div>
  );
}
