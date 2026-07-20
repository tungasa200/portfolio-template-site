# Progress

Status as of 2026-07-20. Update this file whenever a phase in
[roadmap.md](./roadmap.md) moves forward — it's the fastest way for a fresh
session (on any machine) to know where things actually stand.

## Done

**Note on the 2026-07-20 entries below**: backfilled from `git log`/commit
diffs after the fact (the session's docs updates lagged the actual commits
that day), not written live during the work. Verification claims are
limited to what the commit diffs themselves show — none of these carry a
"checked in a real browser against Neon" note the way earlier entries do,
so treat that as still open unless a later session confirms it.

**Original-image lightbox, on-image badges removed, INDEX cover true aspect ratio, image:text ratio setting (2026-07-20)**
- New `ImageLightbox.tsx` (`yet-another-react-lightbox`) opens the original-
  resolution image with zoom/pan and dimensions/name/date captions, wired
  into GRID VIEW, SLIDE VIEW, and `GALLERY_SINGLE` list tiles (everywhere
  else on the public site renders the thumbnail added below, not the
  original).
- Removed the "COVER PHOTO"/"PHOTO NN" text badges overlaid on `IndexTab`,
  `PhotoGridDetail`, and `FullscreenViewer` images.
- INDEX tab's cover photo now renders at its real aspect ratio (stored
  `width`/`height`), falling back to the old fixed 4:3 crop only for photos
  uploaded before this migration.
- New admin-configurable INDEX image:text column-ratio setting (3:7 through
  7:3), `src/lib/site/index-image-ratio.ts`.
- Real migration for the new columns applied to Neon.

**No-scroll page height now derived from the flex layout, not a hardcoded 80px footer offset (2026-07-20)**
- Home/contact/slide-view sections were sized `calc(100vh-80px)`, assuming
  `Footer` always renders at exactly 80px. Real footer height (border +
  padding + line-height) doesn't reliably land on 80px, so the page drifted
  ~1px past the viewport and showed an unwanted scrollbar with nothing to
  scroll.
- Switched to `h-full`/`max-h-full` inheriting the remaining space the
  layout's own `flex-1` wrapper already computes around `Footer` — correct
  regardless of `Footer`'s actual rendered height. Touches
  `board/[seq]/[itemSlug]`, `contact`, and the root tenant `page.tsx`/
  `loading.tsx`.

**Admin mockup's drag-ghost fix ported to the real NavVisibilityList (2026-07-20)**
- The full-row drag image + drag-over highlight (added to
  `design/admin-mockup.html` in an earlier mockup-only pass, commit
  `f64a209`) had never been ported to the real component — the actual admin
  Settings nav-order list still dragged just the handle icon with no visual
  feedback. Ported to `src/components/admin/NavVisibilityList.tsx`.

**Original+thumbnail image pairs, crop editor, parallel uploads (2026-07-20)**
- Uploads were slow because `PhotoManager` uploaded multiple photos
  sequentially and every photo write re-fetched/re-revalidated individually.
- Every upload point (hero, logo, INDEX cover, board item photos) now
  stores a canvas-generated WebP thumbnail alongside the original, with a
  default center-crop and an optional `react-easy-crop`-based crop editor
  (`ThumbnailCropModal.tsx`) for adjusting the crop per upload.
- `r2.ts` presign now supports an `"original"`/`"thumb"` variant; new
  `getR2Object()` + `/api/admin/image-proxy` let the crop editor reload an
  already-uploaded original without needing R2 bucket CORS.
- `src/lib/admin/thumbnail.ts`: HEIC→JPEG normalization (applied to the
  stored original too, since non-Safari browsers can't render HEIC at all)
  plus a canvas crop/resize/WebP pipeline shared by the auto center-crop and
  the manual editor.
- Multi-file uploads now run in parallel and persist in one batched DB call
  instead of one write per photo.
- Public site prefers the thumbnail everywhere except the SLIDE VIEW's
  large active image, falling back to the original for photos uploaded
  before thumbnails existed.
- Nullable `thumbKey` columns added to `SiteSettings`/`BoardItem`/
  `BoardItemPhoto`; migration also records pre-existing DB drift as a
  baseline (large diff — 29 files, see commit `2351848` for the full list).

**SLIDE VIEW redesign: borderless image, centered thumbnails, nav arrows (2026-07-20)**
- Dropped the border around the main photo (read as a redundant frame),
  centered the thumbnail strip instead of left-aligning it, and added prev/
  next arrow buttons over the photo so slides can be navigated without
  scrolling to the thumbnails. Arrows reuse the sidebar collapse toggle's
  chevron style. `FullscreenViewer.tsx`.

**Board/about-page empty-state messages (2026-07-20)**
- Boards and the About page with no content now show a message instead of
  an empty grid/section (`PhotoGrid.tsx`, `about/page.tsx`). Shipped first
  as bordered boxes, then simplified same-day to plain centered text at a
  slightly larger size — the bordered box read as an odd empty card.

**INDEX tab gets its own opt-in cover image (2026-07-20)**
- Previously the INDEX tab's cover reused the item's primary body photo,
  with no way to skip it. New `BoardItem.indexImageEnabled`/`indexImageKey`
  make the cover its own toggle + single-image upload
  (`IndexImageUpload.tsx`), independent of the body/GRID VIEW photos. Real
  migration applied to Neon.

**Item title reset bug and empty INDEX cover box fixed (2026-07-20)**
- The title input reset while editing because the form Server Action's
  built-in uncontrolled-field reset kept snapping it back to the draft
  item's name captured at first-photo-upload time (see the draft-item entry
  below). Fixed by making it a controlled input in `BoardItemEditor.tsx`.
- The INDEX tab's cover column now only renders when the item actually has
  a primary photo, instead of always showing an empty "COVER PHOTO"
  placeholder box (`IndexTab.tsx`, `DetailTabs.tsx`).

**Admin home hero quick-upload inline (2026-07-20)**
- Replaced the dashboard's hero-image link (which sent the operator to
  Settings to upload) with an inline quick-upload control
  (`HeroImageQuickUpload.tsx`) directly on the Home dashboard. "Quick Menu"
  renamed to "Quick Upload"; the now-redundant About/site-settings shortcut
  buttons removed.

**New board items sort first, not last; home cover photo's border scoped to the placeholder state (2026-07-20)**
- New items were assigned `order: count` (the highest value), so they
  always sorted to the bottom of both the admin list and the public board
  page (both ordered `asc`). New items now get an `order` below the current
  minimum instead, so they land first (`board-items.ts`).
- The home hero's border was meant to frame the empty placeholder box only;
  it now stops rendering once a real photo is uploaded (`s/[tenant]/page.tsx`).

**New board item's photo manager now works before the first save (2026-07-20)**
- Previously a brand-new item showed no photo-add UI until the user saved a
  name first, since `BoardItemPhoto` needs a real `boardItemId` to attach
  to. Now the first photo picked silently creates the row itself
  (`createDraftBoardItem`) and the editor syncs its URL/action onto that
  row, so "저장하기" afterward updates it instead of creating a duplicate.

**Admin messages tab crash fixed; tenant cache switched to tag-only invalidation (2026-07-20)**
- `unstable_cache` round-trips values through JSON, turning
  `contactSubmission.createdAt` into a string on cache hits and crashing
  `formatKoreanDate`'s `Date.getMonth()` call — this made the admin Messages
  tab inaccessible after the first cold load. Fixed by coercing the cached
  value back to a `Date`.
- Also switched the tenant cache to tag-only invalidation (`revalidate:
  false`) since every write path already calls `updateTag`/
  `revalidateTenantSite` — the 1h timer was just adding unnecessary
  staleness on top of that.

**Small polish fixes (2026-07-20)**
- `.admin-root a { color: inherit }` was outranking the single-class color
  rule on `admin-hero-edit-btn`/`admin-btn-primary`/`admin-logo-btn`
  whenever they rendered as a `Link` instead of a `<button>`, making the
  text invisible against the dark pill background — fixed in `admin.css`.
- Gmail app-password field restyled to match the other admin inputs
  (`ReplyEmailSettings.tsx`).
- Removed hand-holding caption text under the hero/logo previews in
  Settings that just restated what was already visually obvious.

**Resend removed; contact-form notifications and admin replies both go through the tenant's own Gmail (2026-07-16)**
- Confirmed with the user: this template is meant to be sold to non-technical
  photographers, so requiring each buyer to sign up for Resend and verify a
  sending domain (impossible without a domain of their own, and a blocker
  for the "everything configurable via the admin UI" goal) wasn't viable.
  Resend's sandbox address (`onboarding@resend.dev`) can't fill the gap
  either — it can only deliver to the Resend account owner's own address,
  never to arbitrary tenant `contactEmail`s.
- Replaced with an opt-in Gmail SMTP connection per tenant (Settings →
  "이메일 답장 연동"): tenant enters their Gmail address + an app password
  (Google Account → Security → 2-Step Verification → App passwords), stored
  encrypted at rest (`SiteSettings.replyEmailAddress` /
  `replyEmailAppPasswordEnc`, AES-256-GCM via new `src/lib/crypto/secret-box.ts`,
  keyed by a new required `ENCRYPTION_KEY` env var). Sends go through
  nodemailer's Gmail transport (`src/lib/email/gmail-smtp.ts`).
- Two things now depend on that connection: contact-form notifications
  (`src/lib/actions/contact.ts`) and in-app admin replies
  (`src/lib/actions/messages.ts`, one-shot — `ContactSubmission.repliedAt`
  locks a message against a second reply). A tenant who hasn't connected
  Gmail gets neither — messages still land in `/admin/messages`
  unconditionally (DB write is the source of truth either way), they just
  don't get an inbox notification or the in-app reply option until they
  connect.
- Removed the `resend` package and `src/lib/email/resend.ts` entirely, and
  `RESEND_API_KEY`/`RESEND_FROM_EMAIL` from `.env`/`.env.example`.
- Verified locally: Playwright-driven pass through Settings (connect/see
  "연동됨"/disconnect) and Messages (reply form hidden before connecting,
  shown after, one-shot lock after a successful send, friendly error on bad
  credentials) — no real Gmail account was used for auth verification
  itself (that needs a real app password, not yet in hand), only the
  around-it wiring.

**Marketing placeholder page removed; root domain always serves the operator's tenant site (2026-07-16)**
- Confirmed with the user: this project will not build a separate public
  marketing/signup site. Deleted `src/app/page.tsx` (the "coming in Phase 6"
  placeholder). `proxy.ts` no longer has a passthrough fallback for the bare
  root domain — it always rewrites to `/s/{ROOT_TENANT_SLUG}/*` (the
  operator's own tenant site), except `/admin*` paths, which stay reachable
  at the bare root domain (needed on a shared `*.vercel.app` domain, where
  `admin.{root}` can never resolve). `ROOT_TENANT_SLUG` is now a required
  env var (`.env.example` updated) — if unset, the root domain 404s (other
  than `/admin`). Updated `README.md` and `docs/architecture.md`'s routing
  table to match; stripped stale "marketing" wording from
  `admin.css`/`theme.css` comments. Verified locally not yet re-checked
  against the live Vercel deployment — Vercel's `ROOT_TENANT_SLUG` env var
  must be set for the fix to take effect there (see the earlier report that
  `portfolio-template-site.vercel.app` was still showing the marketing
  placeholder — that was because the previous fallback-based `proxy.ts`
  needed `ROOT_TENANT_SLUG` set on Vercel too, and this hasn't been
  confirmed set yet).

**R2_PUBLIC_HOSTNAME set (Public Development URL) + a real crash found and fixed (2026-07-16)**
- `R2_PUBLIC_HOSTNAME` is now set in `.env` to a `pub-<hash>.r2.dev` Public
  Development URL (your choice over waiting for a real Custom Domain — see
  [external-services.md](./external-services.md#2-cloudflare-r2-object-storage--one-dashboard-step-still-open-cors)).
  `next.config.ts`'s `images.remotePatterns` only reads this at process
  start, so the dev server had to be restarted (not hot-reloadable) —
  restarting it is what surfaced the bug below.
- **Real bug, not just a config gap**: the moment `R2_PUBLIC_HOSTNAME` was
  set and the dev server restarted, `/board/[seq]/[itemSlug]?view=fullscreen`
  started 500ing. Root cause: `prisma/seed.ts`'s sample photos predate
  Phase 4's real upload pipeline and carry fake `r2Key` values like
  `placeholder/nord-audio/shot-1` (never real R2 objects). Once
  `r2PublicUrl()` started producing real URLs for real Neon rows (this
  session's earlier "public site renders real photos" work), it produced a
  URL for this fake key too — `https://pub-.../placeholder/nord-audio/shot-1`
  — whose path doesn't match `next.config.ts`'s `pathname: "/tenants/**"`
  restriction, so `next/image` threw `Invalid src prop ... hostname is not
  configured` and crashed the whole page instead of degrading. Any
  malformed/foreign `r2Key` value would trigger the same crash, not just
  this specific seed data. Fixed by moving the validation into
  `r2PublicUrl()` itself: it now returns `null` (→ existing placeholder
  fallback) for any key that doesn't start with `tenants/`, instead of
  handing next/image a URL it can't render — the seed placeholders (left
  as-is, not reseeded — the DB row is authoritative either way) now
  correctly show the placeholder pattern again instead of 500ing.
- **Verified genuinely end-to-end** (2026-07-16): presigned + PUT a real
  test image to a real board-item's real R2 path via the actual admin API
  (`curl`, bypasses browser CORS — the still-open CORS dashboard step
  doesn't block this kind of test), confirmed the object is publicly
  fetchable via the new `pub-*.r2.dev` hostname, temporarily pointed one
  seeded `BoardItemPhoto` row at it (direct Neon write, owner role,
  reverted after), and confirmed the real photo renders through
  `next/image`'s optimizer (`/_next/image?url=...`) with real PNG bytes
  coming back — in the board list cover, GRID VIEW, and SLIDE VIEW
  (`object-contain`, confirming that tab's aspect-ratio-preserving sizing
  from the earlier SLIDE VIEW work actually behaves as intended with a
  real photo, not just in theory). Test data and the test R2 object were
  cleaned up afterward; `next build` still passes.
- **Still open**: the CORS policy dashboard step (see
  external-services.md) — this session's verification used `curl`
  throughout, which isn't subject to browser CORS, so an actual browser
  upload through the admin UI is still unconfirmed until that's added.

**R2 uploads now nest by board/item (and hero/logo) instead of one flat pile (2026-07-16)**
- **Found from a direct question, not a bug report**: `buildR2Key()`
  (`src/lib/storage/r2.ts`) only ever took a broad `"board-items" | "site"`
  scope, so every photo from every board/item for a tenant landed in one
  flat `tenants/{tenantId}/board-items/` folder — distinguishable in the
  R2 dashboard only by random UUID filename, with zero way to tell which
  post a given file belonged to just by browsing the bucket. `"site"` was
  the same for hero and logo images (both landed in one `.../site/`
  folder). None of this affected the app itself (`BoardItemPhoto.r2Key` in
  the DB is the real source of truth, not the folder path) — purely a
  bucket-hygiene/manual-browsing problem.
- `buildR2Key()` now takes a discriminated `R2UploadScope`:
  `{ kind: "board-item", boardId, itemId }` →
  `tenants/{tenantId}/board-items/{boardId}/{itemId}/{uuid}.ext`, or
  `{ kind: "site", slot: "hero" | "logo" }` →
  `tenants/{tenantId}/site/{hero|logo}/{uuid}.ext}`. Threaded through
  `POST /api/admin/upload-url` (now parses/validates the scope object
  instead of a bare string), `uploadImageToR2()`
  (`src/lib/admin/upload-client.ts`), `PhotoManager.tsx` (gained a
  required `boardId` prop, passed down from `BoardItemEditor.tsx`, which
  already had it), and `SettingsForm.tsx`'s two upload handlers
  (`hero`/`logo` slots).
- `boardId`/`itemId` arrive as ordinary client input to the presign route
  (unlike `tenantId`, always session-derived) and are only ever used as R2
  key path segments, never for authorization — but validated as real UUIDs
  (`isValidR2PathSegment()`) before use, so a malformed/adversarial value
  (e.g. `../../evil`) can't inject extra path segments into the key.
  `slot` is constrained to the 2-value enum the same way.
- **Existing already-uploaded photos keep their old flat-structure keys**
  — no migration/re-key of files already in R2, since `BoardItemPhoto.r2Key`
  in the DB is what's authoritative either way, not the folder they happen
  to sit in. Only new uploads from this point on use the nested structure.
- Verified against the real admin API (2026-07-16): presigned a real
  board-item upload and confirmed the returned key nests under the real
  boardId/itemId; presigned hero and logo uploads and confirmed
  `site/hero/`/`site/logo/` respectively; confirmed a path-traversal
  attempt in `boardId`, an invalid `slot` value, and the old flat-string
  scope shape are all rejected with 400. Full `next build` passes.

**Public site now renders real photos, not just placeholders (2026-07-16)**
- **Found while doing the SLIDE VIEW height work below**: despite Phase 4's
  admin upload pipeline being fully wired (R2 presign, `width`/`height`
  captured per `BoardItemPhoto`), the entire public site — hero, board list
  grid, item detail's GRID VIEW, item detail's SLIDE VIEW + its thumbnail
  strip — was still 100% placeholder-pattern boxes. Nothing had ever wired a
  real `<Image>` using `r2PublicUrl()`. Not previously documented as an open
  item anywhere; found by inspection, not by a bug report.
- Fixed across all four: `PhotoGrid.tsx`, `PhotoGridDetail.tsx`,
  `FullscreenViewer.tsx` (main photo + thumbnails), and the home hero
  (`src/app/s/[tenant]/page.tsx`) now take an optional `imageUrl` and render
  `next/image` when it's non-null, falling back to the existing
  `site-placeholder-pattern` box when it's null (no photo yet, or
  `R2_PUBLIC_HOSTNAME` unset — see below). URLs are always computed
  server-side via `r2PublicUrl()` in the page component and passed down as a
  plain string prop — none of these are Server Components importing the
  `server-only` `r2.ts` module directly.
  - Cover photos (`PhotoGrid` list tiles) query
    `photos: { where: { isPrimary: true }, take: 1 }` — the same pattern
    already used by the admin board list page, relying on
    `board-item-photos.ts`'s invariant that exactly one photo is
    `isPrimary` whenever an item has any.
  - `object-fit` choice is deliberate per spot: list/grid tiles and
    thumbnails use `cover` (small fixed tiles read better cropped-to-fill);
    the SLIDE VIEW main photo and the hero use `contain`/`cover`
    respectively — SLIDE VIEW specifically never crops, since its box is
    now a fixed *height* (see below) with the rendered image's width
    following each photo's real aspect ratio, the whole point of that
    change.
- **Not verified visually** — `R2_PUBLIC_HOSTNAME` is still blank (see
  [external-services.md](./external-services.md#2-cloudflare-r2-object-storage--two-dashboard-steps-still-needed-now-that-phase-4s-upload-flow-exists)),
  so `r2PublicUrl()` returns `null` everywhere right now and every spot
  above still renders its placeholder fallback — confirmed via curl that
  all affected routes still 200 and the placeholder markup renders with no
  broken `<img>` tags, but the actual "real photo renders correctly sized"
  path is unexercised until that env var is set. `next.config.ts`'s
  `images.remotePatterns` (already conditionally wired to
  `R2_PUBLIC_HOSTNAME` since Phase 4) needs that same value to allow
  `next/image` to load from R2 at all — worth a real browser check once
  it's set.

**SLIDE VIEW (renamed from FULLSCREEN VIEW) fills the viewport height, no page scroll (2026-07-16)**
- Tab label changed to "SLIDE VIEW" (`board/[seq]/[itemSlug]/page.tsx`) —
  internal `key: "fullscreen"` and the `?view=fullscreen&photo=N` URL
  scheme deliberately left unchanged, only the visible label moved.
- The item detail `<section>` is now viewport-height-locked like
  home/contact (`h-[calc(100vh-80px)] max-h-[...] overflow-hidden flex
  flex-col`, same 80px-matches-real-Footer-height value used elsewhere).
  `DetailTabs` splits into a fixed-height `Tabs` row (`shrink-0`, as does
  `SectionHeader` now) and a `flex-1 min-h-0 overflow-y-auto` content
  region — INDEX/GRID VIEW get a scroll *fallback* there if their content
  is taller than the viewport (unchanged from before, just contained
  instead of growing the page), while `FullscreenViewer` sizes itself to
  `h-full` and is expected to never trigger that scroll.
  `FullscreenViewer`'s image box changed from a fixed `aspect-video` (16:9)
  to `flex-1 min-h-0` — it now takes whatever height DetailTabs hands it
  instead of a fixed ratio, which is what makes the real-photo
  `object-fit: contain` behavior above meaningful (previously any real
  photo would've had to crop to fit the fixed 16:9 box).
- Verified against real Neon (2026-07-16): curl-confirmed the new fixed-
  height classes and "SLIDE VIEW" label render on a real `dev` tenant board
  item, GRID/INDEX tabs still 200, and the `?photo=N` deep-link still
  resolves to the correct photo label.

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
- ✅ Cloudflare R2 connected and fully working for local dev (2026-07-16):
  CORS policy added and verified against a real preflight, `R2_PUBLIC_HOSTNAME`
  set via a Public Development URL (`pub-*.r2.dev`, temporary — swap to a
  real Custom Domain once Vercel/a real domain exist) — see
  [external-services.md](./external-services.md#2-cloudflare-r2-object-storage--done-for-local-dev).
- ⬜ Vercel — not yet provisioned.

**Conventions established**
- Commit message tags: see [conventions.md](./conventions.md).

## Incidents

**Prisma `startsWith` matched every row (2026-07-20)**
- While cleaning up throwaway test `BoardItem` rows (created while verifying
  the two admin-editor bug fixes above), ran
  `db.boardItem.deleteMany({ where: { name: { startsWith: "___" } } })` to
  remove rows named like `___VERIFY_TITLE_BUG___`. Postgres `LIKE` treats
  `_` as a single-char wildcard, so the compiled pattern (`___%`) matched
  *any* name of 3+ characters — it deleted all 23 real `BoardItem` rows on
  the `WORK 1` board for the `dev` tenant, not just the test rows.
- Confirmed with the user this was dummy/placeholder content (no real
  customer data yet, per this file's own status — Phase 5 go-live hasn't
  happened), so no restore was needed; recreated 3 placeholder rows
  (`Still Water Co.`, `Field Apparel`, `Nord Audio`) to leave the board
  non-empty. Had this been real tenant content, the fix would have been a
  Neon point-in-time restore instead.
- Convention added to prevent a repeat:
  [conventions.md](./conventions.md#prisma-7-not-56)'s Prisma 7 notes now
  call out that `startsWith`/`endsWith`/`contains` don't escape `_`/`%`.
- Also noticed in passing while verifying the fixes: local-dev R2 uploads
  currently fail client-side with a CORS error (`Access to fetch at
  '...r2.cloudflarestorage.com/...' ... blocked by CORS policy`) — this
  contradicts the "✅ CORS policy added and verified" note above
  (2026-07-16). Worked around it in the Playwright verification by
  intercepting the PUT request rather than fixing the bucket's CORS config.
  Not yet investigated further — flagging here since it means real local
  photo uploads are currently broken, not just this test run.

## Not started

Phase 4 (admin CRUD + uploads) is done as of 2026-07-15 — see above. Next up
per [roadmap.md](./roadmap.md):
- Phase 5 — go live as tenant #1 (real `Tenant` row, Vercel + domain,
  populate real content through the now-finished admin panel, the
  tenant-isolation regression test).
- The admin-facing UI to actually *provision* boards for a tenant (create/
  configure, not just manage existing ones) is still unstarted — see
  roadmap.md's board-redesign section; today `prisma/seed.ts` is the only
  way a board comes into existence.
