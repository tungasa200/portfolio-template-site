# Photographer Portfolio Platform

Multi-tenant photographer portfolio builder — one Next.js deployment serves
the marketing site, every tenant's public portfolio, and a shared admin
panel. Started as a personal portfolio site, designed from day one to be
sold as a product to other photographers.

**Full project docs live in [`docs/`](./docs/) — read these before making
architectural changes, especially from a fresh clone/session that doesn't
have prior conversation context:**

- [`docs/architecture.md`](./docs/architecture.md) — how the system fits
  together (routing, data model, tenant isolation, storage).
- [`docs/decisions.md`](./docs/decisions.md) — key choices and why, so you
  don't accidentally re-litigate or undo something already argued out.
- [`docs/progress.md`](./docs/progress.md) — what's actually done and
  verified vs. not started yet.
- [`docs/roadmap.md`](./docs/roadmap.md) — the detailed remaining work,
  phase by phase.
- [`docs/conventions.md`](./docs/conventions.md) — commit message format,
  coding rules (esp. the `forTenant()` rule), and framework-version gotchas
  worth knowing before writing Next.js 16 / Prisma 7 code here.
- [`docs/external-services.md`](./docs/external-services.md) — Neon / R2 /
  Vercel setup steps, and how to get a new machine working.

## Quick start (already-provisioned services)

```bash
git clone https://github.com/tungasa200/portfolio-template-site.git
cd portfolio-template-site
npm install                # runs `prisma generate` via postinstall
cp .env.example .env       # then fill in real values — see docs/external-services.md
npm run db:seed            # optional: creates a "dev" tenant if one doesn't exist
npm run dev
```

Visit `http://dev.localhost:3000` (tenant site), `http://admin.localhost:3000`
(admin), `http://localhost:3000` (marketing). `*.localhost` resolves to
127.0.0.1 automatically in Chrome/Firefox — no `/etc/hosts` edits needed.

`.env` is gitignored on purpose and won't come along with `git clone` — see
[`docs/external-services.md`](./docs/external-services.md#setting-up-a-new-machine)
for how to get it populated on a new machine.

### Local-only throwaway database (optional)

For quick iteration without touching the shared Neon database:

```bash
npx prisma dev -d     # starts a local throwaway Postgres
npx prisma db push    # syncs schema (no shadow-DB support locally, so use
                       # db push here, not migrate dev)
```

Switch `DATABASE_URL`/`DIRECT_URL` back to the real Neon values (see
`.env.example`) when you're done, and generate real schema changes there
with `npx prisma migrate dev --name <description>`, committing the
resulting `prisma/migrations/` folder.

## Status

See [`docs/progress.md`](./docs/progress.md) for the up-to-date checklist.
Short version: Phase 0/1 (scaffolding + multi-tenancy foundation) done and
verified; Neon and Cloudflare R2 are connected; Vercel is not yet set up;
Phase 2 (porting the public-site design) hasn't started.
