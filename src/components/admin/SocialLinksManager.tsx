"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createSocialLink, deleteSocialLink } from "@/lib/actions/social-links";
import type { ActionFormState } from "@/lib/actions/site-settings";
import { useToast } from "@/components/admin/Toast";

export interface SocialLinkItem {
  id: string;
  platform: string;
  url: string;
}

const initialState: ActionFormState = { status: "idle" };

// Deliberately renders the `links` prop directly rather than mirroring it
// into local state: createSocialLink/deleteSocialLink both call
// revalidatePath, which re-renders the parent Server Component and streams
// fresh props here automatically. A local optimistic copy would need a
// client-generated placeholder id for a just-created row — a real footgun,
// since deleting that row before the real data arrives would call
// deleteSocialLink() with an id no DB row has. No drag-reorder either —
// design/admin-mockup.html's renderSocialList has none (order is just
// insertion order); only add/delete are real interactions here.
export function SocialLinksManager({ links }: { links: SocialLinkItem[] }) {
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(createSocialLink, initialState);
  const [, startTransition] = useTransition();
  const toast = useToast();

  useEffect(() => {
    if (state.status === "success") setShowForm(false);
    if (state.status !== "idle" && state.message) toast(state.message, state.status === "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      await deleteSocialLink(id);
      setDeletingId(null);
    });
  }

  return (
    <>
      <div className="admin-reorder-list">
        {links.length === 0 && !showForm && <div className="admin-empty-note">아직 추가한 SNS 링크가 없어요.</div>}
        {links.map((link) => (
          <div key={link.id} className="admin-reorder-row" style={{ opacity: deletingId === link.id ? 0.5 : 1 }}>
            <div className="admin-reorder-main">
              <strong>{link.platform}</strong>
              <span>{link.url}</span>
            </div>
            <button
              type="button"
              className="admin-icon-btn"
              title="삭제"
              disabled={deletingId === link.id}
              onClick={() => handleDelete(link.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {showForm ? (
        <form action={formAction} style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <input type="text" name="platform" placeholder="예: Instagram" required style={{ flex: "1 1 160px" }} />
          <input type="text" name="url" placeholder="https://instagram.com/..." required style={{ flex: "2 1 260px" }} />
          <button type="submit" className="admin-btn admin-btn-primary" disabled={isPending}>
            {isPending ? "추가 중…" : "추가"}
          </button>
        </form>
      ) : (
        <button type="button" className="admin-add-row-btn" style={{ marginTop: 10 }} onClick={() => setShowForm(true)}>
          ＋ SNS 링크 추가
        </button>
      )}
    </>
  );
}
