import "server-only";
import { unstable_cache } from "next/cache";

// One tag per tenant, shared by every cached read on the public site
// (/s/[tenant]/**). Every admin mutation that touches tenant-scoped data
// revalidates this same tag. A single shared tag can't be "missed" the way
// a dozen fine-grained tags could — the cost is invalidating slightly more
// than necessary, which is cheap here since admin edits are infrequent and
// the underlying queries are small.
export function tenantCacheTag(tenantId: string): string {
  return `tenant:${tenantId}`;
}

// Safety net: if a mutation path is ever added without a revalidateTag call,
// staleness is capped at 1h instead of persisting indefinitely.
const REVALIDATE_SECONDS = 60 * 60;

export function cacheForTenant<T>(
  keyParts: string[],
  tenantId: string,
  fn: () => Promise<T>
): Promise<T> {
  return unstable_cache(fn, [...keyParts, tenantId], {
    tags: [tenantCacheTag(tenantId)],
    revalidate: REVALIDATE_SECONDS,
  })();
}
