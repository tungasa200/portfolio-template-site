"use client";

import { useState, useTransition } from "react";
import { markMessageRead, sendMessageReply } from "@/lib/actions/messages";
import { useToast } from "@/components/admin/Toast";

export interface MessageItem {
  id: string;
  name: string;
  email: string;
  message: string;
  dateLabel: string;
  isNew: boolean;
  replyMessage: string | null;
}

export function MessagesInbox({
  messages: initialMessages,
  canReply,
  settingsHref,
}: {
  messages: MessageItem[];
  canReply: boolean;
  settingsHref: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const newMsgs = messages.filter((m) => m.isNew);
  const readMsgs = messages.filter((m) => !m.isNew);
  const selected = messages.find((m) => m.id === selectedId) ?? null;

  function selectMessage(id: string) {
    setSelectedId(id);
    const msg = messages.find((m) => m.id === id);
    if (msg?.isNew) {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isNew: false } : m)));
      startTransition(async () => {
        await markMessageRead(id);
      });
    }
  }

  return (
    <div>
      {messages.length === 0 && <div className="admin-empty-note">아직 받은 메시지가 없어요.</div>}

      {newMsgs.length > 0 && (
        <>
          <div className="admin-msg-section-label">새 메시지 ({newMsgs.length})</div>
          {newMsgs.map((m) => (
            <MessageRow key={m.id} message={m} onClick={() => selectMessage(m.id)} />
          ))}
        </>
      )}
      {readMsgs.length > 0 && (
        <>
          <div className="admin-msg-section-label">이전 메시지</div>
          {readMsgs.map((m) => (
            <MessageRow key={m.id} message={m} onClick={() => selectMessage(m.id)} />
          ))}
        </>
      )}

      {selected && (
        <div
          className="admin-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null);
          }}
        >
          <div className="admin-modal-panel" role="dialog" aria-modal="true">
            <button type="button" className="admin-modal-close-btn" title="닫기" onClick={() => setSelectedId(null)}>
              ✕
            </button>
            <div className="admin-msg-detail-top">
              <div>
                <div className="admin-msg-detail-name">{selected.name}</div>
                <div className="admin-msg-detail-email">{selected.email}</div>
              </div>
              <div className="admin-msg-detail-date">{selected.dateLabel}</div>
            </div>
            <div className="admin-msg-detail-body">{selected.message}</div>
            {canReply ? (
              <ReplyPanel
                key={selected.id}
                messageId={selected.id}
                existingReply={selected.replyMessage}
                onSent={(replyMessage) =>
                  setMessages((prev) => prev.map((m) => (m.id === selected.id ? { ...m, replyMessage } : m)))
                }
              />
            ) : (
              <div className="admin-empty-note">
                답장하려면 <a href={settingsHref}>설정 페이지</a>에서 이메일 연동을 켜주세요.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ReplyPanel({
  messageId,
  existingReply,
  onSent,
}: {
  messageId: string;
  existingReply: string | null;
  onSent: (replyMessage: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  if (existingReply) {
    return (
      <div className="admin-msg-reply-sent">
        <div className="admin-msg-reply-sent-label">✓ 답장 완료</div>
        <div className="admin-msg-detail-body">{existingReply}</div>
      </div>
    );
  }

  function send() {
    if (!draft.trim() || isPending) return;
    startTransition(async () => {
      const result = await sendMessageReply(messageId, draft);
      toast(result.message, result.status === "error");
      if (result.status === "success") onSent(draft.trim());
    });
  }

  return (
    <div className="admin-field">
      <label>이메일로 답장하기</label>
      <textarea
        rows={4}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="답장 내용을 입력하세요"
        disabled={isPending}
      />
      <div className="admin-msg-detail-actions">
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          onClick={send}
          disabled={isPending || !draft.trim()}
        >
          {isPending ? "보내는 중…" : "답장 보내기"}
        </button>
      </div>
    </div>
  );
}

function MessageRow({ message, onClick }: { message: MessageItem; onClick: () => void }) {
  return (
    <button type="button" className={`admin-msg-card ${message.isNew ? "is-new" : ""}`} onClick={onClick}>
      <div className="admin-msg-avatar">{message.name.charAt(0)}</div>
      <div className="admin-msg-card-body">
        <div className="admin-msg-card-top">
          <span className="admin-msg-card-name">
            {message.name}
            {message.isNew && <span className="admin-new-pill">NEW</span>}
          </span>
          <span className="admin-msg-card-date">{message.dateLabel}</span>
        </div>
        <div className="admin-msg-card-snippet">{message.message}</div>
      </div>
    </button>
  );
}
