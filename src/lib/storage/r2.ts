import "server-only";
import { randomUUID } from "node:crypto";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Lazily constructed, same reasoning as src/lib/email/resend.ts: importing
// this module must not throw just because R2 credentials aren't configured
// yet on a given machine (see docs/external-services.md#2). Every caller
// must handle a null client.
let client: S3Client | null | undefined;

function getR2Client(): S3Client | null {
  if (client === undefined) {
    const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT } = process.env;
    client =
      R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ENDPOINT
        ? new S3Client({
            region: "auto",
            endpoint: R2_ENDPOINT,
            credentials: {
              accessKeyId: R2_ACCESS_KEY_ID,
              secretAccessKey: R2_SECRET_ACCESS_KEY,
            },
          })
        : null;
  }
  return client;
}

export function isR2Configured(): boolean {
  return getR2Client() !== null && !!process.env.R2_BUCKET_NAME;
}

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function extensionForContentType(contentType: string): string | null {
  return ALLOWED_IMAGE_TYPES[contentType] ?? null;
}

// Key convention from docs/architecture.md#storage-cloudflare-r2 — always
// server-built from a session-derived tenantId, never a client-supplied path.
export function buildR2Key(
  tenantId: string,
  scope: "board-items" | "site",
  contentType: string
): string {
  const ext = extensionForContentType(contentType);
  if (!ext) {
    throw new Error(`[r2] unsupported content type: ${contentType}`);
  }
  return `tenants/${tenantId}/${scope}/${randomUUID()}.${ext}`;
}

export async function getPresignedUploadUrl(key: string, contentType: string): Promise<string> {
  const s3 = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!s3 || !bucket) {
    throw new Error("[r2] not configured — set R2_* env vars (see docs/external-services.md)");
  }
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  return getSignedUrl(s3, command, { expiresIn: 300 });
}

export async function deleteR2Object(key: string): Promise<void> {
  const s3 = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!s3 || !bucket) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (err) {
    // Best-effort cleanup — an orphaned R2 object is a cost/tidiness issue,
    // not a correctness one, so it must never block the DB write that
    // removes the BoardItemPhoto row.
    console.error("[r2] failed to delete object", key, err);
  }
}

export function r2PublicUrl(key: string): string | null {
  const hostname = process.env.R2_PUBLIC_HOSTNAME;
  return hostname ? `https://${hostname}/${key}` : null;
}
