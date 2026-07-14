"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth/auth";

export interface LoginFormState {
  status: "idle" | "error";
  message?: string;
}

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/admin",
    });
    return { status: "idle" };
  } catch (error) {
    if (error instanceof AuthError) {
      return { status: "error", message: "Invalid email or password, or account temporarily locked." };
    }
    // Includes the redirect Next.js throws internally on a successful
    // signIn() — must propagate, not be swallowed as an auth failure.
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/admin/login" });
}
