import type { ReactNode } from "react";
import { getCurrentTenantContext } from "@/lib/auth/tenant-context";

// Route group (not a URL segment) so /admin is protected while /admin/login
// isn't, without two page.tsx files resolving to the same URL.
export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  await getCurrentTenantContext();
  return children;
}
