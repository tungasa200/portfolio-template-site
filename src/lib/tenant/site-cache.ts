import "server-only";
import { unstable_cache, updateTag, revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";

// One tag per tenant, shared by every cached read on the public site
// (/s/[tenant]/**). Every admin mutation that touches tenant-scoped data
// revalidates this same tag. A single shared tag can't be "missed" the way
// a dozen fine-grained tags could — the cost is invalidating slightly more
// than necessary, which is cheap here since admin edits are infrequent and
// the underlying queries are small.
export function tenantCacheTag(tenantId: string): string {
  return `tenant:${tenantId}`;
}

export function cacheForTenant<T>(
  keyParts: string[],
  tenantId: string,
  fn: () => Promise<T>
): Promise<T> {
  return unstable_cache(fn, [...keyParts, tenantId], {
    tags: [tenantCacheTag(tenantId)],
    revalidate: false,
  })();
}

// Call from every admin Server Action after a tenant-scoped write. Busts
// two separate caches:
//   1. the Data Cache tag (cacheForTenant's unstable_cache reads)
//   2. the rendered-page cache (Full Route Cache) for /s/[tenant]/**, which
//      is what actually makes public navigation instant — without this,
//      pages keep re-rendering from a cold shell even though their DB reads
//      are cached.
// A tenant can be reachable at both {slug}.{root} and a customDomain, which
// proxy.ts rewrites to two different internal paths (/s/{slug}/* and
// /s/{customDomain}/*) — both need invalidating or one of the two hostnames
// would keep serving stale HTML.
export async function revalidateTenantSite(tenantId: string): Promise<void> {
  updateTag(tenantCacheTag(tenantId));

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true, customDomain: true },
  });
  if (!tenant) {
    return;
  }
  revalidatePath(`/s/${tenant.slug}`, "layout");
  if (tenant.customDomain) {
    revalidatePath(`/s/${tenant.customDomain}`, "layout");
  }
}
