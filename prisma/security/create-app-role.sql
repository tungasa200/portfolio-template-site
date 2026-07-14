-- Creates a dedicated, low-privilege Postgres role for the app's runtime
-- connection (DATABASE_URL), separate from Neon's default owner role
-- (neondb_owner, or whatever your project's owner role is named).
--
-- Why this exists: rls.sql's policies are silently ignored by any role with
-- the BYPASSRLS attribute -- and Neon's default owner role has BYPASSRLS by
-- default (confirmed 2026-07-14: `SELECT rolbypassrls FROM pg_roles WHERE
-- rolname = current_user` returned true even though rolsuper is false).
-- FORCE ROW LEVEL SECURITY only closes the *table-owner* bypass, not the
-- role-level BYPASSRLS attribute -- these are two different things. Without
-- this dedicated role, RLS is applied-but-inert: the app can read/write
-- every tenant's rows regardless of the policy.
--
-- Run once per Neon database (and again for any new environment/branch),
-- via `npx prisma db execute --file <a copy of this file with the
-- password filled in>` (never commit the filled-in version -- this
-- checked-in copy keeps the <PASSWORD> placeholder). Then set that
-- environment's DATABASE_URL to use app_runtime instead of the owner role,
-- at the same pooled (-pooler) hostname -- Neon's pooler is role-agnostic
-- beyond auth. DIRECT_URL keeps using the owner role: migrations,
-- `prisma db execute`, and prisma/seed.ts are trusted CLI-only paths, not
-- the request-serving runtime, and need full privilege (seed.ts in
-- particular writes rows directly without going through forTenant()'s
-- SET LOCAL, so it would be blocked by RLS under the restricted role).
--
-- Re-run the GRANT/ALTER DEFAULT PRIVILEGES statements (role creation can be
-- skipped if it already exists) whenever schema.prisma adds a table --
-- same "re-run when a new tenant-scoped table is added" note as rls.sql.

CREATE ROLE app_runtime WITH LOGIN PASSWORD '<PASSWORD>';

GRANT USAGE ON SCHEMA public TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime;

-- Future tables/sequences created by the owner role (via prisma migrate)
-- auto-grant to app_runtime too, without a manual re-run.
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_runtime;

-- Deliberately no BYPASSRLS grant -- that's the entire point of this role.
