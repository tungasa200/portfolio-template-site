# Progress

Status as of 2026-07-14. Update this file whenever a phase in
[roadmap.md](./roadmap.md) moves forward — it's the fastest way for a fresh
session (on any machine) to know where things actually stand.

## Done

**Contact form → email notification (Resend)**
- `submitContactForm` (`src/lib/actions/contact.ts`) now sends a real email
  to the tenant's `SiteSettings.contactEmail` via Resend
  (`src/lib/email/resend.ts`) whenever someone submits `/contact` — DB write
  stays first/authoritative (full message kept as backup, your choice), the
  email is best-effort with `replyTo` set to the visitor's address.
- The form's `ATTACHMENT` field (rendered since Phase 2, never wired) is now
  read from `FormData`, validated (≤10MB, JPG/PNG/PDF), and attached
  directly to the email — no R2 involved, that's a separate/larger Phase 4
  item. `next.config.ts` raises the Server Actions body-size cap from
  Next.js's 1MB default to 11MB so this doesn't silently break above 1MB.
- Admin panel does not yet show these messages anywhere real (Messages
  inbox is still just the Phase 4b mockup) — email is the only notification
  channel right now.
- Verified against real Neon + Resend (2026-07-14): submitted the actual
  form via `submitContactForm` with a real attachment, confirmed the
  `ContactSubmission` row (read back through `forTenant()` — an unscoped
  read now correctly returns nothing, RLS working as expected), confirmed a
  bad attachment type is rejected with a friendly error, and confirmed the
  email itself physically arrived with the attachment.
- Needs your Resend API key in `.env` on any other machine — see
  [external-services.md](./external-services.md#3-resend-contact-form-email-notifications--needs-your-api-key).

**Phase 4b — Admin UI design (in progress)**
- No production code yet — mockup-first per your request, since (unlike
  the public site) there's no existing visual design for admin. Working
  design file: **`design/admin-mockup.html`** — a self-contained clickable
  HTML/JS prototype (open it directly in a browser, or paste into an
  Artifact to get a shareable link). Not the same `.dc.html` Claude Design
  format as `Photographer Portfolio.dc.html` — plain HTML/CSS/vanilla JS.
- Settled design decisions so far (all reflected in the mockup, not yet in
  real code):
  - Dark sidebar nav shell (not a top tab bar — tried and reverted).
  - Photo/Work stay exactly 2 fixed gallery-type boards, not a
    user-defined N-board CMS (an earlier, larger ask for that was
    explicitly descoped) — though board *count* being operator-configured
    per tenant is now a pending, separate decision, see
    [roadmap.md](./roadmap.md#pending-design-decision--per-tenant-board-count-set-at-onboarding-not-started).
    Each board's *display name* is user-editable (inline ✏️ next to the
    title). **URL path is not editable** (2026-07-15: reversed — judged
    too risky, broken bookmarks/backlinks/SEO churn with no undo. Paths
    are fixed: `/photo`, `/work`, `/about`, matching the real app's
    already-fixed route folders — no mismatch to reconcile).
  - Third fixed section **About** (`/about`) — static page, rich-text
    editor with a visual/HTML-source toggle (real implementation needs an
    editor library that supports raw HTML, e.g. Tiptap with a source-view
    extension — not WYSIWYG-only).
  - **Item model, identical for both boards**: name + a single date
    (`<input type="month">`, never a typed range) + photos. No
    category/venue, no per-photo caption. Thumbnail = whichever photo is
    ⭐ (first) in the item's photo list, not a separate field.
  - **Detail page unified to 3 tabs for both boards** (previously Photo
    was 2-tab, Work was 3-tab in the original design):
    INDEX (per-item on/off toggle, same rich editor as About) / GRID VIEW /
    FULLSCREEN VIEW, where GRID and FULLSCREEN share the exact same photo
    set (confirmed against `design/Photographer Portfolio.dc.html`'s
    work-detail markup).
  - "+ NEW" opens the full item editor directly (no intermediate modal —
    tried, then removed) with name/URL/page-title all updating live as
    you type; the item isn't added to the list until "저장하기" actually
    succeeds (name required).
  - Dashboard (Home) has instant-apply page-visibility toggles, reading/
    writing the same `NavItem.isVisible` state as Settings' own list — the
    two must stay in sync (mockup fixed a real bug here: toggling used to
    only change CSS, not the underlying data).
  - Card grids must pixel-match the real `PhotoGrid` component
    (`src/components/site/PhotoGrid.tsx`) exactly — gap, aspect ratio, tag
    position, serif+mono type pairing.
- Still open: Site Settings full field list, Messages inbox detail
  interactions, actual porting plan into `src/app/admin/(dashboard)/...`.
- Process note: this phase had a real correction mid-stream — a screen was
  built without re-reading `design/Photographer Portfolio.dc.html`'s
  detail-page markup first, and missed the INDEX-tab structure entirely.
  Re-verify against that file (and `prisma/schema.prisma`) before extending
  this mockup further, per-screen, every time — don't rely on what was
  already covered earlier in a session.

**Phase 4a — Auth.js + RLS foundation**
- Auth.js (NextAuth v5) wired: `src/lib/auth/auth.ts` (Credentials provider,
  JWT sessions, `bcryptjs` password check), `src/lib/auth/tenant-context.ts`
  (`getCurrentTenantContext()` — the only sanctioned source of `tenantId`
  for admin mutations going forward). Login-attempt lockout (5 attempts →
  15 min, `User.failedLoginAttempts`/`lockedUntil`, real migration
  `20260714145612_add_login_lockout`).
- `admin.{ROOT_DOMAIN}` is now actually gated: `src/app/admin/(dashboard)/`
  route group calls `getCurrentTenantContext()`; `/admin/login` (public)
  sits outside it. Old unauthenticated stub deleted.
- `forTenant()` (`tenant-scoped-client.ts`) now wraps every tenant-scoped
  operation in a `$transaction` running `set_config('app.tenant_id', ...,
  true)` first — Prisma's documented RLS extension recipe.
- **RLS applied to Neon and verified genuinely enforcing** — with a real
  finding along the way: Neon's default owner role has `BYPASSRLS` by
  default, which made the first `rls.sql` apply a complete no-op (unscoped
  reads still returned every row). Fixed by creating a dedicated
  `app_runtime` role with no `BYPASSRLS`
  (`prisma/security/create-app-role.sql`) — `DATABASE_URL` now connects as
  that role; `DIRECT_URL`/`prisma/seed.ts` keep the owner role (trusted
  CLI-only paths). Confirmed after the fix: unscoped raw query on `Project`
  returns 0 rows, `forTenant()` still returns the real 6. See
  [architecture.md](./architecture.md#cross-tenant-isolation-two-layers).
- Seeded a dev admin login (`admin@dev.local`, dev-only password printed by
  `npm run db:seed` — not meant to survive to Phase 5's real go-live).
- Verified end-to-end against real Neon (2026-07-14): full login flow via
  NextAuth's `/api/auth/callback/credentials` (session cookie → dashboard
  renders real tenant data), 5 wrong passwords locks the account (6th
  attempt rejected even with the correct password), `/admin` redirects to
  `/admin/login` when logged out, all Phase 2/3 public routes re-checked
  post-RLS to rule out the "silent zero rows" outage the old `rls.sql`
  warning flagged.
- Not in this round (next up): SiteSettings/Project/Exhibition admin CRUD
  UI, ContactSubmission inbox, R2 upload flow — see
  [roadmap.md](./roadmap.md) Phase 4's remaining bullets.

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
  rehearsed locally. Applied to Neon and verified enforcing in Phase 4a
  below, once `SET LOCAL` wiring and a non-`BYPASSRLS` app role landed.
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

Rest of Phase 4 — see [roadmap.md](./roadmap.md). Next concrete task: admin
CRUD (SiteSettings editor, Project/Exhibition management + photo
reordering, ContactSubmission inbox) and the R2 presigned-upload flow, both
now unblocked by Phase 4a's auth/session foundation.
