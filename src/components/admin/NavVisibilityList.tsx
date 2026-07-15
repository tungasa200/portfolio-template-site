"use client";

import { useState, useTransition } from "react";
import { toggleNavItemVisibility, reorderNavItems } from "@/lib/actions/nav-items";
import { useToast } from "@/components/admin/Toast";

export interface NavVisibilityItem {
  id: string;
  label: string;
  target: string;
  visible: boolean;
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
  const [, startTransition] = useTransition();
  const toast = useToast();

  function handleToggle(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, visible: !n.visible } : n)));
    startTransition(async () => {
      await toggleNavItemVisibility(id);
    });
    const item = items.find((n) => n.id === id);
    if (item) toast(`${item.label} ${!item.visible ? "공개" : "비공개"}로 설정했어요`);
  }

  function handleDrop(targetId: string) {
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

  return (
    <div className="admin-reorder-list">
      {items.map((item) => (
        <div
          key={item.id}
          className="admin-reorder-row"
          onDragOver={draggable ? (e) => e.preventDefault() : undefined}
          onDrop={draggable ? () => handleDrop(item.id) : undefined}
        >
          {draggable && (
            <div
              className="admin-reorder-drag-handle"
              draggable
              onDragStart={() => setDragId(item.id)}
              onDragEnd={() => setDragId(null)}
              title="드래그해서 순서 변경"
            >
              ⠿
            </div>
          )}
          <div className="admin-reorder-main">
            <strong>{item.label}</strong>
            <span>{item.target}</span>
          </div>
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
