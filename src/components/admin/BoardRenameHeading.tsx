"use client";

import { useRef, useState, useTransition } from "react";
import { renameBoard } from "@/lib/actions/boards";
import { useToast } from "@/components/admin/Toast";

interface BoardRenameHeadingProps {
  boardId: string;
  seq: number;
  name: string;
  kindLabel: string;
}

export function BoardRenameHeading({ boardId, seq, name: initialName, kindLabel }: BoardRenameHeadingProps) {
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  function commit() {
    setEditing(false);
    const trimmed = inputRef.current?.value.trim();
    const finalName = trimmed || name;
    setName(finalName);
    if (finalName !== initialName) {
      startTransition(async () => {
        const result = await renameBoard(boardId, finalName);
        toast(result.message ?? "이름이 바뀌었어요", result.status === "error");
      });
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span className="admin-page-eyebrow" style={{ marginBottom: 0 }}>
          /board/{seq}
        </span>
        <span className="admin-board-kind-badge">{kindLabel}</span>
      </div>
      <div className="admin-page-title-row">
        {editing ? (
          <input
            ref={inputRef}
            className="admin-title-input"
            defaultValue={name}
            maxLength={20}
            autoFocus
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
        ) : (
          <h1 className="admin-page-title">{name}</h1>
        )}
        <button type="button" className="admin-rename-btn" title="이 게시판 이름 바꾸기" onClick={() => setEditing(true)}>
          ✏️
        </button>
      </div>
    </div>
  );
}
