"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { useState } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

// Visual/HTML-source toggle over a real editor library (Tiptap), per
// docs/roadmap.md's explicit note that the mockup's contentEditable-only
// approach isn't sufficient for real code. Shared by the About page and
// each GALLERY_MULTI board item's optional INDEX tab (see
// prisma/schema.prisma's AboutPage.content / BoardItem.indexContent —
// both "trusted admin-authored rich HTML").
export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [showCode, setShowCode] = useState(false);
  const [codeValue, setCodeValue] = useState(value);

  const editor = useEditor({
    extensions: [StarterKit, Underline, Link.configure({ openOnClick: false })],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "admin-editor-canvas" },
    },
  });

  function toggleCode() {
    if (!editor) return;
    if (showCode) {
      editor.commands.setContent(codeValue);
      onChange(editor.getHTML());
      setShowCode(false);
    } else {
      setCodeValue(editor.getHTML());
      setShowCode(true);
    }
  }

  function insertLink() {
    if (!editor) return;
    const url = window.prompt("링크 URL을 입력해주세요");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  }

  return (
    <div className="admin-rich-editor">
      <div className="admin-editor-toolbar">
        <button
          type="button"
          className={`admin-editor-tool ${editor?.isActive("bold") ? "is-active" : ""}`}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          title="굵게"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className={`admin-editor-tool ${editor?.isActive("italic") ? "is-active" : ""}`}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          title="기울임"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className={`admin-editor-tool ${editor?.isActive("underline") ? "is-active" : ""}`}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          title="밑줄"
          style={{ textDecoration: "underline" }}
        >
          U
        </button>
        <span className="admin-editor-tool-divider" />
        <button
          type="button"
          className={`admin-editor-tool ${editor?.isActive("bulletList") ? "is-active" : ""}`}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          title="목록"
        >
          ≡
        </button>
        <button type="button" className="admin-editor-tool" onClick={insertLink} title="링크 삽입">
          🔗
        </button>
        <span className="admin-editor-tool-divider" />
        <button
          type="button"
          className={`admin-editor-tool admin-editor-tool-code ${showCode ? "is-active" : ""}`}
          onClick={toggleCode}
          title="HTML 코드로 보기"
        >
          {"</>"}
        </button>
      </div>
      {showCode ? (
        <textarea
          className="admin-editor-code-view"
          spellCheck={false}
          value={codeValue}
          onChange={(e) => setCodeValue(e.target.value)}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
