"use client";

import { useActionState, useEffect, useState } from "react";
import { updateReplyEmailConfig, disconnectReplyEmail } from "@/lib/actions/reply-email";
import type { ActionFormState } from "@/lib/actions/site-settings";
import { useToast } from "@/components/admin/Toast";

const initialState: ActionFormState = { status: "idle" };

export function ReplyEmailSettings({ connectedEmail }: { connectedEmail: string | null }) {
  const [state, formAction, isPending] = useActionState(updateReplyEmailConfig, initialState);
  const [isDisconnecting, setDisconnecting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (state.status !== "idle" && state.message) toast(state.message, state.status === "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function handleDisconnect() {
    setDisconnecting(true);
    const result = await disconnectReplyEmail();
    if (result.message) toast(result.message, result.status === "error");
    setDisconnecting(false);
  }

  return (
    <div className="admin-section-card">
      <h2>
        이메일 답장 연동 <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 14 }}>(선택)</span>
      </h2>
      <p className="admin-section-desc">
        받은 메시지에 이메일로 직접 답장하려면 본인의 Gmail 계정을 연동하세요. Google 계정의 2단계 인증을
        켠 뒤 발급받는 &quot;앱 비밀번호&quot;가 필요해요. 연동하지 않아도 사이트를 쓰는 데는 문제없어요.
      </p>

      {connectedEmail ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
          <span className="admin-tag">✓ {connectedEmail} 연동됨</span>
          <button type="button" className="admin-btn" onClick={handleDisconnect} disabled={isDisconnecting}>
            {isDisconnecting ? "해제 중…" : "연동 해제"}
          </button>
        </div>
      ) : (
        <form action={formAction} style={{ marginTop: 16 }}>
          <div className="admin-field-row">
            <div className="admin-field">
              <label>Gmail 주소</label>
              <input type="email" name="replyEmail" placeholder="you@gmail.com" required />
            </div>
            <div className="admin-field">
              <label>앱 비밀번호</label>
              <input type="password" name="appPassword" required />
            </div>
          </div>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={isPending}>
            {isPending ? "연동 중…" : "연동하기"}
          </button>
        </form>
      )}
    </div>
  );
}
