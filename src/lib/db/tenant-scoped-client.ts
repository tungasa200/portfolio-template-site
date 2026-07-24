import "server-only";
import { prisma as basePrisma } from "./client";
import { withDbRetry } from "./with-retry";

// Every table listed here carries a `tenantId` column (see prisma/schema.prisma).
// forTenant() is the ONLY sanctioned way to query them — it auto-injects
// `tenantId` into every read/write so a missed `where` clause can't leak
// another tenant's rows. This is layer 1 of defense; Postgres Row-Level
// Security (prisma/migrations/.../rls.sql) is layer 2.
const TENANT_SCOPED_MODELS = new Set([
  "SiteSettings",
  "NavItem",
  "SocialLink",
  "AboutPage",
  "Board",
  "BoardItem",
  "BoardItemPhoto",
  "ContactSubmission",
]);

const WHERE_SCOPED_OPERATIONS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "count",
  "aggregate",
  "groupBy",
]);

function assertNoConflict(existing: unknown, tenantId: string, context: string) {
  if (typeof existing === "string" && existing !== tenantId) {
    throw new Error(
      `[forTenant] refused cross-tenant ${context}: session tenant is ${tenantId}, query specified ${existing}`
    );
  }
}

/**
 * Returns a Prisma Client scoped to a single tenant. Every Server Action /
 * Route Handler that touches tenant-scoped data must obtain its DB handle
 * via `forTenant(tenantId)` — never import `./client` directly outside this
 * file. `tenantId` must come from `getCurrentTenantContext()`
 * (src/lib/auth/tenant-context.ts), never from client-supplied input.
 */
export function forTenant(tenantId: string) {
  if (!tenantId) {
    throw new Error("[forTenant] tenantId is required");
  }

  return basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const a = args as Record<string, any>;

          if (WHERE_SCOPED_OPERATIONS.has(operation)) {
            assertNoConflict(a.where?.tenantId, tenantId, `${model}.${operation}`);
            a.where = { ...a.where, tenantId };
          }

          if (operation === "create") {
            assertNoConflict(a.data?.tenantId, tenantId, `${model}.create`);
            a.data = { ...a.data, tenantId };
          }

          if (operation === "createMany") {
            const rows: Record<string, any>[] = Array.isArray(a.data) ? a.data : [a.data];
            rows.forEach((row) => assertNoConflict(row.tenantId, tenantId, `${model}.createMany`));
            a.data = rows.map((row) => ({ ...row, tenantId }));
          }

          if (operation === "upsert") {
            assertNoConflict(a.where?.tenantId, tenantId, `${model}.upsert`);
            a.where = { ...a.where, tenantId };
            assertNoConflict(a.create?.tenantId, tenantId, `${model}.upsert.create`);
            a.create = { ...a.create, tenantId };
          }

          // Layer 2 (defense in depth): batch a set_config call ahead of the
          // actual query in one implicit transaction, so
          // current_setting('app.tenant_id', true) is visible to Postgres
          // Row-Level Security policies (prisma/security/rls.sql) for this
          // statement. Prisma's documented RLS extension recipe.
          const [, result] = await withDbRetry(() =>
            basePrisma.$transaction([
              basePrisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`,
              query(a),
            ])
          );
          return result;
        },
      },
    },
  });
}

export type TenantScopedClient = ReturnType<typeof forTenant>;
