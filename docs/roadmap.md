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

## Phase 4 — Admin CRUD + auth + uploads

This is the phase that closes two loops left open in Phase 1:

- **Auth.js (NextAuth v5) wiring**: Credentials provider, bcrypt password
  hashing, session cookie gating `admin.{ROOT_DOMAIN}`. Login-attempt
  counting / lockout for brute-force protection (see
  [decisions.md](./decisions.md#authjs-self-hosted-not-clerk) for why this
  needs care).
- **`SET LOCAL app.tenant_id` in `forTenant()`**: wrap tenant-scoped
  mutations in an explicit transaction that sets the Postgres session
  variable first, so the RLS policies in `prisma/security/rls.sql` become
  load-bearing. Only *after* this lands: apply `rls.sql` to Neon.
- Admin pages: dashboard, SiteSettings editor (nav items, social links,
  hero image, contact info, footer text), Board/BoardItem CRUD (per-tenant
  board provisioning — see the board-redesign section below), photo upload
  + reordering, ContactSubmission inbox.
- R2 upload flow: presigned PUT URL issued by an admin-only Route Handler
  that derives `tenantId` from the session and builds the R2 key itself
  (`tenants/{tenantId}/...`) — never trust a client-supplied path or
  tenantId. Client captures image `width`/`height` via `Image()` decode
  before requesting the presign.
- `next/image` + R2: connect a custom domain to the R2 bucket
  (`R2_PUBLIC_HOSTNAME`), allowlist it in `next.config.ts`
  `images.remotePatterns`.
- **SiteSettings save action must normalize empty strings to `null`**:
  `src/components/site/Footer.tsx` already falls back to
  `` © ${year} ALL RIGHTS RESERVED `` via `footerText ?? ...`, but `??`
  only triggers on `null`/`undefined`, not `""` — if the admin form saves
  an empty string when the field is left blank, the fallback silently
  never fires. The Server Action must coerce `""` -> `null` before writing.
- **Must-check when porting `design/admin-mockup.html`'s editor screens to
  real code**: the mockup's save handlers only ever push a *new* row —
  editing an *existing* Project/Exhibition and hitting "저장하기" doesn't
  persist any field (name, date, published, INDEX content, photos) back to
  the mockup's in-memory array, it just toasts and navigates away. That's
  an acceptable mockup shortcut (per the user, 2026-07-15: mockups don't
  need fully correct behavior), but the real Server Action **must** do a
  proper `update` for existing rows, not only `create` for new ones —
  verify this explicitly with a real edit-and-reload check before calling
  the CRUD screens done, since a mockup that silently "worked" by only
  ever hitting the create path is exactly the kind of gap that's easy to
  carry into real code unnoticed.

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
- Per-tenant theme customization UI (the token architecture in Phase 2
  supports this later without a rewrite — `SiteSettings.themeName` field
  already exists in the schema, reserved/unused).
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
