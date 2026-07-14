# Progress

Status as of 2026-07-14. Update this file whenever a phase in
[roadmap.md](./roadmap.md) moves forward — it's the fastest way for a fresh
session (on any machine) to know where things actually stand.

## Done

**Phase 3 — Content models + public rendering**
- `/photo` and `/work` list pages (`src/app/s/[tenant]/photo/page.tsx`,
  `work/page.tsx`) reading real `Project`/`Exhibition` rows
  (`isPublished: true`, ordered) through `forTenant()`, rendered with the
  Phase 2 `PhotoGrid` component.
- `/photo/[slug]` and `/work/[slug]` detail pages, each fetching its row +
  ordered photos and 404ing (`notFound()`) on an unpublished/missing slug.
  Work's detail adds the INDEX tab (description + cover-photo placeholder,
  page-local JSX, not a standalone component).
- New `components/site/DetailTabs.tsx` (client) — shared controller for both
  detail pages: syncs active tab / active fullscreen photo to
  `?view=&photo=` via `useRouter`/`usePathname`/`useSearchParams` instead of
  local `useState`, per the roadmap's explicit instruction, so a fullscreen
  photo is a shareable/deep-linkable URL. `Tabs`, `PhotoGridDetail`,
  `FullscreenViewer` (built in Phase 2) needed no changes — first real
  callers, already controlled/prop-driven for exactly this.
- `prisma/seed.ts` extended (idempotent — only seeds if the `dev` tenant has
  no `Project` rows yet) with 6 sample projects and 4 sample exhibitions
  mirroring `design/Photographer Portfolio.dc.html`'s own placeholder data,
  all `isPublished: true`. `r2Key`/`width`/`height` are placeholders — no
  real upload pipeline until Phase 4.
- Verified against real Neon (2026-07-14): curl-tested all new routes (200s;
  unknown slug 404s); confirmed rendered HTML for list cards, detail tab
  switching (`?view=grid`), and fullscreen deep-linking
  (`?view=fullscreen&photo=2` renders the correct active photo, checked
  against the actual rendered `<span>`, not just the hydration payload).

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
- `/photo`/`/work` real pages landed in Phase 3 below; R2-backed hero image
  still a placeholder box pending Phase 4.

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

Phase 4 onward — see [roadmap.md](./roadmap.md) for the detailed breakdown.
Next concrete task: Auth.js wiring + admin CRUD + R2 upload flow (Phase 4) —
the phase that closes the `SET LOCAL app.tenant_id` / RLS loop from Phase 1
and replaces every remaining placeholder image box with real uploads.
