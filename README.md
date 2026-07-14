# Photographer Portfolio Platform

Multi-tenant photographer portfolio builder. Architecture plan:
`C:\Users\YJMEDIA\.claude\plans\wiggly-fluttering-sunset.md`

Next.js (App Router) single app serving three hostname-based contexts via
`src/proxy.ts`:

- root domain — marketing (`src/app/page.tsx`)
- `admin.{ROOT_DOMAIN}` — admin panel (`src/app/admin/`)
- `{tenant}.{ROOT_DOMAIN}` / custom domains — tenant public sites (`src/app/s/[tenant]/`)

## Local development

```bash
npm install                # runs `prisma generate` via postinstall
npx prisma dev -d          # starts a local throwaway Postgres for dev
npx prisma db push         # sync schema (use `migrate dev` once on Neon — see below)
npm run db:seed            # creates a "dev" tenant
npm run dev
```

Visit `http://dev.localhost:3000` (tenant site), `http://admin.localhost:3000`
(admin), `http://localhost:3000` (marketing). `*.localhost` resolves to
127.0.0.1 automatically in Chrome/Firefox — no `/etc/hosts` edits needed.

`npx prisma dev` data is throwaway (lost on restart) and only supports
`prisma db push`, not `prisma migrate dev` (no shadow-database support) — it's
for quick local iteration only. Once Neon is connected, generate the real,
version-controlled migration there instead:

```bash
npx prisma migrate dev --name init
```

## External services this project depends on

None of these can be provisioned by an AI coding agent — they require your
account login. Copy `.env.example` to `.env` and fill in each value as you
complete these steps.

### 1. Neon (Postgres)

1. Create a project at [neon.tech](https://neon.tech) (or via the Vercel
   integration — Vercel dashboard → Storage → Connect a database → Neon —
   which auto-wires the env vars into your Vercel project for you).
2. Copy the **pooled** connection string (the one with `-pooler` in the
   hostname) into `DATABASE_URL`.
3. Run `npx prisma migrate dev --name init` once against it to create the
   real migration history (do this locally with `DATABASE_URL` pointed at
   Neon, then commit the generated `prisma/migrations/` folder).
4. Apply Row-Level Security (see `prisma/security/rls.sql` for why this is
   deliberately a manual, separate step — **do not run it until the Phase 4
   `SET LOCAL app.tenant_id` wiring lands**, or every tenant-scoped query
   will start returning zero rows in production).

### 2. Cloudflare R2 (object storage)

1. Create a bucket in the Cloudflare dashboard → R2.
2. Create an R2 API token (Account → R2 → Manage API Tokens) scoped to that
   bucket; fill `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
   `R2_BUCKET_NAME`.
3. Connect a custom domain to the bucket (R2 bucket settings → Custom
   Domains), e.g. `images.myplatform.com` — this is what lets
   `next/image` optimize photos (see `next.config.ts`, wired up in Phase 4
   alongside the upload flow). Set `R2_PUBLIC_HOSTNAME` to it.

### 3. Vercel

1. Import this repo as a Vercel project.
2. Set the environment variables from `.env` in the Vercel project settings
   (Production + Preview).
3. Add your apex domain and a wildcard domain (`*.yourdomain.com`) under
   Project Settings → Domains — this is required for subdomain-based tenant
   routing to work in production.
4. Set `ROOT_DOMAIN` to your real apex domain (e.g. `myplatform.com`).

## Status

Phase 1 (multi-tenancy foundation) complete and verified locally: hostname
routing, tenant resolution, the `forTenant()` cross-tenant guardrail, and RLS
policies (prepared, not yet wired into the request path). See the plan file
for what's next (Phase 2: public site design system).
