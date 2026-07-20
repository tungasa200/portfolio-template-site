# Roadmap

Phases after the completed Phase 0/1 (see [progress.md](./progress.md)).
Each phase should end with the working tree in a state where `npm run dev`
demonstrably does the new thing — don't move on with something half-wired.

## Phase 2 — Public site design system

Port `design/Photographer Portfolio.dc.html` (a Claude Design prototype —
UI/UX spec, not real code; uses a `sc-if`/`sc-for`/`{{ }}` templating DSL
that doesn't exist outside that tool) into real Tailwind v4 + React.

1. Add the mockup's `oklch(...)` color tokens and three fonts (Playfair
   Display, Inter, JetBrains Mono via `next/font/google`) to a
   theme scoped under `src/app/s/[tenant]/` (not the global
   `src/app/globals.css` — admin and marketing will likely want their own
   look later, don't let the portfolio theme leak into them).
2. Build `components/site/` (presentational, prop-driven, no direct DB
   calls so they're reusable for a future admin live-preview):
   `Nav.tsx` (collapsible sidebar), `SectionHeader.tsx` (animated-underline
   heading), `PhotoGrid.tsx` (shared by Project and Exhibition list views),
   `PhotoGridDetail.tsx`, `Tabs.tsx`, `FullscreenViewer.tsx` (main image +
   thumbnail strip), `ContactForm.tsx`, `Footer.tsx`.
3. Wire Home + Contact pages for real (contact submission → `ContactSubmission`
   row via a Server Action, scoped through `forTenant()`).

Reference the mockup file directly for exact spacing/animation values —
don't approximate from memory.

## Phase 3 — Content models + public rendering

- Photo list (`/photo`) and detail (`/photo/[slug]`) pages reading real
  `Project`/`ProjectPhoto` rows.
- Work list (`/work`) and detail (`/work/[slug]`) pages reading real
  `Exhibition`/`ExhibitionPhoto` rows, including the INDEX tab's long-form
  `description` text.
- Grid/fullscreen view state: use `searchParams` (`?view=fullscreen&photo=2`)
  rather than local `useState` like the original mockup — makes fullscreen
  views shareable/deep-linkable, a small upgrade over the prototype.
- All reads go through `forTenant(tenant.id)` — no exceptions.

## Phase 4 — Admin CRUD + uploads — done (2026-07-15)

Real admin panel built and verified end-to-end in a real browser against
`design/admin-mockup.html`'s interaction/copy spec — see
[progress.md](./progress.md#phase-4--admin-crud--uploads-done-2026-07-15)
for the full file-by-file breakdown, the two real bugs found and fixed
(browser-facing paths on the `admin.{ROOT_DOMAIN}` subdomain were
double-prefixed; a client-router redirect quirk needing a hard-nav
workaround), and the stale pre-board-redesign `NavItem` rows found and
cleaned in the real Neon `dev` tenant. Don't re-plan or re-build any of
this — what follows is context for *why* it's shaped the way it is, kept
for future reference:

- `BoardItem.slug` is assigned once in `createBoardItem`
  (`src/lib/actions/board-items.ts`) and never touched by `updateBoardItem`
  — verified by editing an existing item's name and confirming its
  detail-page URL didn't change. See
  [architecture.md](./architecture.md#data-model) for why this matters.
- R2 upload flow (`src/lib/storage/r2.ts`,
  `src/app/api/admin/upload-url/route.ts`,
  `src/lib/admin/upload-client.ts`) is implemented and was exercised for
  real, but **can't be fully verified yet** — the R2 bucket needs a CORS
  policy added (confirmed via an actual browser CORS rejection, not
  guessed) and `R2_PUBLIC_HOSTNAME` is still unset, both dashboard-only
  steps only you can do. See
  [external-services.md](./external-services.md#2-cloudflare-r2-object-storage--two-dashboard-steps-still-needed-now-that-phase-4s-upload-flow-exists).
- `updateSiteSettings` (`src/lib/actions/site-settings.ts`) normalizes
  `""` → `null` for `footerText`, per the concern originally raised here
  about `Footer.tsx`'s `??` fallback.
- Editing an existing `BoardItem` and saving does a real `update` (not
  just `create`) — verified explicitly with an edit-then-reload check
  against real Neon, not just the mockup's own (acceptable, documented)
  create-only shortcut.

## Phase 5 — Go live as tenant #1

- Create the real `Tenant` row for the owner's own site (replacing/renaming
  the `dev` seed tenant, or adding alongside it).
- Point the real domain at it once Vercel is provisioned (see
  [external-services.md](./external-services.md)).
- Populate real content through the finished admin panel.
- Exercise the custom-domain connection flow once, even though only tenant
  #1 uses it right now.
- Write an automated test that logs in as tenant A and asserts requesting
  tenant B's resource IDs 403s/404s — this is the single most
  security-critical behavior in the whole system and deserves a real test,
  not just the manual verification done in Phase 1.

## Phase 6 — Deferred (platform expansion, not needed for tenant #1)

Explicitly out of scope until there's a reason to build it:

- Platform superadmin dashboard (managing all tenants, impersonation).
- Stripe billing / subscription plans.
- Self-serve tenant signup flow (currently tenants are created via seed/
  internal path only — this is what keeps Phase 4's auth attack surface
  small).
- ~~Per-tenant theme customization UI~~ — done (2026-07-21), see
  [progress.md](./progress.md).
- Multiple users per tenant (`UserRole.TENANT_ADMIN` exists in the schema,
  reserved/unused — MVP is one owner per tenant).
- Apex-domain custom domains (CNAME-only for now — bare apex/ALIAS handling
  varies too much by registrar for a solo AI-coding maintainer to support
  well).

## Board redesign — schema/routing done (2026-07-15), admin CRUD still open

Originated from: operator-configured board count per pricing tier (not
tenant-facing self-service — the operator sets it per package at
provisioning, same internal/seed-only path tenants are already created
through), plus wanting a second board *kind* (single-photo grid tiles, no
detail page, alongside the existing multi-photo/detail-page kind). Full
reasoning in [decisions.md](./decisions.md#generic-boardboarditem-model-not-fixed-projectexhibition-2026-07-15).

**Done**: `Board`/`BoardItem`/`BoardItemPhoto`/`AboutPage` schema, real
migration against Neon, RLS + guardrail updated, all public routes
(`/board/{seq}`, `/board/{seq}/{itemSlug}`, `/about`), `PhotoGrid`/
`DetailTabs`/new `IndexTab` component updates, `nav-items.ts`'s
`resolveNavLabel()` fix (board name is single-sourced, matches the mockup's
own already-correct behavior), and the `resolve-tenant.ts` RLS bug this
surfaced — see [progress.md](./progress.md) for the full list and
verification steps taken.

**Done (2026-07-15)**: `design/admin-mockup.html` reworked to match —
data-driven `boards` array (any count, operator-provisioned, no
add/remove-board UI), generic board-list/item-editor views replacing the
old duplicated Photo/Work pair, `kind`-conditional editor sections
(GALLERY_SINGLE hides INDEX and caps photos at 1), `/board/{seq}` path
display, and visual kind differentiation (sidebar icon, list-header badge,
1:1 vs 4:3 grid ratio). Safe to build the real admin CRUD screens against
this mockup now — see [conventions.md](./conventions.md) if that file
covers mockup-to-real-code handoff notes, otherwise treat the mockup file
itself as current.

**Done (2026-07-20)**: the real public-site `PhotoGrid.tsx` had not been
caught up to the mockup's kind-differentiation from the 2026-07-15 entry
above — it rendered every board (GALLERY_MULTI and GALLERY_SINGLE alike)
with the same 4:3 photo + title/meta row. Fixed: `PhotoGrid` now takes a
`kind` prop; GALLERY_SINGLE renders 1:1 square tiles with no title/meta row
(name/date move to a native `title` tooltip, matching admin-mockup.html's
`siteCard()`), GALLERY_MULTI unchanged.

**Still open**:
- **The admin-facing UI to actually create/configure boards per tenant.**
  Nothing real exists yet (Phase 4 admin CRUD hasn't started). `Board.seq`
  needs to be assigned by whatever provisions a tenant (today: `prisma/seed.ts`,
  written to double as the reference implementation for this).
- Whether board count is derived from `Tenant.planTier` (reserved enum,
  currently just `FREE`) or is its own independent field the operator sets
  directly — not decided, decide when the provisioning flow is built.
- No upsell UI, no runtime limit-hit handling, no tenant-facing plan
  awareness needed for any of this (confirmed not tenant-facing).
