# Architecture

Multi-tenant photographer portfolio SaaS: one Next.js deployment serves the
marketing site, every tenant's public portfolio, and the shared admin panel.

## Platform choices

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router, TypeScript) | Single app for public sites + admin — no separate backend, no cross-origin auth cookie problem |
| Hosting | Vercel | Native fit for Next.js; wildcard subdomains for tenant routing |
| Database | Postgres via **Neon** | Native Vercel integration, pooled connections for serverless, preview DB branching |
| ORM | Prisma 7 | Declarative schema; Client Extensions give a clean tenant-isolation guardrail |
| Auth | Auth.js (NextAuth v5), Credentials provider | Self-hosted by explicit choice (see [decisions.md](./decisions.md)) — accept the DIY security surface over an external auth vendor |
| Object storage | Cloudflare R2 (S3-compatible) | Already decided by the user; presigned direct-to-R2 uploads |
| Transactional email | Resend | Contact-form notifications only (see below); simplest standard option for a Next.js app, free tier |
| Styling | Tailwind CSS v4 | Native `oklch()` support matches the design mockup's color tokens exactly |
| Multi-tenancy model | Pooled (shared tables + `tenantId` column) | Lowest operational overhead at this scale vs. schema/DB-per-tenant |

## Request routing

`src/proxy.ts` (Next.js 16's replacement for `middleware.ts` — see
[conventions.md](./conventions.md)) inspects the `Host` header and rewrites
the request path, invisibly to the browser:

| Host | Rewritten to | Handled by |
|---|---|---|
| `{ROOT_DOMAIN}` / `www.{ROOT_DOMAIN}` | *(no rewrite)* | `src/app/page.tsx` — marketing site |
| `admin.{ROOT_DOMAIN}` | `/admin/*` | `src/app/admin/` — shared admin panel |
| `{slug}.{ROOT_DOMAIN}` | `/s/{slug}/*` | `src/app/s/[tenant]/` — tenant public site |
| any other host (custom domain) | `/s/{hostname}/*` | same `src/app/s/[tenant]/` tree |

`proxy.ts` does **not** touch the database — it only decides which route
tree handles the request. The actual tenant lookup (`WHERE slug = $1 OR
customDomain = $1`) happens in `src/app/s/[tenant]/layout.tsx`, which runs
in the Node.js runtime (Proxy in Next.js 16 always runs Node.js too, but
keeping the DB lookup out of it keeps `proxy.ts` fast and dependency-free).

Note this differs from the original plan's mental model of three Next.js
route groups (`(marketing)`/`(public)`/`admin`) resolved via headers in a
shared layout — that doesn't actually work, because route groups don't
produce distinct URL paths, so two `page.tsx` files can't both resolve to
`/`. The rewrite-based `/s/[tenant]/*` structure above is the corrected,
working design (and matches Vercel's own reference multi-tenant pattern).

## Data model

See `prisma/schema.prisma` for the authoritative source. Summary:

- **Platform-level** (no `tenantId`): `Tenant`, `User` (role: `TENANT_OWNER`
  / `TENANT_ADMIN` / `PLATFORM_SUPERADMIN`; `tenantId` nullable, null only
  for superadmins).
- **Tenant-scoped** (every row carries `tenantId`, denormalized onto child
  tables even where a parent join could derive it): `SiteSettings` (1:1),
  `AboutPage` (1:1, static rich-text page — not a board), `NavItem`,
  `SocialLink`, `Board` + `BoardItem` + `BoardItemPhoto`, `ContactSubmission`.

  `Board` (2026-07-15, replaces the earlier fixed `Project`/`Exhibition`
  pair) is generic and data-driven: `kind` is `GALLERY_MULTI` (item has N
  photos + its own `/board/{seq}/{itemSlug}` detail page with INDEX/GRID
  VIEW/FULLSCREEN VIEW tabs) or `GALLERY_SINGLE` (item has exactly 1 photo,
  no detail page, static grid tile). `seq` is a stable per-tenant integer
  driving the fixed `/board/{seq}` route — set once, never user-editable
  (only `name` is); this is what lets an operator provision however many
  boards a tenant's package includes without a code change. See
  [decisions.md](./decisions.md) and [roadmap.md](./roadmap.md) for why.

  `BoardItem.slug` (drives `/board/{seq}/{itemSlug}`, `GALLERY_MULTI` only)
  follows the same immutability principle as `Board.seq`, but it's **not**
  enforced by the schema — there's no DB constraint that can stop a slug
  from being re-derived. The rule has to be upheld in the admin CRUD Server
  Action itself: assign the slug once, on create, and never touch it again
  on an update/rename, even though nothing will error if you do. Getting
  this wrong silently breaks any bookmarked/shared/indexed item URL the
  moment someone renames the item.

## Cross-tenant isolation (two layers)

This is the single highest-risk area of the whole system — a bug here
silently leaks one photographer's data to another, which is catastrophic
once this is a paid multi-tenant product.

1. **Application layer — `forTenant()`** (`src/lib/db/tenant-scoped-client.ts`).
   A Prisma Client Extension (`$extends` + `$allModels`/`$allOperations`)
   that auto-injects `where: { tenantId }` (and `data.tenantId` on
   create/createMany) into every operation on the tenant-scoped models
   listed above, and **throws** if a caller-supplied `tenantId` conflicts.
   **Rule: every Server Action / Route Handler must obtain its DB handle via
   `forTenant(tenantId)` — never import `src/lib/db/client.ts` directly**
   outside `src/lib/db/` and `src/lib/tenant/resolve-tenant.ts` (the one
   sanctioned exception, since resolving *which* tenant a request belongs to
   is inherently a lookup on the `Tenant` table itself, which has no
   `tenantId` to scope by).
   Verified working (2026-07-14): cross-tenant reads return null/empty,
   forged `tenantId` on create throws.

2. **Database layer — Postgres Row-Level Security** (`prisma/security/rls.sql`,
   defense in depth). Applied to Neon and verified enforcing (2026-07-14).
   `forTenant()` now wraps every tenant-scoped operation in a
   `$transaction` that runs `SELECT set_config('app.tenant_id', $tenantId,
   true)` immediately before the query, so the policies'
   `current_setting('app.tenant_id', true)` check has something to compare
   against.

   **This only works because the app's runtime DB role has no `BYPASSRLS`.**
   Neon's default owner role (e.g. `neondb_owner`) has `BYPASSRLS` set by
   default — confirmed the hard way: applying `rls.sql` against it left
   every policy nominally active (`relrowsecurity`/`relforcerowsecurity`
   both true, policy present) but completely inert, silently returning
   every tenant's rows to an unscoped query. `FORCE ROW LEVEL SECURITY`
   only closes the *table-owner* bypass — `BYPASSRLS` is a separate
   role-level attribute it doesn't touch. The fix:
   `prisma/security/create-app-role.sql` creates a dedicated `app_runtime`
   role (no `BYPASSRLS`) that `DATABASE_URL` connects as; `DIRECT_URL` (and
   `prisma/seed.ts`, which writes rows directly without going through
   `forTenant()`) keep using the owner role. See that file and
   `.env.example` for the full setup.

## Storage (Cloudflare R2)

Key convention: `tenants/{tenantId}/{projects|exhibitions|site|contact-attachments}/...`
(not yet implemented — Phase 4). Uploads go via presigned PUT URLs issued by
an admin-only Route Handler that derives `tenantId` from the session (never
trusts a client-supplied path), so the browser uploads directly to R2.
`next/image` will read through a custom R2 domain (`R2_PUBLIC_HOSTNAME`)
allowlisted in `next.config.ts`.

## Contact form → email notification

`src/lib/actions/contact.ts` (`submitContactForm`) writes the
`ContactSubmission` row first — that's the source of truth, a visitor's
message is never lost even if the email step below fails — then best-effort
sends a notification via Resend (`src/lib/email/resend.ts`) to the tenant's
`SiteSettings.contactEmail`, with `replyTo` set to the visitor's own address
so the photographer can just hit reply. A failed send is logged
server-side, never surfaced as an error to the (anonymous) visitor. The
form's `ATTACHMENT` field is read directly out of the submitted `FormData`
and attached straight to that email (size/MIME-type validated,
≤10MB/JPG/PNG/PDF matching the form's own copy) — deliberately not routed
through R2, since that upload flow is a separate, larger piece of Phase 4
and this is a one-off attachment, not part of the photo gallery. Server
Actions cap request bodies at 1MB by default, raised in `next.config.ts`
(`experimental.serverActions.bodySizeLimit`) to actually support the
advertised 10MB.

## What's deferred / explicitly out of scope for now

Stripe/billing, self-serve tenant signup, platform superadmin dashboard,
per-tenant theme customization UI, multiple users per tenant, apex-domain
custom domains (CNAME-only for now). See [roadmap.md](./roadmap.md) Phase 6.
