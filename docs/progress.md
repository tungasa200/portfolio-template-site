# Progress

Status as of 2026-07-15. Update this file whenever a phase in
[roadmap.md](./roadmap.md) moves forward — it's the fastest way for a fresh
session (on any machine) to know where things actually stand.

## Done

**Nav title area: fixed-height logo/site-name box + optional image logo (2026-07-16)**
- `Nav.tsx`'s title area (previously a bare `whitespace-nowrap` div with no
  explicit `line-height`) now sits in a box whose height is pinned to a
  `TITLE_LINE_HEIGHT` constant (`1.5rem`, matching `text-2xl`'s font-size at
  `line-height: 1`) — the divider line underneath never shifts by even 1px,
  regardless of whether it's rendering `siteName` text or a logo image of
  any aspect ratio. Text gets `line-height: 1` (closes the original
  misalignment) and is never truncated or wrapped: `useFitTextScale` (in
  `Nav.tsx`) measures the rendered text's `scrollWidth` against the box's
  `clientWidth` and, if it overflows, applies a uniform CSS `transform:
  scale(...)` (paint-only — doesn't affect layout, so the box's own fixed
  height never moves) to shrink the *whole name* down until it fits — the
  visitor always sees the complete site name, just smaller for an unusually
  long one, instead of an ellipsis-truncated fragment (an ellipsis version
  shipped first same-day, then was replaced per feedback that silently
  cutting off part of the name is a worse trade-off than a smaller-but-
  complete one). Re-measures once `document.fonts.ready` resolves (the
  Playfair Display webfont can swap after first paint and change the
  measured width) and on container resize via `ResizeObserver`.
  A logo image is rendered at `height: 100%`, `width: auto`,
  `object-fit: contain` — it scales to the fixed height without cropping;
  an unusually wide image just renders narrower (letterboxed) rather than
  ever exceeding the box.
- Both places that render this box — public `Nav.tsx` and the admin
  Settings logo preview (`SettingsForm.tsx`) — share one implementation,
  `src/components/site/SiteTitleBox.tsx` (`TITLE_LINE_HEIGHT` +
  `useFitTextScale` live there now, not duplicated), specifically so the two
  can't visually drift apart — what the operator sees in the preview is
  pixel-identical fit-behavior to what actually renders on the public site,
  just with admin-appropriate colors/font passed in via a `textStyle` prop
  (the admin bundle doesn't have the public site's `theme.css` tokens
  loaded, so it can't rely on the `font-site-display`/`--color-site-ink`
  CSS variables `Nav.tsx` uses).
- `SiteSettings.logoImageKey` (nullable, real migration
  `20260716002430_add_site_logo` applied to Neon) lets an operator upload an
  image logo that replaces the `siteName` text in `Nav` — same R2 "site"
  upload scope as the hero image, reusing `uploadImageToR2`/
  `getPresignedUploadUrl` as-is. `updateLogoImage`/`removeLogoImage`
  (`src/lib/actions/site-settings.ts`) best-effort delete the previous R2
  object on replace/removal (hero image's `updateHeroImage` doesn't do this
  — an existing, separate inconsistency, not touched here).
- Admin Settings (`SettingsForm.tsx`) gained a "메뉴 로고" card: an upload
  button, a live preview box that mirrors the real `Nav` sizing exactly (so
  what the operator sees in admin is what renders on the public site), and
  a "되돌리기" button (only shown once a logo is set) that reverts to the
  text `siteName`.
- **Real layout bug, found from a screenshot after first landing this**: the
  logo card initially reused `.admin-hero-photo-wrap`/`.admin-hero-edit-btn`
  (hero image's CSS) for its own preview+buttons — those classes hardcode a
  260px box with the edit button `position: absolute; bottom: 12px; right:
  12px` (an intentional Instagram-style overlay for the *hero photo*,
  wrong for the compact 24px-tall logo preview), so the upload button
  rendered on top of the site-name text instead of beside it. Fixed with
  dedicated `.admin-logo-editor`/`.admin-logo-preview`/`.admin-logo-btn`
  classes (`admin.css`) — a normal flex row, not an absolute overlay. Also
  caught along the way: the preview box's inline border color referenced a
  CSS var that doesn't exist here (`var(--border)`; this file's actual
  token is `--line`) — silently rendered no border color at all.
- Also on the same pass: the "대표 이미지" and "메뉴 로고" cards used to each
  be a full-width card holding a small (≤260px) control, leaving most of
  the card visibly empty — flagged directly from a screenshot as wasted
  space. Both now sit side by side in one `.admin-branding-row` (`display:
  grid; grid-template-columns: 1fr 1fr`, collapsing to one column under the
  existing 860px mobile breakpoint) instead of stacking full-width. Grid's
  default `align-items: stretch` makes both cards match the taller one's
  height; each card is a flex column with its editor control pinned via
  `margin: auto 0`, so the shorter card's control centers in the leftover
  space instead of the card just ending in dead space under it.
- "기본 정보" (siteName/photographerName/contactEmail/footerText form) moved
  to the top of the page, above the branding row — per your direct request,
  no other behavior change.
- Its "저장하기" button used to float in its own separately-margined `<div>`
  *below* the card (a pattern copied from `AboutEditor.tsx`/
  `BoardItemEditor.tsx`, where it reads fine since their editor content
  isn't itself a bordered card) — flagged from a screenshot as looking
  arbitrarily spaced, since here it competed visually with the actual
  bordered `admin-section-card` box above it. Moved inside the card as a
  `.admin-card-footer` (top border divider + right-aligned), so it reads as
  the card's own action row instead of an unrelated floating element. Not
  applied to About/BoardItem editors — not reported as a problem there and
  their layout is different (no boxed card wrapping the editor).
- Verified against real Neon + R2 (2026-07-16): logged in via
  `/api/auth/callback/credentials` and curl-fetched `/admin/settings` to
  confirm the new card renders; called `POST /api/admin/upload-url`
  directly and PUT a real test image straight to R2 with the presigned URL
  (curl isn't subject to the browser-only CORS block that's still pending
  per [external-services.md](./external-services.md#2-cloudflare-r2-object-storage--two-dashboard-steps-still-needed-now-that-phase-4s-upload-flow-exists),
  so this exercised the real R2 credentials/signature end-to-end); wrote/
  read back/reverted `SiteSettings.logoImageKey` via a throwaway script
  against the real `dev` tenant row to confirm the migration round-trips
  correctly. Test R2 object deleted afterward. **Not verified in an actual
  browser** (no headless-browser tool available in this session) — confirmed
  the expected markup/inline styles render server-side (including
  `transform:scale(1)` for the seeded `dev` tenant's short site name), but
  the `useFitTextScale` shrink-on-overflow behavior itself was never
  exercised against a genuinely long site name in a real viewport — worth an
  actual browser check with a long name before trusting it fully.

**Board/BoardItem schema redesign (replaces Project/Exhibition)**
- Real migration against Neon: dropped `Project`/`ProjectPhoto`/
  `Exhibition`/`ExhibitionPhoto`, added `Board`/`BoardItem`/
  `BoardItemPhoto`/`AboutPage`, reshaped `NavItem` around a
  `NavTargetKind` enum (`HOME`/`ABOUT`/`CONTACT`/`BOARD`/`EXTERNAL_URL`)
  with a `targetBoardId` FK — plus a DB-level `CHECK` constraint enforcing
  exactly one target payload is set per row. See
  [decisions.md](./decisions.md#generic-boardboarditem-model-not-fixed-projectexhibition-2026-07-15)
  for why.
- `prisma/security/rls.sql` and `TENANT_SCOPED_MODELS`
  (`tenant-scoped-client.ts`) updated to the new table set and re-applied
  to Neon, in that order (RLS before the app-layer guardrail — a
  deliberate sequencing rule, see the file comments) — verified via a
  throwaway script: app-layer cross-tenant reads return null/0 rows *and*
  an unscoped `app_runtime`-role query (no `set_config`) independently
  returns 0 rows (the RLS backstop working on its own).
- Routes: `photo/`, `work/` deleted; `board/[seq]/page.tsx`,
  `board/[seq]/[itemSlug]/page.tsx` (only reachable for `GALLERY_MULTI`
  boards — `notFound()`s otherwise), `about/page.tsx` added. `seq` is
  validated as a positive integer *before* the Prisma call so a garbage
  URL 404s instead of 500ing.
- `PhotoGrid` dropped the category/venue tag badge (items no longer have
  one) and made `href` optional (`GALLERY_SINGLE` items render as static,
  non-clickable tiles — no detail page exists to link to). New
  `IndexTab.tsx` generalizes the old Work-only, page-local `indexSlot`
  JSX into a real shared component driven by `BoardItem.indexEnabled`/
  `indexContent`, usable by any `GALLERY_MULTI` board's detail page —
  `DetailTabs`'s tab list is now built per-item instead of hardcoded per
  page type.
- `nav-items.ts` gained `resolveNavLabel()` alongside `resolveNavHref()`:
  for `BOARD`-kind nav items, the *board's own* `name` is authoritative,
  not `NavItem.label` — closes the exact label-drift bug already found
  and fixed once for `design/admin-mockup.html` (renaming a board used to
  require updating its name in two places that could disagree).
  `about/page.tsx` and `contact/page.tsx` apply the same fix directly
  (look up their own `NavItem` by `targetKind` for the page heading,
  rather than a hardcoded "ABOUT"/"CONTACT" string).
- **Found and fixed a real production bug while verifying this** (not
  something this change introduced — it predates it): `resolve-tenant.ts`
  fetched `siteSettings`/`navItems`/`socialLinks` as an `include` on the
  same unscoped Tenant-lookup query. Since RLS requires `forTenant()`'s
  `SET LOCAL` to have run first, and that query never went through
  `forTenant()`, **every tenant's nav links, social links, and site
  settings were silently empty** — masked because every consumer either
  optional-chained to a fallback (`?? tenant.slug`) or mapped over an
  empty array with no visible error. Only caught by grepping actual
  rendered HTML for expected nav text, not by the HTTP-200 checks used in
  every earlier verification pass. Fixed by splitting into two queries
  (unscoped tenant lookup, then everything else through
  `forTenant(tenant.id)`) — see decisions.md for detail. **Lesson: a 200
  status code proves the page rendered, not that it rendered the right
  data — check actual content, not just status, especially for anything
  behind RLS.**
- `prisma/seed.ts` rewritten: 2 `GALLERY_MULTI` boards ("WORK 1"/"WORK 2")
  + 1 `GALLERY_SINGLE` board ("GALLERY", proves the new kind end-to-end)
  + an `AboutPage` singleton, all seeded with `seq` assigned sequentially
  — written to double as the reference implementation for "operator
  provisions N boards for a new tenant" (see roadmap.md), not just
  throwaway seed logic.
- Verified end-to-end against real Neon (2026-07-15): full production
  `next build` succeeds, all new routes curl-tested (200s; invalid/unknown
  `seq` 404s, not 500s), INDEX tab only appears for items with
  `indexEnabled=true`, fullscreen deep-link (`?view=fullscreen&photo=N`)
  still works, nav/social links/site settings now genuinely render
  (previously silently empty per the bug above).
- **Not done yet**: the admin-facing UI to actually let an operator
  create/configure boards per tenant (still `design/admin-mockup.html`
  only, and that mockup itself still assumes exactly 2 fixed boards — it
  hasn't been updated for the new variable-board-count/kind model yet).
  Schema and public-site rendering are ready for it; the provisioning UI
  itself is unstarted. See [roadmap.md](./roadmap.md).

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

**Phase 4 — Admin CRUD + uploads (done, 2026-07-15)**
- Real admin panel built against `design/admin-mockup.html` as the
  interaction/copy spec, replacing the Phase 4a proof-of-life stub:
  Dashboard (Home — stats, hero preview, Quick Menu, page-visibility
  toggles), per-board item list (`board/[boardId]`, rename/reorder/publish
  toggle), the shared BoardItem editor (`board/[boardId]/[itemId]`, `new`
  included — date via a custom month picker, optional INDEX tab for
  `GALLERY_MULTI` only, photo manager), About editor, Settings (basic info +
  hero image + nav order/visibility + social links), Messages inbox. All
  under `src/app/admin/(dashboard)/`, styled by a new
  `src/app/admin/(dashboard)/admin.css` (mockup's CSS ported near-verbatim
  under an `.admin-root` scope, same "own theme, don't leak into other
  areas" principle as the public site's `theme.css`).
- Rich text (About's content, a `GALLERY_MULTI` item's INDEX content) uses
  Tiptap (`@tiptap/react` + `starter-kit`/`extension-underline`/
  `extension-link`, newly added deps) with a visual/HTML-source toggle —
  the mockup's plain `contentEditable` wasn't sufficient for real code, per
  the roadmap's own note.
- Server Actions, one file per concern under `src/lib/actions/`:
  `site-settings.ts` (normalizes `""` → `null` per the roadmap's explicit
  warning), `nav-items.ts`, `social-links.ts`, `about.ts`, `boards.ts`
  (rename only — no create/delete, matching the mockup's deliberate absence
  of board-provisioning UI), `board-items.ts` (create/update/delete/
  reorder/publish — `slug` is set once in `createBoardItem` and never
  touched by `updateBoardItem`, verified by editing an item's name and
  confirming its detail-page URL didn't change), `board-item-photos.ts`,
  `messages.ts`.
- R2 upload pipeline: `src/lib/storage/r2.ts` (presigned PUT, lazily
  constructed like `resend.ts` so a missing R2 key doesn't crash the app),
  `src/app/api/admin/upload-url/route.ts` (admin-only Route Handler,
  derives `tenantId` from the session and builds the R2 key itself — never
  trusts client input, per the roadmap), `src/lib/admin/upload-client.ts`
  (browser captures width/height via `Image()` decode, then PUTs directly
  to R2 with the presigned URL). `next.config.ts`'s `images.remotePatterns`
  wired to `R2_PUBLIC_HOSTNAME` (conditionally, since it's still unset —
  see below).
- **Two real bugs found and fixed while verifying against the actual
  `admin.{ROOT_DOMAIN}` subdomain (not `localhost:3000/admin` directly —
  see the next bullet for why that distinction mattered):**
  1. Every internal admin link/redirect (`Link` hrefs, `redirect()` calls,
     `NextAuth`'s `pages.signIn`/`signIn`/`signOut` `redirectTo` values —
     both mine and Phase 4a's pre-existing ones) was hardcoded with an
     `/admin/...` prefix. `proxy.ts` already rewrites
     `admin.{ROOT_DOMAIN}/foo` → `/admin/foo` invisibly to the browser, so
     any browser-facing link containing that prefix double-prefixes into a
     404 (`/admin/admin/foo`) the moment it's used on the actual subdomain.
     Every prior "verified end-to-end" claim for Phase 4a's login flow had
     only ever curl-tested `localhost:3000/admin/login` directly (root
     domain, no rewrite applied) — never the sanctioned subdomain — so this
     was never caught. Fixed by stripping the prefix everywhere (all
     `Link`/`redirect()` targets are now root-relative to the *rewritten*
     tree, matching the convention `src/lib/site/nav-items.ts` already used
     for the public site). `revalidatePath("/admin", "layout")` calls were
     deliberately left alone — that's Next's real file-system route path,
     unrelated to the browser-facing rewrite.
  2. Separately, even after fixing (1), a JS-enabled login intermittently
     rendered the *previous* route's cached content for one frame after the
     post-login redirect (confirmed via a no-JS control run and a raw
     `curl` with the session cookie — both correctly returned the
     dashboard; only the live browser's client-side transition showed the
     wrong page, and a manual reload always fixed it). Root-caused to
     Next.js's client router transitioning across `proxy.ts`'s rewrite
     boundary after a Server-Action-triggered redirect. Rather than debug
     Next's router further, sidestepped it: `signIn`/`signOut` now use
     `redirect: false` and return the target URL, and `LoginForm.tsx`/
     `AdminShell.tsx`'s logout button do a hard `window.location.href` nav
     instead of letting the client router handle it. See
     `src/lib/actions/auth.ts`'s top comment.
- **Also found (data, not code) while verifying**: the real Neon `dev`
  tenant's `NavItem` table had 4 stale rows left over from the
  pre-board-redesign schema — the 2026-07-15 board-redesign migration
  added `targetKind` with `DEFAULT 'HOME'` and backfilled every *old*
  NavItem row into it without deleting them (its own migration file says
  as much), leaving a duplicate "HOME" entry and rows mislabeled "PHOTO"/
  "WORK"/a duplicate "CONTACT" all masquerading as `targetKind='HOME'`.
  Confirmed by inspection, then deleted (with your go-ahead) — the
  sidebar's duplicate "HOME" entries were the visible symptom.
- **Still needs your Cloudflare dashboard input, not fixable in code** —
  see [external-services.md](./external-services.md#2-cloudflare-r2-object-storage--two-dashboard-steps-still-needed-now-that-phase-4s-upload-flow-exists):
  the R2 bucket has no CORS policy yet, so the browser-direct-to-R2 upload
  PUT is blocked (confirmed via the actual browser error, not guessed);
  and `R2_PUBLIC_HOSTNAME` is still blank, so even a photo that did upload
  has no URL to render yet — uploaded photos render as an empty placeholder
  tile until this is set. The upload/presign code itself is verified
  correct up to that point (presigned URL correctly issued and PUT
  correctly attempted, request just gets a CORS rejection).
- Verified end-to-end in a real browser (Playwright against a clean local
  dev server + the real Neon `dev` tenant, 2026-07-15): login → dashboard
  stats/hero/quick-menu render, page-visibility toggle flips and survives
  reload, board item drag-reorder persists after reload, editing an
  existing item's name saves and is reflected back in the list, creating a
  new item redirects into its own real (non-`"new"`) edit URL, deleting an
  item removes it and redirects to the list, About's rich editor
  (bold + HTML-source-view toggle) saves and survives reload, Settings'
  basic-info fields save and survive reload, adding a social link persists
  and survives reload, the Messages inbox renders a real seeded submission
  and its detail modal opens. Test data (a probe item, a footer-text
  change, a test social link, an About edit) was cleaned up afterward.

**Phase 4b — Admin UI design (superseded by Phase 4 above, 2026-07-15)**
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
- 🟡 Cloudflare R2 connected (bucket `portfolio-template`, credentials in
  `.env`) but two dashboard steps are still outstanding now that Phase 4's
  upload flow actually exists and needs them — CORS policy on the bucket,
  and `R2_PUBLIC_HOSTNAME` — see
  [external-services.md](./external-services.md#2-cloudflare-r2-object-storage--two-dashboard-steps-still-needed-now-that-phase-4s-upload-flow-exists).
- ⬜ Vercel — not yet provisioned.

**Conventions established**
- Commit message tags: see [conventions.md](./conventions.md).

## Not started

Phase 4 (admin CRUD + uploads) is done as of 2026-07-15 — see above. Next up
per [roadmap.md](./roadmap.md):
- The two R2 dashboard steps above (not blocking further coding work, but
  blocking an actual end-to-end photo-upload verification).
- Phase 5 — go live as tenant #1 (real `Tenant` row, Vercel + domain,
  populate real content through the now-finished admin panel, the
  tenant-isolation regression test).
- The admin-facing UI to actually *provision* boards for a tenant (create/
  configure, not just manage existing ones) is still unstarted — see
  roadmap.md's board-redesign section; today `prisma/seed.ts` is the only
  way a board comes into existence.
