# External service setup

None of these can be provisioned by an AI coding agent — they require your
account login. This is the step-by-step for each. Copy `.env.example` to
`.env` and fill in each value as you complete these steps — **`.env` is
gitignored and must never be committed.**

## 1. Neon (Postgres) — ✅ done for this project

1. Create a project at [neon.tech](https://neon.tech) (or via the Vercel
   integration — Vercel dashboard → Storage → Connect a database → Neon,
   which auto-wires the env vars into your Vercel project for you).
2. Neon gives you two connection strings for the same database — you need
   both:
   - **Pooled** (hostname has `-pooler` in it) → `DATABASE_URL`. The app's
     own `PrismaClient` (`src/lib/db/client.ts`) connects with this at
     runtime — required on Vercel serverless, which opens many short-lived
     connections.
   - **Direct** (no `-pooler`) → `DIRECT_URL`. Only the Prisma CLI reads
     this (via `prisma.config.ts`) — `migrate`/`db push` need a direct
     connection because PgBouncer's pooling mode doesn't support the
     advisory locks schema migrations take.
3. Run `npx prisma migrate dev --name init` once against it to create the
   real migration history, then commit the generated `prisma/migrations/`
   folder. (Already done for this project's initial schema — do this again
   for any future schema change.)
4. **Do not** run `prisma/security/rls.sql` against Neon yet — see the
   warning comment at the top of that file and
   [architecture.md](./architecture.md#cross-tenant-isolation-two-layers).
   It depends on Phase 4 work that hasn't landed.

## 2. Cloudflare R2 (object storage) — ✅ done for this project

1. Create a bucket in the Cloudflare dashboard → R2.
2. Create an R2 API token (Account → R2 → Manage API Tokens) scoped to that
   bucket. This gives you an Access Key ID + Secret Access Key —
   fill `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`,
   `R2_BUCKET_NAME`, `R2_ENDPOINT` (`https://<account id>.r2.cloudflarestorage.com`).
3. Connect a custom domain to the bucket (R2 bucket settings → Custom
   Domains), e.g. `images.myplatform.com` — this is what lets `next/image`
   optimize photos. Set `R2_PUBLIC_HOSTNAME` to it. **Not needed until
   Phase 4** (the upload flow doesn't exist yet) — leave blank until then.

## 3. Vercel — ⬜ not yet done for this project

1. Import this repo as a Vercel project (or connect it from an existing
   local clone with `vercel link`).
2. Set every variable from `.env` in the Vercel project settings
   (Production **and** Preview environments) — Vercel does not read your
   local `.env` file.
3. Add your apex domain and a wildcard domain (`*.yourdomain.com`) under
   Project Settings → Domains — required for subdomain-based tenant
   routing to work in production.
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
4. `npm run db:seed` if you need a local `dev` tenant (optional — Neon
   already has one from the first machine).
5. `npm run dev`, then visit `http://dev.localhost:3000`,
   `http://admin.localhost:3000`, `http://localhost:3000`.
