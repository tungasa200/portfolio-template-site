import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getAdminBasePath } from "@/lib/auth/admin-base-path";

// The only sanctioned source of tenantId for admin Server Actions/pages —
// never accept it from client input (docs/conventions.md). Superadmins
// (tenantId null) also redirect: there's no platform dashboard for them yet
// (Phase 6).
export async function getCurrentTenantContext() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    redirect(`${await getAdminBasePath()}/login`);
  }

  return {
    tenantId: session.user.tenantId,
    userId: session.user.id,
    role: session.user.role,
  };
}
