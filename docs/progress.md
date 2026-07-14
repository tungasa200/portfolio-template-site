# Progress

Status as of 2026-07-14. Update this file whenever a phase in
[roadmap.md](./roadmap.md) moves forward — it's the fastest way for a fresh
session (on any machine) to know where things actually stand.

## Done

**Phase 0 — Scaffolding**
- Next.js 16.2.10 (App Router, TypeScript, Turbopack) + Prisma 7.8 +
  Tailwind v4 scaffolded at repo root.
- Git repo initialized, pushed to `github.com/tungasa200/portfolio-template-site`.

**Phase 1 — Multi-tenancy foundation**
- Full schema in `prisma/schema.prisma` (Tenant, User, SiteSettings,
  NavItem, SocialLink, Project/ProjectPhoto, Exhibition/ExhibitionPhoto,
  ContactSubmission).
- `src/proxy.ts` hostname routing implemented and verified (root / tenant
  subdomain / admin subdomain / unknown-tenant-404 all curl-tested).
- `forTenant()` cross-tenant guardrail (`src/lib/db/tenant-scoped-client.ts`)
  implemented and verified with a throwaway script — cross-tenant reads
  return null/empty, forged `tenantId` on create throws.
- Row-Level Security policies written (`prisma/security/rls.sql`),
  rehearsed locally, **not yet applied to Neon** (see the warning comment
  in that file — must wait for Phase 4's `SET LOCAL` wiring).
- Minimal proof-of-life pages: `src/app/s/[tenant]/page.tsx` renders the
  resolved tenant's site name; `src/app/admin/page.tsx` is a routing stub;
  `src/app/page.tsx` is a marketing placeholder.
- Seed script (`prisma/seed.ts`, `npm run db:seed`) creates a `dev` tenant.

**External services provisioned**
- ✅ Neon Postgres connected. Real migration `20260714083145_init`
  generated and applied. `DATABASE_URL` (pooled) / `DIRECT_URL` (unpooled,
  CLI-only) both verified reachable.
- ✅ Cloudflare R2 connected (bucket `portfolio-template`). Credentials
  verified via a ListObjectsV2 call. `R2_PUBLIC_HOSTNAME` (custom domain
  for image serving) intentionally left unset — not needed until Phase 4.
- ⬜ Vercel — not yet provisioned.

**Conventions established**
- Commit message tags: see [conventions.md](./conventions.md).

## Not started

Phase 2 onward — see [roadmap.md](./roadmap.md) for the detailed breakdown.
Next concrete task: Tailwind v4 `@theme` token porting + the
`components/site/` design-system layer (Phase 2).
