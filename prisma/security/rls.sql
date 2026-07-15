-- Row-Level Security — defense-in-depth layer for the pooled multi-tenant
-- model. This is a second, DB-enforced backstop behind the application-layer
-- forTenant() guardrail (src/lib/db/tenant-scoped-client.ts): even a bug in
-- application code cannot leak rows across tenants once this is applied.
--
-- Not part of prisma/migrations/ because Prisma's schema DSL has no RLS
-- primitive. Apply manually against a real Postgres (Neon):
--   npx prisma db execute --file prisma/security/rls.sql
-- Applied to Neon and verified enforcing 2026-07-14. Re-run whenever a new
-- tenant-scoped table is added to schema.prisma.
--
-- Runtime contract: every request that reads/writes tenant-scoped tables
-- must first run, in the same transaction:
--   SELECT set_config('app.tenant_id', '<tenant id>', true);
-- forTenant() does this for every tenant-scoped operation (see
-- tenant-scoped-client.ts).
--
-- ** These policies are a no-op for any role with the BYPASSRLS attribute —
-- including Neon's default owner role (e.g. neondb_owner), confirmed by
-- testing, not assumption: FORCE ROW LEVEL SECURITY only closes the
-- table-owner bypass, not role-level BYPASSRLS, which is a separate
-- attribute. ** The app's actual runtime connection (DATABASE_URL) must use
-- a role without BYPASSRLS — see create-app-role.sql, which sets one up.
-- The owner role (DIRECT_URL) is fine for migrations/seed, which need full
-- privilege and are trusted CLI-only paths, not the request-serving
-- runtime. `prisma dev`'s local Postgres always connects as a superuser
-- (also RLS-exempt), so this can only be meaningfully verified against real
-- Neon, through the restricted role.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'SiteSettings', 'NavItem', 'SocialLink', 'AboutPage', 'Board',
    'BoardItem', 'BoardItemPhoto', 'ContactSubmission'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("tenantId" = current_setting(''app.tenant_id'', true))',
      t
    );
  END LOOP;
END $$;
