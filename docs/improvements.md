# Improvement backlog

Things that are working correctly but not optimal — found while building or
verifying a feature, deliberately deferred rather than fixed on the spot
(usually because the fix touches security-critical or already-verified
code and deserves its own careful pass, not a rushed edit mid-task). Not a
bug list — see [progress.md](./progress.md) for what's actually broken or
unstarted. Pick an item up when it's actually bothering you, not
proactively.

## Admin pages issue too many separate DB round-trips per page load

**Found:** 2026-07-15, while building Phase 4's admin CRUD panel (see
[progress.md](./progress.md#phase-4--admin-crud--uploads-done-2026-07-15)).

**What's happening:** `forTenant()` (`src/lib/db/tenant-scoped-client.ts`)
wraps every single tenant-scoped operation in its own `$transaction`
(`SET LOCAL app.tenant_id` + the query) — that's required for Row-Level
Security to see the right tenant, and isn't the problem by itself. The
problem is that most admin pages call `forTenant()` **several separate
times** per render (e.g. `src/app/admin/(dashboard)/layout.tsx` does 5:
tenant lookup, siteSettings, boards, navItems, contactSubmission count).
Each one is a fully separate round-trip to Neon. `Promise.all` runs them
concurrently, so it's not strictly additive, but Neon here is in
`ap-southeast-1` — measured ~85–100ms TCP connect time from a Korea-based
dev machine — and that latency is paid on every page load, not just once.

**Why deferred:** `forTenant()` is the single most security-critical piece
of code in the app (the cross-tenant-isolation guardrail — see
[architecture.md](./architecture.md#cross-tenant-isolation-two-layers)) and
is explicitly called out in [conventions.md](./conventions.md) as "the
single rule most worth enforcing in review." Restructuring how it batches
queries is exactly the kind of change that deserves a dedicated, carefully
verified pass — not a fix bolted on while chasing a "feels slow" report.
Also, this genuinely matters less right now than it will later:
production (Vercel + Neon, likely a geographically closer region, real
connection pooling, no Turbopack dev-mode compile-on-demand spikes) will
feel different from local dev talking to a remote DB — worth re-measuring
after Phase 5's actual deploy before deciding this is still worth the
effort.

**Possible approaches, not decided:**
- Batch multiple reads into a single `db.$transaction([...])` call per
  page (one `SET LOCAL` + N queries in one round-trip) instead of N
  separate `forTenant()`-wrapped calls — the biggest win, since it cuts
  round-trips without touching the RLS guarantee itself.
- Have `forTenant()` itself expose a way to run several operations under
  one already-established `SET LOCAL`, so call sites don't have to
  hand-roll `$transaction` arrays.
- Re-measure after Vercel deployment before doing either — might not be
  worth it once the network hop is Vercel-edge-to-Neon instead of
  home-machine-to-Neon.

## Explicit non-goals for this file

Anything that's actually blocking (a missing external-service config step,
an unstarted feature) belongs in
[roadmap.md](./roadmap.md)/[external-services.md](./external-services.md)
instead — this file is only for "it works, it could be nicer."
