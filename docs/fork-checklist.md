# Customer fork checklist

This repo is developed as a **dev master template** — see
[decisions.md](./decisions.md#per-customer-fork--dedicated-vercel-deployment-not-one-shared-multi-tenant-instance-2026-07-16).
Each customer gets their own copy of this codebase, customized, deployed as
its own separate Vercel project with its own Neon database and R2 bucket.
This file is the step-by-step for cutting a new fork — run through it top to
bottom each time.

`tools/fork-setup/` (see its own README) automates every **[auto]** row
below — run `python tools/fork-setup/main.py` (or `--dry-run` to preview
first) instead of doing these by hand. The **[manual]** rows still have to
be done yourself; the tool prints a reminder of which sections are left when
it finishes.

**Legend:**
- **[auto]** — mechanical once the required value is known; a script or AI
  agent can do this without logging into any external account.
- **[manual]** — needs a human: an external service's dashboard/account
  login (see [external-services.md](./external-services.md)'s "none of
  these can be provisioned by an AI coding agent" note), a business
  decision (domain, naming), or hands-on verification against a live site.

## 1. Strip master-only content

- [ ] **[auto]** Delete `tools/admin-credential-tool/` entirely. It exists
  only so this dev master can mint its own admin credentials — customers
  are never given a way to self-provision admin accounts. See
  [decisions.md](./decisions.md#per-customer-fork--dedicated-vercel-deployment-not-one-shared-multi-tenant-instance-2026-07-16).
- [ ] **[auto]** Drop `design/` (mockup HTML, thumbnails, `support.js`) —
  design-phase artifacts, not runtime code.
- [ ] **[manual]** Decide whether `docs/` ships with the fork. Judgment
  call, not a mechanical step: keep it if you're still maintaining the fork
  yourself, drop it if you're handing the repo off. (The deletion itself,
  once decided, is [auto].)
- [ ] **[auto]** `.claude/settings.local.json` doesn't need to travel — it's
  local tool config, not project config.

## 2. Provision new external services (never share with another fork)

Per [decisions.md](./decisions.md#per-customer-fork--dedicated-vercel-deployment-not-one-shared-multi-tenant-instance-2026-07-16),
each fork gets its own dedicated instance of everything — sharing any of
these across customers means one leaked credential exposes every customer.
Every item in this section is **[manual]** — each requires logging into an
account (Neon / Cloudflare / Vercel) that an agent has no access to.

- [ ] **[manual]** New Neon project/database.
- [ ] **[manual]** Once the new database's connection string is in hand: run
  `prisma/security/create-app-role.sql` to create the `app_runtime` role,
  then `prisma/security/rls.sql` for tenant-isolation policies (see
  [external-services.md](./external-services.md#1-neon-postgres--done-for-this-project)).
  Running the SQL itself is mechanical, but it needs a password you set by
  hand in a local, uncommitted copy first — treat the whole step as manual.
- [ ] **[manual]** New R2 bucket + new R2 API token — do not reuse another
  fork's bucket or key.
- [ ] **[manual]** New Vercel project (not a new environment on an existing
  one).

**[auto]** Once the above exist and their connection strings/keys are in
`.env`: applying the schema (`npx prisma migrate deploy`, or `db push` for a
throwaway setup) is a scriptable CLI step, no dashboard needed.

## 3. Set per-site `.env` values

Every value below must be regenerated or re-pointed per fork — see
[.env.example](../.env.example) for the full rationale behind each one.

- [ ] **[manual]** `DATABASE_URL` / `DIRECT_URL` — copied from the Neon
  dashboard for the new project (pooled `app_runtime` role / direct owner
  role respectively).
- [ ] **[manual]** `ROOT_DOMAIN` — the customer's real apex domain; a
  business decision plus proof of domain ownership.
- [ ] **[manual]** `ROOT_TENANT_SLUG` — the customer's tenant slug (naming
  decision, not `dev`).
- [ ] **[manual]** `HAS_CUSTOM_DOMAIN` — depends on verifying the wildcard
  DNS record actually resolves; leave `"false"` until that's confirmed. See
  [external-services.md](./external-services.md#4-vercel--deployed-on-the-shared-default-domain-no-custom-domain-by-choice).
- [ ] **[auto]** `AUTH_SECRET` — pure random generation
  (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`),
  no external dependency. Never reuse across forks.
- [ ] **[auto]** `ENCRYPTION_KEY` — same generation method, no external
  dependency. Never reuse across forks (rotating it later locks out any
  Gmail app password already stored under the old key).
- [ ] **[manual]** `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` /
  `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` / `R2_ENDPOINT` /
  `R2_PUBLIC_HOSTNAME` — copied from the Cloudflare dashboard for the new
  bucket + token created in step 2.
- [ ] **[manual]** Set all of the above in the new Vercel project's env vars
  (Production **and** Preview) — Vercel doesn't read the local `.env`, and
  this needs Vercel account access (dashboard or an authenticated `vercel`
  CLI session).
- [ ] **[manual]** Update the R2 bucket's CORS `AllowedOrigins` to the
  customer's actual `admin.{domain}` (and the Vercel `*.vercel.app` URL if
  used before the custom domain is live) — Cloudflare dashboard.

## 4. Update hardcoded branding in code

All **[auto]** — mechanical text edits once the target values are decided.
The values themselves (what to name the site) are a quick business call,
not an external-account dependency.

- [ ] **[auto]** `package.json` — `"name"` (currently
  `photographer-portfolio-saas`).
- [ ] **[auto]** `src/app/layout.tsx` — `metadata.title` /
  `metadata.description` (currently "Photographer Portfolio Platform" /
  generic multi-tenant description).
- [ ] **[auto]** `README.md` — replace the dev-master quick-start/docs-index
  content with whatever's useful for this fork's actual operator.
- [ ] **[auto]** `template.code-workspace` — rename/adjust if you want the
  workspace file to reflect the customer project, purely cosmetic.

## 5. Trim development-history comments

The master repo's docs and some source comments carry dated, "why we found
this" development notes that make sense for an actively-developed master
template but not for a shipped customer fork. All **[manual]** here — this
is a judgment call about what history is safe to lose, not a mechanical
strip.

- [ ] **[manual]** `docs/*.md` (`decisions.md`, `progress.md`,
  `roadmap.md`, `improvements.md`) — dated entries ("confirmed
  2026-07-14...", incident write-ups) are development history, not
  operator-facing docs. Trim or drop if handing the repo to someone who
  isn't maintaining it as code.
- [ ] **[manual]** `.env.example` — the per-variable comments carry a lot of
  "why this design" rationale (e.g. the `DATABASE_URL`/`DIRECT_URL` split).
  Fine to keep for a maintaining developer, worth trimming to just the
  required value + where to get it otherwise.
- [ ] **[manual]** `prisma/schema.prisma`, `prisma/security/rls.sql`,
  `prisma/security/create-app-role.sql` — carry dated comments explaining
  *why* the RLS/role setup is the way it is. These encode real security
  reasoning (see [architecture.md](./architecture.md#cross-tenant-isolation-two-layers)) —
  don't strip them blindly; at most drop the date/incident framing and keep
  the "why" itself.

## 6. Go-live checks

Same substance as [roadmap.md](./roadmap.md#phase-5--go-live-as-tenant-1),
applied per fork rather than just to the original tenant #1.

- [ ] **[auto]** Create the real `Tenant` row **and its full bootstrap** —
  `SiteSettings`, `AboutPage`, the Home/About/Contact `NavItem` rows, and any
  starting `Board`s — a scriptable insert/seed once the tenant's name/slug/
  contact email/board list are decided (the decisions themselves are manual;
  the DB writes are not). **All of these, not just `Tenant`, are required**:
  the admin sidebar and public nav are both driven entirely by `NavItem`
  rows (`src/app/admin/(dashboard)/layout.tsx`), and the Settings/About
  admin forms call Prisma `update` (not `upsert`), so they error with no
  pre-existing `SiteSettings`/`AboutPage` row. A `Tenant`-only insert leaves
  an admin panel with only "메시지"/"설정" reachable and a Settings form that
  can't save. `tools/fork-setup/main.py` generates the whole bootstrap in
  one SQL block, not just the `Tenant` row.
- [ ] **[manual]** Point the real domain at the Vercel project — Vercel
  dashboard + domain registrar's DNS settings.
- [ ] **[manual]** Populate real content through the admin panel — this
  *is* the customer's actual photos/text, inherently hands-on.
- [ ] **[manual]** Exercise the custom-domain connection flow once, end to
  end — hands-on verification against the live site.
- [ ] **[manual]** Re-verify routing against the real domain, not
  `localhost` — hands-on verification against the live site.
