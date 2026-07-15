import { auth } from "@/lib/auth/auth";
import { getCurrentTenantContext } from "@/lib/auth/tenant-context";
import { forTenant } from "@/lib/db/tenant-scoped-client";
import { logoutAction } from "@/lib/actions/auth";

// Proves session -> tenant context end-to-end. Real CRUD UI (SiteSettings
// editor, Board/BoardItem management, ContactSubmission inbox) is a
// follow-up round, not this one.
export default async function AdminDashboardPage() {
  const { tenantId } = await getCurrentTenantContext();
  const session = await auth();
  const db = forTenant(tenantId);
  const siteSettings = await db.siteSettings.findUnique({ where: { tenantId } });

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-neutral-50 px-10 py-10">
      <h1 className="text-xl font-semibold text-neutral-900">Admin dashboard</h1>
      <p className="text-sm text-neutral-600">
        Signed in as {session?.user?.email} — managing{" "}
        <strong>{siteSettings?.siteName ?? "(no site name set)"}</strong>.
      </p>
      <form action={logoutAction}>
        <button
          type="submit"
          className="w-fit rounded border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Log out
        </button>
      </form>
    </main>
  );
}
