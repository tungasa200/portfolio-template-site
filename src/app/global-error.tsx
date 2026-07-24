"use client";

import { useEffect } from "react";

// Catches errors thrown by the root layout itself (error.tsx can't — a
// segment's error boundary sits below its own layout, not above it). Root
// layout here only sets up fonts/metadata, so this should be effectively
// unreachable, but Next.js requires a global-error.tsx to render its own
// <html>/<body> as the final fallback, so we can't skip it.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-lg font-semibold">일시적으로 페이지를 불러오지 못했습니다</h1>
        <p className="text-sm opacity-70">잠시 후 다시 시도해 주세요.</p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:opacity-70"
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
