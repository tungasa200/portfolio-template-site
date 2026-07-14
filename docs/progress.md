# Progress

Status as of 2026-07-14. Update this file whenever a phase in
[roadmap.md](./roadmap.md) moves forward — it's the fastest way for a fresh
session (on any machine) to know where things actually stand.

## Done

**Phase 2 — Public site design system**
- `src/app/s/[tenant]/theme.css`: scoped Tailwind v4 token set ported from
  `design/Photographer Portfolio.dc.html` (oklch colors, Playfair
  Display/Inter/JetBrains Mono via `next/font/google`, intro-line/intro-fade
  keyframes). Own `@import "tailwindcss"` entry point, imported only by the
  tenant layout — verified admin/marketing bundles don't load it (checked
  compiled CSS chunks per route).
- `components/site/`: `Nav`, `SectionHeader`, `PhotoGrid`, `PhotoGridDetail`,
  `Tabs`, `FullscreenViewer`, `ContactForm`, `Footer` — presentational,
  prop-driven, no direct DB calls.
- `src/app/s/[tenant]/layout.tsx` and `page.tsx` (Home) wired for real;
  `src/app/s/[tenant]/contact/page.tsx` (new) wired to a real Server Action
  (`src/lib/actions/contact.ts`) that writes `ContactSubmission` rows through
  `forTenant()`. `resolveTenantByKey` (`resolve-tenant.ts`) extended to also
  include `navItems`/`socialLinks` so Nav/Footer render real seeded data.
- Verified against real Neon (2026-07-14): curl-tested home/contact/admin
  return 200, `/photo` and `/work` 404 as expected (deferred to Phase 3);
  compiled CSS confirmed the scoped tokens; contact form action exercised
  directly — creates a real row, rejects an invalid email, test row cleaned
  up afterward.
- Not yet done: `/photo`, `/work` real pages (Phase 3 — the 4 list/detail/
  viewer components above are built but unused until then); R2-backed hero
  image (still placeholder box, Phase 4).

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

Phase 3 onward — see [roadmap.md](./roadmap.md) for the detailed breakdown.
Next concrete task: real `/photo` and `/work` list/detail pages reading
`Project`/`Exhibition` rows through `forTenant()`, using the `PhotoGrid`,
`PhotoGridDetail`, `Tabs`, and `FullscreenViewer` components already built in
Phase 2.
