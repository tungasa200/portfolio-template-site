import "server-only";
import { headers } from "next/headers";

const ROOT_DOMAIN = (process.env.ROOT_DOMAIN ?? "localhost:3000").replace(/:\d+$/, "");

function hostWithoutPort(host: string): string {
  return host.replace(/:\d+$/, "");
}

// Mirrors proxy.ts's own host-based branching: admin is reachable two ways,
// and each needs browser-facing hrefs built differently.
//   - `admin.{ROOT_DOMAIN}` (or a custom admin subdomain): proxy.ts rewrites
//     `/x` -> `/admin/x` transparently, so hrefs must NOT include `/admin`
//     themselves, or the rewrite double-prefixes into `/admin/admin/x`.
//   - the bare root domain (the only way to reach admin on a shared
//     `*.vercel.app` domain with no working wildcard subdomain -- see
//     proxy.ts's comment): `/admin/*` is passed through un-rewritten, so
//     hrefs MUST include `/admin` or ROOT_TENANT_SLUG's blanket rewrite
//     swallows them into the tenant site instead.
// Every browser-facing redirect/href built by admin code should route
// through this so the two access modes can't drift out of sync again.
export async function getAdminBasePath(): Promise<string> {
  const host = hostWithoutPort((await headers()).get("host") ?? "");
  return host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}` ? "/admin" : "";
}
