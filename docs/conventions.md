# Conventions

## Communication with the operator

When responding in Korean, always use formal speech (존댓말/-습니다·-요체) —
never 반말, regardless of how the operator phrases their own messages.
Explicit operator instruction (2026-07-20).

## Commit messages

Every commit subject line starts with one of these tags:

| Tag | Use for |
|---|---|
| `feat:` | new functionality |
| `fix:` | bug fix |
| `refactor:` | restructuring without behavior change |
| `update:` | tweaking existing behavior/config/deps |
| `delete:` | removing code/files |
| `first-commit:` | one-time exception — the repo's very first commit only, don't reuse |

Example: `feat: add project CRUD to admin panel`.

## Working philosophy

This project is implemented and maintained entirely through AI coding (the
owner reads/reviews but doesn't hand-edit). That has concrete implications
for how to write code here:

- Prefer standard, widely-adopted, well-maintained libraries over
  hand-rolled solutions, especially for security-sensitive code (auth,
  session handling) — see [decisions.md](./decisions.md).
- Keep the number of moving parts (services, languages, deploy targets)
  low. One Next.js app, one hosting platform, one database — this was an
  explicit reason to reject a separate backend service.
- Every tenant-scoped database query must go through `forTenant(tenantId)`
  (`src/lib/db/tenant-scoped-client.ts`) — never import the base Prisma
  client directly outside `src/lib/db/`. This is the single rule most
  worth enforcing in review; a bypass is a silent cross-tenant data leak,
  not a crash.
- `tenantId` for any mutation must come from the authenticated session
  (`getCurrentTenantContext()`, once Phase 4 builds it) — never from
  client-supplied input.

## Framework version notes (things prior training data gets wrong here)

This repo runs newer major versions than typical model training data
reflects. Re-verify against the actual installed docs/behavior before
assuming an older API still applies — don't guess from memory.

**Next.js 16** (not 14/15):
- `middleware.ts` is renamed to `proxy.ts` — export a function named
  `proxy` (or default export). It **always** runs on the Node.js runtime
  now; there's no edge-runtime option for it. Bundled docs:
  `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`.
- `cookies()`, `headers()`, `draftMode()`, `params`, and `searchParams` are
  **fully async-only** — no synchronous fallback exists anymore. Always
  `await` them.
- Check `node_modules/next/dist/docs/` for anything else before writing
  App Router code — that upgrade guide has the full breaking-changes list.

**Prisma 7** (not 5/6):
- Generator provider is `"prisma-client"` (not `"prisma-client-js"`), with
  an explicit `output` path — this repo generates to `src/generated/prisma`
  (gitignored, regenerated via the `postinstall` script — see
  `package.json`).
- An explicit driver adapter is required to construct `PrismaClient` — this
  repo uses `@prisma/adapter-pg` (`src/lib/db/client.ts`). There's no more
  implicit connection-string-only instantiation.
- Config moved out of `schema.prisma` into `prisma.config.ts`. `directUrl`
  (the old shadow-DB/pooling escape hatch) is gone from the schema —
  instead, `prisma.config.ts`'s `datasource.url` **is** the direct/unpooled
  URL used by the CLI (`migrate`, `db push`, `db execute`), while the
  app's own `PrismaClient` gets its (pooled) connection string from the
  adapter, entirely separately. See `.env.example`'s `DATABASE_URL` vs
  `DIRECT_URL` comments.
- `npx prisma dev` spins up a throwaway local Postgres for quick iteration,
  but doesn't support a shadow database — use `prisma db push` locally,
  not `prisma migrate dev` (that only works cleanly against real Postgres,
  i.e. Neon).
- `startsWith`/`endsWith`/`contains` string filters compile to a Postgres
  `LIKE` pattern, where `_` and `%` are wildcards (`_` = any one char, `%` =
  any run of chars) — NOT escaped automatically. A filter like
  `{ name: { startsWith: "___" } }` becomes `LIKE '___%'`, which matches
  *any string of 3+ characters*, not literal triple-underscore names. This
  once mass-deleted every real row in a table via a "delete test rows named
  `___foo___`" cleanup script — see
  [progress.md](./progress.md#incident-prisma-startswith-matched-every-row-2026-07-20).
  If the substring can contain `_`/`%` (including ad-hoc test-data
  prefixes), escape them first or match on an exact/`in` filter instead.

When in doubt on either library: grep `node_modules/next/dist/docs/` first,
or search the web for the specific version — don't assume.
