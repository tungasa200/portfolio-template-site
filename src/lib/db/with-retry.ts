import "server-only";
import { Prisma } from "@/generated/prisma/client";

// Neon's serverless compute suspends after a period of idle traffic; the
// request that wakes it back up pays a one-time reconnect cost that can
// occasionally exceed Prisma's connection acquisition. Since this app has no
// error.tsx, an uncaught failure here means the visitor sees a fully broken
// page instead of a slightly slower one. These failures are transient by
// nature — the retry that follows almost always succeeds once the compute
// is awake, so we absorb it server-side before it ever reaches a render.
const RETRY_DELAYS_MS = [300, 800];

function isRetryableConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2024") {
    return true;
  }
  const code = (error as { code?: string } | null)?.code;
  return code === "ECONNRESET" || code === "ECONNREFUSED" || code === "ETIMEDOUT";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withDbRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= RETRY_DELAYS_MS.length || !isRetryableConnectionError(error)) {
        throw error;
      }
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
}
