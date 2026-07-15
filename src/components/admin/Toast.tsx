"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ToastState {
  message: string;
  isError: boolean;
  show: boolean;
}

const ToastContext = createContext<((message: string, isError?: boolean) => void) | null>(null);

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return toast;
}

// Matches design/admin-mockup.html's global toast() function — one shared
// bottom-center toast for the whole admin shell, not per-form status text.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ToastState>({ message: "", isError: false, show: false });
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toast = useCallback((message: string, isError = false) => {
    setState({ message, isError, show: true });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setState((s) => ({ ...s, show: false })), 2600);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={`admin-toast ${state.show ? "show" : ""} ${state.isError ? "is-error" : ""}`}>
        {state.isError ? "⚠ " : "✓ "}
        {state.message}
      </div>
    </ToastContext.Provider>
  );
}
