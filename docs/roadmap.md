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
  hero image, contact info, footer text), Project CRUD, Exhibition CRUD,
  photo upload + reordering, ContactSubmission inbox.
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

## Pending design decision — per-tenant board count set at onboarding (not started)

2026-07-15: user wants pricing tiers (roughly 2 so far, not finalized) to
differ partly by **how many boards** a tenant gets. Important clarification
after initial confusion: this is **not** a tenant-facing self-service
feature. The tenant/photographer never sees an "add a board" button or an
upgrade/limit prompt in their own admin. Instead, **the operator (the user
selling this, not the end customer) sets the board count as a custom
setting each time they provision a new customer's tenant** — the same
seed/internal-only path tenants are already created through (see Phase 6's
"self-serve tenant signup" item — still not needed). A tenant's admin
simply renders however many boards were configured for it; there's nothing
for the tenant to hit a limit on.

This still **reopens** the Phase 4b mockup decision in
[progress.md](./progress.md) that boards are "exactly 2 fixed gallery-type
boards, not a user-defined N-board CMS" — the count needs to become a
per-tenant, operator-set value instead of a hardcoded 2 — but the scope is
much smaller than a self-service N-board CMS would have been. No upsell
UI, no runtime limit-hit handling, no tenant-facing plan awareness at all.

Explicitly decided (2026-07-15): keep working on the current detail-screen
polish pass with the fixed-2-board assumption for now; design this as a
**separate, later round**. When that round starts:
- Add a per-tenant board configuration (e.g. a `boardCount` field, or a
  small config listing which board types are enabled) — likely on `Tenant`
  or `SiteSettings` in `prisma/schema.prisma`.
- The admin UI (sidebar, dashboard) needs to render N board sections driven
  by that config instead of two hardcoded ones. The mockup's own routing
  comment already anticipated boards resolving through one generic dynamic
  route rather than fixed `/photo`, `/work` folders — revisit whether that
  generic-board approach is now the right level of investment, or whether
  a lighter-weight "config picks which of a small fixed set of board types
  are on" model covers what's actually needed.
- `Tenant.planTier` (`prisma/schema.prisma`) already exists as a reserved
  enum, currently just `FREE` — decide whether board count is derived from
  planTier or is its own independent field the operator sets directly
  (simpler, and matches "operator sets a custom setting per package" more
  literally than deriving it from a plan label).
