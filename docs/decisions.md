# Key decisions and why

Chronological. Read this when you're tempted to "simplify" something —
most of the non-obvious choices here were already argued out once.

## Multi-tenant SaaS from day one, not a single-tenant site

Started as "just my own portfolio," but there's a concrete plan to sell this
as a product to other photographers. Retrofitting multi-tenancy onto a
single-tenant codebase later is far more expensive than designing tenant
isolation in from the start (schema, routing, and query-scoping habits all
have to change). So even though tenant #1 is the owner's own site, the
system is multi-tenant end to end from Phase 1.

## Next.js monolith, not Spring Boot + Railway split backend

Considered: Spring Boot API on Railway + a separate frontend. Rejected
because:
- Cross-origin auth session cookies between a Vercel-hosted frontend and a
  Railway-hosted API is real, ongoing complexity (CORS, SameSite, cookie
  domain handling) for zero benefit at this scale.
- Two languages (TypeScript + Java) and two deployment pipelines double the
  surface an AI-coding-only workflow has to keep coherent across sessions.
- A single Next.js app with Server Actions/Route Handlers as the "backend"
  is same-origin, one language, one deploy target.

Enterprise-grade separation of concerns (Spring Security, dedicated backend
team conventions) would matter more at a scale this product isn't at.

## Pooled multi-tenancy, not schema-per-tenant or DB-per-tenant

Shared tables + a `tenantId` column on every tenant-scoped row. Schema- or
database-per-tenant gives stronger isolation but multiplies operational
complexity (migrations run N times, connection management per tenant) for a
benefit this scale (small photographer businesses, not enterprise
customers) doesn't need. The isolation risk this trades away is covered by
the two-layer guardrail — see [architecture.md](./architecture.md#cross-tenant-isolation-two-layers).

## Neon over Railway Postgres

Railway was the original instinct ("easy DB management"). Neon won because
of Vercel-native integration (env vars auto-wired), per-branch database
branching for preview deployments (useful when an AI-coding workflow runs
many experimental migrations), and autoscale-to-zero keeping pre-revenue
cost near $0. Railway's dashboard convenience isn't actually better than
Neon's — the platform fit is what decided it.

## Auth.js (self-hosted), not Clerk

Clerk was recommended (fully managed — password hashing, reset flows,
brute-force protection all off the table, which matters when "AI writes
100% of the code" and there's no human security reviewer). **The user
explicitly chose Auth.js instead** — self-hosted, no vendor dependency, no
per-user billing. Accepted trade-off: password hashing / reset / rate-limit
logic has to be implemented carefully (bcrypt, standard Auth.js patterns)
rather than delegated. Mitigated by keeping the actual attack surface small
in early phases — no self-serve signup, so no email-verification or
public password-reset flow needed until Phase 6.

## Cloudflare R2 for storage (given, not chosen here)

User had already decided this before architecture planning started.
S3-compatible, so any AWS SDK-based upload code works unmodified against it.

## Tailwind CSS v4, not CSS-in-JS

The design mockup (`design/Photographer Portfolio.dc.html`) defines its
palette directly in `oklch(...)`. Tailwind v4's CSS-first `@theme` supports
`oklch()` natively, so those tokens paste in with zero conversion. Also the
styling approach with the deepest AI-training-data familiarity, which
matters directly for an AI-coding-only workflow.

## Routing: rewrite into `/s/[tenant]/*`, not three route groups

The original plan described three Next.js route groups —
`(marketing)`/`(public)`/`admin` — resolved via headers in a shared layout.
That doesn't actually work: route groups are invisible to the URL, so two
different `page.tsx` files can't both resolve to `/`. Corrected during
implementation to the working pattern: `proxy.ts` rewrites
`{tenant}.{root}/*` and custom domains to `/s/{tenant}/*` (a real dynamic
route segment), `admin.{root}/*` to `/admin/*`, and leaves the root domain
untouched. This matches Vercel's own reference multi-tenant Next.js
pattern. See [architecture.md](./architecture.md#request-routing).
