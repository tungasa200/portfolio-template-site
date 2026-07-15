"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { updateAboutContent, renameAboutPage } from "@/lib/actions/about";
import type { ActionFormState } from "@/lib/actions/site-settings";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { useToast } from "@/components/admin/Toast";

interface AboutEditorProps {
  navItemId: string;
  initialName: string;
  initialContent: string;
}

const initialState: ActionFormState = { status: "idle" };

export function AboutEditor({ navItemId, initialName, initialContent }: AboutEditorProps) {
  const [name, setName] = useState(initialName);
  const [renaming, setRenaming] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [state, formAction, isPending] = useActionState(updateAboutContent, initialState);
  const [, startTransition] = useTransition();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.status !== "idle" && state.message) toast(state.message, state.status === "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function commitRename() {
    setRenaming(false);
    const trimmed = inputRef.current?.value.trim();
    const finalName = trimmed || name;
    setName(finalName);
    if (finalName !== name) {
      startTransition(async () => {
        const result = await renameAboutPage(navItemId, finalName);
        toast(result.message ?? "이름이 바뀌었어요", result.status === "error");
      });
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <span className="admin-page-eyebrow">/about</span>
        <div className="admin-page-title-row">
          {renaming ? (
            <input
              ref={inputRef}
              className="admin-title-input"
              defaultValue={name}
              maxLength={20}
              autoFocus
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
          ) : (
            <h1 className="admin-page-title">{name}</h1>
          )}
          <button type="button" className="admin-rename-btn" title="이 페이지 이름 바꾸기" onClick={() => setRenaming(true)}>
            ✏️
          </button>
        </div>
      </div>

      <form action={formAction}>
        <input type="hidden" name="content" value={content} />
        <RichTextEditor value={content} onChange={setContent} />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <button type="submit" className="admin-btn admin-btn-primary admin-btn-lg" disabled={isPending}>
            {isPending ? "저장 중…" : "저장하기"}
          </button>
        </div>
      </form>
    </div>
  );
}
