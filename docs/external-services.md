# External service setup

None of these can be provisioned by an AI coding agent — they require your
account login. This is the step-by-step for each. Copy `.env.example` to
`.env` and fill in each value as you complete these steps — **`.env` is
gitignored and must never be committed.**

## 1. Neon (Postgres) — ✅ done for this project

1. Create a project at [neon.tech](https://neon.tech) (or via the Vercel
   integration — Vercel dashboard → Storage → Connect a database → Neon,
   which auto-wires the env vars into your Vercel project for you).
2. Neon gives you two connection strings for the same database, and you'll
   run each as a **different role**:
   - **Pooled** (hostname has `-pooler` in it), as the dedicated
     `app_runtime` role (see step 4) → `DATABASE_URL`. The app's own
     `PrismaClient` (`src/lib/db/client.ts`) connects with this at
     runtime — required on Vercel serverless, which opens many short-lived
     connections.
   - **Direct** (no `-pooler`), as the Neon owner role (e.g.
     `neondb_owner`) → `DIRECT_URL`. Read by the Prisma CLI (via
     `prisma.config.ts` — `migrate`/`db push` need a direct connection
     because PgBouncer's pooling mode doesn't support the advisory locks
     schema migrations take) and by `prisma/seed.ts`.
3. Run `npx prisma migrate dev --name init` once against it to create the
   real migration history, then commit the generated `prisma/migrations/`
   folder. (Already done for this project's initial schema — do this again
   for any future schema change.)
4. Run `prisma/security/create-app-role.sql` (fill in a real password in a
   local, uncommitted copy first) to create the `app_runtime` role, then
   `prisma/security/rls.sql` to apply the tenant-isolation policies — see
   both files' comments and
   [architecture.md](./architecture.md#cross-tenant-isolation-two-layers)
   for why the role has to be `app_runtime` and not the Neon owner role
   (the owner role's `BYPASSRLS` attribute silently makes the policies a
   no-op). Already done for this project (2026-07-14).

## 2. Cloudflare R2 (object storage) — ✅ done for local dev

1. Create a bucket in the Cloudflare dashboard → R2. **Done.**
2. Create an R2 API token (Account → R2 → Manage API Tokens) scoped to that
   bucket. This gives you an Access Key ID + Secret Access Key —
   fill `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`,
   `R2_BUCKET_NAME`, `R2_ENDPOINT` (`https://<account id>.r2.cloudflarestorage.com`).
   **Done.**
3. **✅ CORS policy on the bucket (2026-07-16).** The admin photo-upload flow
   (`src/lib/admin/upload-client.ts`) uploads directly from the browser to
   R2 via a presigned PUT URL, which means the *browser* (not our server)
   makes the PUT request — R2 rejects it with no
   `Access-Control-Allow-Origin` header without a CORS policy (confirmed
   hitting exactly that error verifying Phase 4, 2026-07-15). Current
   policy (Dashboard → bucket → Settings → CORS Policy):
   ```json
   [
     {
       "AllowedOrigins": ["http://admin.localhost:3000"],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   Verified for real (2026-07-16): simulated the exact browser preflight
   (`OPTIONS` with `Origin`/`Access-Control-Request-Method`/`-Headers`)
   against a real presigned URL and got back a `204` with matching
   `Access-Control-Allow-Origin`/`-Methods`/`-Headers`; the actual `PUT`
   with an `Origin` header also came back `200` with the CORS header
   present — this is the real signal a browser checks, not just "the PUT
   succeeded" (`curl` without `Origin` would succeed regardless of CORS
   config, since CORS is enforced browser-side). **Add
   `https://admin.{ROOT_DOMAIN}` to `AllowedOrigins` once a real domain
   exists via Vercel (see section 4) — the current policy is
   `localhost`-only.**
4. **✅ Public URL — done via the Public Development URL, not a custom
   domain (2026-07-16).** Dashboard → your bucket → Settings → Public
   Development URL → Enable gives a `pub-<hash>.r2.dev` hostname
   immediately, no domain required. `R2_PUBLIC_HOSTNAME` is set to it in
   `.env`. Cloudflare explicitly discourages this for production (rate
   limited) — swap to a real Custom Domain (R2 bucket settings → Custom
   Domains, e.g. `images.myplatform.com`) once a real domain exists via
   Vercel (see section 4 below), and update `R2_PUBLIC_HOSTNAME` to match.

## 3. Email (tenant's own Gmail) — ⬜ needs `ENCRYPTION_KEY`, no third-party signup

There's no platform-wide email provider to sign up for — each tenant
connects their own Gmail from inside the admin (Settings → "이메일 답장 연동"),
not through anything in this file. See
[architecture.md](./architecture.md#contact-form--reply-email--tenants-own-gmail-opt-in)
for how that flow works.

The one thing this project needs from you here is `ENCRYPTION_KEY`, which
encrypts each tenant's Gmail app password at rest
(`src/lib/crypto/secret-box.ts`) — generate it once:

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Set it in `.env` locally and in Vercel's project env vars before any real
tenant connects Gmail (changing it later makes existing stored app
passwords undecryptable — they'd need to reconnect).

## 4. Vercel — 🟡 deployed on the shared default domain, no custom domain (by choice)

1. Import this repo as a Vercel project (or connect it from an existing
   local clone with `vercel link`). **Done** — deployed at
   `https://portfolio-template-site.vercel.app`, Vercel's own shared
   `*.vercel.app` domain, **not** a custom domain — this project is being
   run as a dev/master template (see
   [decisions.md](./decisions.md#per-customer-fork--dedicated-vercel-deployment-not-one-shared-multi-tenant-instance-2026-07-16)),
   not a real tenant-facing deployment, so a real domain was deliberately
   skipped for now.
2. Set every variable from `.env` in the Vercel project settings
   (Production **and** Preview environments) — Vercel does not read your
   local `.env` file.
3. **⬜ No wildcard domain — and none is possible on the shared default
   domain.** Subdomain-based routing (`admin.{root}`, `{slug}.{root}`)
   needs a real custom domain with a wildcard DNS record (`*.yourdomain.com`)
   under Project Settings → Domains; `admin.portfolio-template-site.vercel.app`
   can never resolve to this project since Vercel only assigns the exact
   `*.vercel.app` slug it gave you, not a wildcard under it. Consequence:
   **the admin panel is only reachable at
   `https://portfolio-template-site.vercel.app/admin/...` directly** (no
   `admin.` prefix) — `proxy.ts` was fixed (2026-07-16, see
   [decisions.md](./decisions.md#admin-must-stay-reachable-at-the-bare-root-domain-not-only-adminroot_domain-2026-07-16))
   to keep `/admin/*` reachable at the bare root domain specifically for
   this scenario. The public tenant site itself only works if
   `ROOT_TENANT_SLUG` is set (serves that one tenant at the bare root
   domain too) — there's no way to reach a *second* tenant's site without
   a real wildcard domain.
4. **R2 CORS**: the `AllowedOrigins` list (see section 2 above) must
   include `https://portfolio-template-site.vercel.app` (no `admin.`
   prefix, per the point above) alongside the existing
   `http://admin.localhost:3000` dev entry, or the browser upload flow
   will fail with a CORS error on this deployment specifically.
4. Set `ROOT_DOMAIN` to your real apex domain (e.g. `myplatform.com`) in
   the Vercel env vars — locally it stays `localhost:3000`.

## Setting up a new machine

Cloning this repo elsewhere gets you the code, but **not** the secrets —
`.env` is intentionally excluded from git. To continue development on
another machine:

1. `git clone https://github.com/tungasa200/portfolio-template-site.git`
2. `npm install` (runs `prisma generate` via `postinstall`)
3. `cp .env.example .env`, then fill in the real values. The Neon and R2
   credentials already exist (steps 1–2 above are done) — retrieve them
   from the Neon/Cloudflare dashboards again, or copy them from the other
   machine's `.env` out-of-band (password manager, not git/chat).
   `ENCRYPTION_KEY` has no external source if lost — copy it from the other
   machine's `.env` (losing it permanently locks out every tenant's stored
   Gmail app password; they'd have to reconnect).
   `app_runtime`'s password specifically isn't shown in the Neon dashboard
   (it's a role this project created, not one Neon generated for you) — copy
   it from the other machine's `.env`, or reset it from the Neon SQL editor
   with `ALTER ROLE app_runtime WITH PASSWORD '<new password>';` if it's
   genuinely lost, and update `DATABASE_URL` everywhere that used the old one.
4. `npm run db:seed` if you need a local `dev` tenant (optional — Neon
   already has one from the first machine).
5. `npm run dev`, then visit `http://dev.localhost:3000`,
   `http://admin.localhost:3000`, `http://localhost:3000`.
