"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ContactFormState } from "@/lib/actions/contact";

interface ContactFormProps {
  action: (prevState: ContactFormState, formData: FormData) => Promise<ContactFormState>;
  // Attachments only ever reach anyone via the Gmail notification — with no
  // Gmail connected there's nowhere for the file to go, so the field is
  // hidden rather than accepted and silently dropped.
  gmailConnected: boolean;
}

const initialState: ContactFormState = { status: "idle" };

const fieldLabelClass = "font-site-mono text-[11px] tracking-wide text-site-ink-muted";
const fieldInputClass =
  "border-0 border-b border-site-ink bg-transparent px-0 py-2 font-site-sans text-base outline-none focus:border-b-2";

export function ContactForm({ action, gmailConnected }: ContactFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function clearFile() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFileName(null);
  }

  useEffect(() => {
    if (state.status === "success") clearFile();
  }, [state.status]);

  return (
    <form action={formAction} className="flex flex-col gap-8 pr-10">
      <label className="flex flex-col gap-2">
        <span className={fieldLabelClass}>NAME</span>
        <input type="text" name="name" required className={fieldInputClass} />
      </label>
      <label className="flex flex-col gap-2">
        <span className={fieldLabelClass}>EMAIL</span>
        <input type="email" name="email" required className={fieldInputClass} />
      </label>
      <label className="flex flex-col gap-2">
        <span className={fieldLabelClass}>MESSAGE</span>
        <textarea name="message" rows={4} required className={`${fieldInputClass} resize-none`} />
      </label>
      {gmailConnected && (
        <label className="flex flex-col gap-2">
          <span className={fieldLabelClass}>ATTACHMENT</span>
          <div className="relative flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-site-ink px-6 py-6 hover:bg-site-placeholder-b">
            {fileName ? (
              <>
                <span className="max-w-full truncate text-sm text-site-ink">{fileName}</span>
                <button
                  type="button"
                  onClick={clearFile}
                  className="relative z-10 font-site-mono text-[11px] text-site-ink-faint underline hover:text-site-ink"
                >
                  제거하고 다른 파일 선택
                </button>
              </>
            ) : (
              <>
                <span className="text-sm text-site-ink-soft">파일을 드래그하거나 클릭하여 첨부</span>
                <span className="font-site-mono text-[11px] text-site-ink-faint">
                  JPG, PNG, PDF up to 10MB
                </span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              name="attachment"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
              className="absolute h-px w-px overflow-hidden opacity-0"
            />
          </div>
        </label>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-3 w-fit border border-site-ink bg-site-ink px-8 py-3.5 font-site-sans text-sm tracking-wide text-site-paper hover:bg-site-paper hover:text-site-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "SENDING…" : "SEND MESSAGE"}
      </button>

      {state.status !== "idle" && state.message && (
        <p
          role="status"
          className={
            state.status === "success" ? "text-sm text-site-ink" : "text-sm text-red-700"
          }
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
