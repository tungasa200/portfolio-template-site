import "server-only";
import { headers } from "next/headers";
import { ROOT_DOMAIN as ROOT_DOMAIN_RAW, getDomainMode, stripPort } from "@/lib/tenant/domain-mode";

const ROOT_DOMAIN = stripPort(ROOT_DOMAIN_RAW);

// Mirrors proxy.ts's own branching: admin is reachable two ways, and each
// needs browser-facing hrefs built differently.
//   - `admin.{ROOT_DOMAIN}` (or a custom admin subdomain, HAS_CUSTOM_DOMAIN
//     mode only): proxy.ts rewrites `/x` -> `/admin/x` transparently, so
//     hrefs must NOT include `/admin` themselves, or the rewrite
//     double-prefixes into `/admin/admin/x`.
//   - the bare root domain (the only way to reach admin when
//     HAS_CUSTOM_DOMAIN is unset -- see proxy.ts's comment and
//     src/lib/tenant/domain-mode.ts): `/admin/*` is passed through
//     un-rewritten, so hrefs MUST include `/admin` or ROOT_TENANT_SLUG's
//     blanket rewrite swallows them into the tenant site instead.
// Every browser-facing redirect/href built by admin code should route
// through this so the two access modes can't drift out of sync again.
export async function getAdminBasePath(): Promise<string> {
  if (getDomainMode() === "no-wildcard") {
    // No wildcard DNS possible, so this deployment is only ever reached at
    // its own bare host regardless of what that host's literal string is
    // (Vercel default domain, preview URL, whatever) -- deliberately not
    // compared against ROOT_DOMAIN, unlike the branch below.
    return "/admin";
  }
  const host = stripPort((await headers()).get("host") ?? "");
  return host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}` ? "/admin" : "";
}
