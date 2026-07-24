import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ROOT_DOMAIN as ROOT_DOMAIN_RAW, ROOT_TENANT_SLUG, getDomainMode, stripPort } from "@/lib/tenant/domain-mode";

// Hostname → internal path rewriting for the multi-tenant public site.
// This file does NOT touch the database — it only decides which internal
// route tree should handle the request based on the Host header. The actual
// tenant lookup happens in src/app/s/[tenant]/layout.tsx (Node runtime),
// keeping proxy fast and free of DB driver constraints.
//
//   {root}                  -> rewritten to /s/{ROOT_TENANT_SLUG}/* (the
//                              operator's own tenant site — there is no
//                              separate marketing page in this project)
//   admin.{root}            -> rewritten to /admin/*
//   {slug}.{root}           -> rewritten to /s/{slug}/*
//   {custom-domain}         -> rewritten to /s/{custom-domain}/*
//
// The rewrite is invisible to the browser — visitors always see the original
// host + path in their address bar.

const ROOT_DOMAIN = stripPort(ROOT_DOMAIN_RAW);
const RESERVED_SUBDOMAINS = new Set(["www", "admin", "s"]);

// pathname은 최소 "/"이므로 그대로 이어붙이면 루트일 때만
// "/s/kswoo/" 같은 트레일링 슬래시 변형이 되어 "/s/kswoo"와 다르게
// 라우팅된다.
function joinPath(prefix: string, pathname: string): string {
  return pathname === "/" ? prefix : `${prefix}${pathname}`;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = stripPort(request.headers.get("host") ?? "");

  if (getDomainMode() === "no-wildcard") {
    // HAS_CUSTOM_DOMAIN is not set — there is no wildcard DNS, so
    // `admin.{host}`/`{slug}.{host}` can never reach this deployment no
    // matter what the Host header says (Vercel's shared *.vercel.app domain
    // only ever resolves its own exact assigned hostname). Every request is
    // therefore the bare-root tenant by construction — deliberately NOT
    // compared against ROOT_DOMAIN here, so a stale/mismatched ROOT_DOMAIN
    // (e.g. already set to a custom domain that isn't live yet) can't send
    // this branch down the wrong path the way host-string comparison used
    // to. See src/lib/tenant/domain-mode.ts.
    if (!ROOT_TENANT_SLUG || pathname === "/admin" || pathname.startsWith("/admin/")) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = joinPath(`/s/${ROOT_TENANT_SLUG}`, pathname);
    return NextResponse.rewrite(url);
  }

  // HAS_CUSTOM_DOMAIN=true: a real wildcard-DNS domain is live, so multiple
  // distinct hosts can genuinely reach this deployment — Host-based
  // branching below is meaningful here (unlike the no-wildcard branch above).
  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) {
    if (!ROOT_TENANT_SLUG || pathname === "/admin" || pathname.startsWith("/admin/")) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = joinPath(`/s/${ROOT_TENANT_SLUG}`, pathname);
    return NextResponse.rewrite(url);
  }

  if (host === `admin.${ROOT_DOMAIN}`) {
    const url = request.nextUrl.clone();
    url.pathname = joinPath("/admin", pathname);
    return NextResponse.rewrite(url);
  }

  const subdomain = host.endsWith(`.${ROOT_DOMAIN}`)
    ? host.slice(0, -(ROOT_DOMAIN.length + 1))
    : null;

  const tenantKey = subdomain && !RESERVED_SUBDOMAINS.has(subdomain) ? subdomain : host;

  const url = request.nextUrl.clone();
  url.pathname = joinPath(`/s/${tenantKey}`, pathname);
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
