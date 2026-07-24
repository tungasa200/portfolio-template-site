"use client";

import { useEffect, useState } from "react";

// Last-resort safety net for the rare case where src/lib/db/with-retry.ts's
// server-side retry window (~1.1s) still wasn't enough — e.g. a Neon cold
// start that takes longer than usual. We get one silent client-side retry
// per short window (tracked in sessionStorage, re-checked whenever a new
// error comes in) before giving up and showing a message, so a transient
// blip resolves itself without the visitor ever seeing an error.
//
// unstable_retry() (not reset()) is required here: reset() only clears the
// error state and re-renders with whatever was already fetched, while
// unstable_retry() actually re-fetches the segment — the failed DB read is
// what we need to redo. (Next.js 16.2+, see error.js file convention docs.)
const RETRY_STORAGE_KEY = "page-error-last-auto-retry";
const RETRY_COOLDOWN_MS = 3000;

function shouldAutoRetry(): boolean {
  if (typeof window === "undefined") return false;
  const lastRetryAt = Number(sessionStorage.getItem(RETRY_STORAGE_KEY) ?? 0);
  return Date.now() - lastRetryAt >= RETRY_COOLDOWN_MS;
}

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const [trackedError, setTrackedError] = useState(error);
  const [autoRetrying, setAutoRetrying] = useState(shouldAutoRetry);

  // Re-derive whether we're still within the cooldown every time a *new*
  // error arrives (not just on mount) — the React-recommended way to adjust
  // state from a prop change is during render, not inside an effect.
  if (error !== trackedError) {
    setTrackedError(error);
    setAutoRetrying(shouldAutoRetry());
  }

  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    if (!autoRetrying) return;
    sessionStorage.setItem(RETRY_STORAGE_KEY, String(Date.now()));
    const timer = setTimeout(unstable_retry, 500);
    return () => clearTimeout(timer);
  }, [autoRetrying, unstable_retry]);

  if (autoRetrying) {
    return null;
  }

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-lg font-semibold">일시적으로 페이지를 불러오지 못했습니다</h1>
      <p className="text-sm opacity-70">잠시 후 다시 시도해 주세요.</p>
      <button
        type="button"
        onClick={() => {
          sessionStorage.removeItem(RETRY_STORAGE_KEY);
          unstable_retry();
        }}
        className="rounded-md border px-4 py-2 text-sm font-medium hover:opacity-70"
      >
        다시 시도
      </button>
    </main>
  );
}
