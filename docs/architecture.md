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
  `NavItem`, `SocialLink`, `Project` + `ProjectPhoto`, `Exhibition` +
  `ExhibitionPhoto`, `ContactSubmission`.

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
   defense in depth). Policies are written and rehearsed against a local
   Postgres, but **intentionally not applied to Neon yet** — see the
   warning comment at the top of that file. `forTenant()` doesn't yet run
   `SET LOCAL app.tenant_id` inside a transaction (tracked for Phase 4);
   applying the RLS policies before that lands would make every
   tenant-scoped query return zero rows in production (a full outage, not a
   leak, but still — don't do it out of order).

## Storage (Cloudflare R2)

Key convention: `tenants/{tenantId}/{projects|exhibitions|site|contact-attachments}/...`
(not yet implemented — Phase 4). Uploads go via presigned PUT URLs issued by
an admin-only Route Handler that derives `tenantId` from the session (never
trusts a client-supplied path), so the browser uploads directly to R2.
`next/image` will read through a custom R2 domain (`R2_PUBLIC_HOSTNAME`)
allowlisted in `next.config.ts`.

## What's deferred / explicitly out of scope for now

Stripe/billing, self-serve tenant signup, platform superadmin dashboard,
per-tenant theme customization UI, multiple users per tenant, apex-domain
custom domains (CNAME-only for now). See [roadmap.md](./roadmap.md) Phase 6.
