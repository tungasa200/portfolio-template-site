import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Hostname → internal path rewriting for the multi-tenant public site.
// This file does NOT touch the database — it only decides which internal
// route tree should handle the request based on the Host header. The actual
// tenant lookup happens in src/app/s/[tenant]/layout.tsx (Node runtime),
// keeping proxy fast and free of DB driver constraints.
//
//   {root}                  -> passthrough, served by src/app/ directly (marketing)
//   admin.{root}            -> rewritten to /admin/*
//   {slug}.{root}           -> rewritten to /s/{slug}/*
//   {custom-domain}         -> rewritten to /s/{custom-domain}/*
//
// The rewrite is invisible to the browser — visitors always see the original
// host + path in their address bar.

const ROOT_DOMAIN = (process.env.ROOT_DOMAIN ?? "localhost:3000").replace(/:\d+$/, "");
const RESERVED_SUBDOMAINS = new Set(["www", "admin", "s"]);

function hostWithoutPort(host: string): string {
  return host.replace(/:\d+$/, "");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = hostWithoutPort(request.headers.get("host") ?? "");

  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) {
    return NextResponse.next();
  }

  if (host === `admin.${ROOT_DOMAIN}`) {
    const url = request.nextUrl.clone();
    url.pathname = `/admin${pathname}`;
    return NextResponse.rewrite(url);
  }

  const subdomain = host.endsWith(`.${ROOT_DOMAIN}`)
    ? host.slice(0, -(ROOT_DOMAIN.length + 1))
    : null;

  const tenantKey = subdomain && !RESERVED_SUBDOMAINS.has(subdomain) ? subdomain : host;

  const url = request.nextUrl.clone();
  url.pathname = `/s/${tenantKey}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
