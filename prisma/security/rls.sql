-- Row-Level Security — defense-in-depth layer for the pooled multi-tenant
-- model. This is a second, DB-enforced backstop behind the application-layer
-- forTenant() guardrail (src/lib/db/tenant-scoped-client.ts): even a bug in
-- application code cannot leak rows across tenants once this is applied.
--
-- Not part of prisma/migrations/ because Prisma's schema DSL has no RLS
-- primitive. Apply manually against a real Postgres (Neon) once provisioned:
--   npx prisma db execute --file prisma/security/rls.sql
-- Re-run whenever a new tenant-scoped table is added to schema.prisma.
--
-- Runtime contract: every request that opens a transaction to read/write
-- tenant-scoped tables must first run, inside that same transaction:
--   SET LOCAL app.tenant_id = '<tenant id>';
-- forTenant() does not do this yet (Phase 1 ships the application-layer
-- guardrail only) — wiring SET LOCAL into forTenant()'s transaction path is
-- tracked for Phase 4.
--
-- ** DO NOT apply this to the production (Neon) database before that Phase 4
-- wiring lands. ** Neon's connection role is not a Postgres superuser, so
-- FORCE ROW LEVEL SECURITY *will* be enforced there — and since nothing sets
-- app.tenant_id yet, every tenant-scoped query would silently return zero
-- rows (a full outage, not a leak, but still bad). It's harmless to apply
-- locally against `prisma dev`'s Postgres because that connects as a
-- superuser, which Postgres always exempts from RLS regardless of FORCE —
-- so this file has been rehearsed locally but intentionally NOT wired into
-- an automatic migration or deploy step yet.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'SiteSettings', 'NavItem', 'SocialLink', 'Project', 'ProjectPhoto',
    'Exhibition', 'ExhibitionPhoto', 'ContactSubmission'
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
