"use client";

import { useActionState, useEffect } from "react";
import { loginAction, type LoginFormState } from "@/lib/actions/auth";

const initialState: LoginFormState = { status: "idle" };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  // Hard nav (window.location), not the Next.js client router — see
  // src/lib/actions/auth.ts's top comment for why.
  useEffect(() => {
    if (state.status === "success" && state.redirectTo) {
      window.location.href = state.redirectTo;
    }
  }, [state]);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-neutral-700">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="username"
          className="rounded border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-neutral-700">Password</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="rounded border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="mt-2 rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
      {state.status === "error" && state.message && (
        <p role="status" className="text-sm text-red-700">
          {state.message}
        </p>
      )}
    </form>
  );
}
