// Single source of truth for "does this deployment currently have a real
// custom domain with working wildcard DNS, or is it only reachable at
// Vercel's shared *.vercel.app default domain?" (see docs/decisions.md's
// fork-per-customer entry). This used to be *inferred* per-request by
// comparing the Host header against ROOT_DOMAIN, duplicated independently in
// proxy.ts and admin-base-path.ts -- fragile, because it silently breaks
// (every /admin link 404s) the moment ROOT_DOMAIN is set to a domain that
// isn't actually live yet, or hasn't been updated to match what traffic is
// really arriving on. HAS_CUSTOM_DOMAIN makes that fact an explicit,
// deliberately-flipped flag instead: unset/false until the operator has
// actually bought the domain and verified wildcard DNS resolves (see
// docs/external-services.md's Vercel section), then flipped to true once.
export const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "localhost:3000";
export const ROOT_TENANT_SLUG = process.env.ROOT_TENANT_SLUG;

export type DomainMode = "no-wildcard" | "custom";

export function getDomainMode(): DomainMode {
  return process.env.HAS_CUSTOM_DOMAIN === "true" ? "custom" : "no-wildcard";
}

export function stripPort(host: string): string {
  return host.replace(/:\d+$/, "");
}
