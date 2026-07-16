"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth/auth";
import { getAdminBasePath } from "@/lib/auth/admin-base-path";

export interface LoginFormState {
  status: "idle" | "error" | "success";
  message?: string;
  redirectTo?: string;
}

// redirect: false + returning the target URL (instead of letting signIn()/
// signOut() call next/navigation's redirect() themselves) is deliberate:
// a soft, client-router-mediated transition across proxy.ts's
// admin.{ROOT_DOMAIN} rewrite boundary (this action's own route, outside
// the (dashboard) layout, to "/" which rewrites to a totally different part
// of the tree) was observed intermittently rendering the PREVIOUS route's
// cached RSC payload instead of the new one in dev — a plain reload always
// showed the correct page, confirming the server was never wrong, only the
// client-side transition. LoginForm.tsx/AdminShell.tsx force a hard
// `window.location` navigation instead, which sidesteps it entirely.
export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  try {
    const homeTarget = (await getAdminBasePath()) || "/";
    const url = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
      redirectTo: homeTarget,
    });
    return { status: "success", redirectTo: url ?? homeTarget };
  } catch (error) {
    if (error instanceof AuthError) {
      return { status: "error", message: "Invalid email or password, or account temporarily locked." };
    }
    throw error;
  }
}

export async function logoutAction(): Promise<string> {
  const loginTarget = `${await getAdminBasePath()}/login`;
  const res = await signOut({ redirect: false, redirectTo: loginTarget });
  // next-auth's signOut() returns the raw Auth() response when
  // redirect:false — its redirect target lives on `.redirect`, not `.url`
  // (see node_modules/next-auth/lib/actions.js). See this file's top
  // comment for why the caller does a hard nav with it.
  return (res as { redirect?: string })?.redirect ?? loginTarget;
}
