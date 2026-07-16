"use client";

import { useState, useTransition } from "react";
import { markMessageRead } from "@/lib/actions/messages";

export interface MessageItem {
  id: string;
  name: string;
  email: string;
  message: string;
  dateLabel: string;
  isNew: boolean;
}

export function MessagesInbox({ messages: initialMessages }: { messages: MessageItem[] }) {
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
            <div className="admin-msg-detail-actions">
              <a className="admin-btn admin-btn-primary" href={`mailto:${selected.email}`}>
                이메일로 답장하기
              </a>
            </div>
          </div>
        </div>
      )}
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
