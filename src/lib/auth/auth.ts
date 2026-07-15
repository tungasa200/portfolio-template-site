import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 15;

// Credentials provider requires JWT sessions (no DB adapter support) — the
// schema has no Session/Account tables to add, which fits the "keep moving
// parts low" philosophy in docs/conventions.md.
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  // Browser-facing (proxy.ts rewrites admin.{ROOT_DOMAIN}/login -> /admin/login
  // invisibly; this value must be the pre-rewrite path the browser actually
  // navigates to, or the redirect double-prefixes into /admin/admin/login).
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        // Unscoped lookup by design — like resolve-tenant.ts, authenticating
        // necessarily precedes knowing which tenant the user belongs to.
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          const attempts = user.failedLoginAttempts + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: attempts,
              lockedUntil:
                attempts >= LOCKOUT_THRESHOLD
                  ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
                  : null,
            },
          });
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: null },
        });

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.tenantId = user.tenantId;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      session.user.role = token.role as typeof session.user.role;
      session.user.tenantId = token.tenantId as string | null;
      return session;
    },
  },
});
