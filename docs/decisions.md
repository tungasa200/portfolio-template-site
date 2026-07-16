# Key decisions and why

Chronological. Read this when you're tempted to "simplify" something —
most of the non-obvious choices here were already argued out once.

## Per-customer fork + dedicated Vercel deployment, not one shared multi-tenant instance (2026-07-16)

This repo is being run as a **dev master template**: no custom domain is
being bought for it (Vercel's default `*.vercel.app` domain is fine for
this master copy), and going forward each customer gets their *own copy*
of this codebase, customized, deployed as its *own separate* Vercel
project. This is a real pivot from — not just an addition to — "[Multi-tenant SaaS from day one](#multi-tenant-saas-from-day-one-not-a-single-tenant-site)"
below, which assumed one shared deployment serving every tenant by
subdomain. That original assumption is why `Tenant`/RLS/`forTenant()`/
subdomain-based routing exist at all; under the fork-per-customer model,
each deployment only ever has one real tenant, so all of that becomes
unused-but-harmless infrastructure per fork rather than load-bearing
multi-tenancy. **Not ripped out** — it doesn't hurt anything sitting
unused, and revisiting it isn't urgent — but worth knowing if a future
session is tempted to "simplify away" the tenant-scoping code: it was
built for a different deployment model than the one actually being used
going forward, not for no reason.

Immediate, concrete consequence (came up discussing R2 bucket structure):
**each customer's forked project should get its own R2 bucket and its own
R2 API token, not share the master project's bucket** — see
[external-services.md](./external-services.md#2-cloudflare-r2-object-storage--done-for-local-dev).
Reasoning: since Vercel project and Neon DB are already going to be
separate per customer under this model, sharing only the R2 bucket would
be the odd one out — and a leaked R2 key from any one customer's Vercel
env vars would expose every other customer's files (the `tenants/{id}/...`
key-nesting added earlier this session limits accidental *cross-tenant*
confusion within one bucket, but doesn't stop someone holding a valid key
from listing/reading the whole bucket). Separate buckets cost nothing
extra (R2 has no per-bucket fee and a generous bucket-count limit), so
there's no real trade-off against doing it.

## Admin-internal links must never hardcode an `/admin` prefix (2026-07-15)

`proxy.ts` rewrites `admin.{ROOT_DOMAIN}/foo` → `/admin/foo` invisibly to
the browser (see [architecture.md](./architecture.md#request-routing)). Any
browser-facing value inside the admin app — `Link` `href`s, `redirect()`
targets, NextAuth's `pages.signIn`/`signIn`/`signOut` `redirectTo` — must
therefore be written *without* the `/admin` prefix (root-relative to the
already-rewritten tree), exactly like the public site's
`src/lib/site/nav-items.ts` already does for `/s/[tenant]/*`. Writing
`/admin/board/...` there double-prefixes into a 404
(`/admin/admin/board/...`) the moment it's exercised on the actual
`admin.{ROOT_DOMAIN}` subdomain. This bug existed from Phase 4a onward
(`tenant-context.ts`'s `redirect("/admin/login")`, `auth.ts`'s
`redirectTo: "/admin"`) but was never caught because every prior
verification pass curl-tested `localhost:3000/admin/login` directly (root
domain, no rewrite applied) instead of the sanctioned subdomain — found
while verifying Phase 4's admin CRUD in a real browser against the real
subdomain. `revalidatePath("/admin", "layout")` calls are unaffected by
this — that's Next's internal file-system route path, a different thing
from the browser-facing URL.

Separately: even with the prefix fixed, a JS-enabled login intermittently
rendered the *previous* route's cached content for one frame after the
post-login redirect (a no-JS control run and a raw `curl` with the session
cookie both correctly returned the dashboard immediately — only the live
browser's client-side transition showed it wrong, and a manual reload
always fixed it). Root cause: Next.js's client router transitioning across
`proxy.ts`'s rewrite boundary after a Server-Action-triggered redirect.
Rather than debug Next's router internals further, sidestepped it:
`signIn`/`signOut` now use `redirect: false` and return the target URL,
and the calling components do a hard `window.location.href` navigation
instead of letting the client router mediate it. See
`src/lib/actions/auth.ts`'s top comment.

## Generic `Board`/`BoardItem` model, not fixed `Project`/`Exhibition` (2026-07-15)

The original schema hand-duplicated `Project`/`ProjectPhoto` (Photo board)
and `Exhibition`/`ExhibitionPhoto` (Work board) as separate models, with
matching separate `/photo` and `/work` route pairs. Reopened once three
things became explicit in the same conversation: (1) board *count* per
tenant needs to be operator-configured per package, not fixed at 2; (2) a
new board *kind* was wanted — single-photo-per-item grid tiles with no
detail page, alongside the existing multi-photo/detail-page kind; (3) board
URL paths had just been made immutable (see the path-editing reversal
below), which meant a stable `/board/{seq}` numeric route made more sense
than semantic per-board route folders anyway.

Replaced with one `Board` (+ `kind: GALLERY_MULTI | GALLERY_SINGLE`) +
`BoardItem` + `BoardItemPhoto` model and one route pair
(`board/[seq]/page.tsx`, `board/[seq]/[itemSlug]/page.tsx`) instead of two.
Also fixed, in the same pass, a real cross-tenant-data bug this surfaced:
`resolve-tenant.ts` was fetching `siteSettings`/`navItems`/`socialLinks` as
an `include` on the same unscoped query used to identify the tenant —
since RLS requires `forTenant()`'s `SET LOCAL` to have run, and that query
never ran through `forTenant()`, every tenant's nav/social links/site
settings were silently empty in production. Fixed by splitting into two
queries: identify the tenant unscoped (the one sanctioned exception), then
fetch everything else through `forTenant(tenant.id)` like every other
query in the app. See [architecture.md](./architecture.md#data-model) and
[roadmap.md](./roadmap.md) for the schema and remaining admin-CRUD work.

## Multi-tenant SaaS from day one, not a single-tenant site

Started as "just my own portfolio," but there's a concrete plan to sell this
as a product to other photographers. Retrofitting multi-tenancy onto a
single-tenant codebase later is far more expensive than designing tenant
isolation in from the start (schema, routing, and query-scoping habits all
have to change). So even though tenant #1 is the owner's own site, the
system is multi-tenant end to end from Phase 1.

## Next.js monolith, not Spring Boot + Railway split backend

Considered: Spring Boot API on Railway + a separate frontend. Rejected
because:
- Cross-origin auth session cookies between a Vercel-hosted frontend and a
  Railway-hosted API is real, ongoing complexity (CORS, SameSite, cookie
  domain handling) for zero benefit at this scale.
- Two languages (TypeScript + Java) and two deployment pipelines double the
  surface an AI-coding-only workflow has to keep coherent across sessions.
- A single Next.js app with Server Actions/Route Handlers as the "backend"
  is same-origin, one language, one deploy target.

Enterprise-grade separation of concerns (Spring Security, dedicated backend
team conventions) would matter more at a scale this product isn't at.

## Pooled multi-tenancy, not schema-per-tenant or DB-per-tenant

Shared tables + a `tenantId` column on every tenant-scoped row. Schema- or
database-per-tenant gives stronger isolation but multiplies operational
complexity (migrations run N times, connection management per tenant) for a
benefit this scale (small photographer businesses, not enterprise
customers) doesn't need. The isolation risk this trades away is covered by
the two-layer guardrail — see [architecture.md](./architecture.md#cross-tenant-isolation-two-layers).

## Neon over Railway Postgres

Railway was the original instinct ("easy DB management"). Neon won because
of Vercel-native integration (env vars auto-wired), per-branch database
branching for preview deployments (useful when an AI-coding workflow runs
many experimental migrations), and autoscale-to-zero keeping pre-revenue
cost near $0. Railway's dashboard convenience isn't actually better than
Neon's — the platform fit is what decided it.

## Auth.js (self-hosted), not Clerk

Clerk was recommended (fully managed — password hashing, reset flows,
brute-force protection all off the table, which matters when "AI writes
100% of the code" and there's no human security reviewer). **The user
explicitly chose Auth.js instead** — self-hosted, no vendor dependency, no
per-user billing. Accepted trade-off: password hashing / reset / rate-limit
logic has to be implemented carefully (bcrypt, standard Auth.js patterns)
rather than delegated. Mitigated by keeping the actual attack surface small
in early phases — no self-serve signup, so no email-verification or
public password-reset flow needed until Phase 6.

## Cloudflare R2 for storage (given, not chosen here)

User had already decided this before architecture planning started.
S3-compatible, so any AWS SDK-based upload code works unmodified against it.

## Tailwind CSS v4, not CSS-in-JS

The design mockup (`design/Photographer Portfolio.dc.html`) defines its
palette directly in `oklch(...)`. Tailwind v4's CSS-first `@theme` supports
`oklch()` natively, so those tokens paste in with zero conversion. Also the
styling approach with the deepest AI-training-data familiarity, which
matters directly for an AI-coding-only workflow.

## Routing: rewrite into `/s/[tenant]/*`, not three route groups

The original plan described three Next.js route groups —
`(marketing)`/`(public)`/`admin` — resolved via headers in a shared layout.
That doesn't actually work: route groups are invisible to the URL, so two
different `page.tsx` files can't both resolve to `/`. Corrected during
implementation to the working pattern: `proxy.ts` rewrites
`{tenant}.{root}/*` and custom domains to `/s/{tenant}/*` (a real dynamic
route segment), `admin.{root}/*` to `/admin/*`, and leaves the root domain
untouched. This matches Vercel's own reference multi-tenant Next.js
pattern. See [architecture.md](./architecture.md#request-routing).
