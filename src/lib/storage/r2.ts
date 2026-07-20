import "server-only";
import { randomUUID } from "node:crypto";
import { S3Client, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Lazily constructed: importing this module must not throw just because R2
// credentials aren't configured yet on a given machine (see
// docs/external-services.md#2). Every caller must handle a null client.
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

// board-item uploads nest by boardId/itemId (each post gets its own R2
// folder) instead of a flat tenant-wide bucket — otherwise every photo
// from every board/item for a tenant lands in one undifferentiated pile,
// distinguishable in the R2 dashboard only by random UUID filename.
export type R2UploadScope =
  | { kind: "board-item"; boardId: string; itemId: string }
  | { kind: "site"; slot: "hero" | "logo" };

// boardId/itemId arrive as client input to the presign route (unlike
// tenantId, which is always session-derived) — they're only ever used as
// path segments here, never trusted for authorization, but still validated
// as real UUIDs so a malformed/adversarial value can't inject extra path
// segments (e.g. "../") into the R2 key.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isValidR2PathSegment(value: string): boolean {
  return UUID_RE.test(value);
}

export type R2UploadVariant = "original" | "thumb";

// Key convention from docs/architecture.md#storage-cloudflare-r2 — always
// server-built from a session-derived tenantId, never a client-supplied path.
// variant "thumb" is always encoded as WebP by the client (see
// src/lib/admin/thumbnail.ts) regardless of the original's content type, and
// gets a "-thumb" filename suffix purely so the pair is recognizable side by
// side in the R2 dashboard — the DB row (not the filename) is the source of
// truth linking a thumb back to its original.
export function buildR2Key(
  tenantId: string,
  scope: R2UploadScope,
  contentType: string,
  variant: R2UploadVariant = "original"
): string {
  const ext = variant === "thumb" ? "webp" : extensionForContentType(contentType);
  if (!ext) {
    throw new Error(`[r2] unsupported content type: ${contentType}`);
  }
  const filename = variant === "thumb" ? `${randomUUID()}-thumb.${ext}` : `${randomUUID()}.${ext}`;
  return scope.kind === "board-item"
    ? `tenants/${tenantId}/board-items/${scope.boardId}/${scope.itemId}/${filename}`
    : `tenants/${tenantId}/site/${scope.slot}/${filename}`;
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

// Used only by the admin-only image-proxy route (src/app/api/admin/
// image-proxy/route.ts) so the crop editor can re-fetch a previously
// uploaded original into a same-origin response — canvas.drawImage() on a
// cross-origin R2 URL would taint the canvas and block toBlob(), and R2
// doesn't have GET CORS configured (only the presigned-PUT path needs
// that). Streaming through our own server (which already holds R2
// credentials) sidesteps needing bucket-level CORS entirely.
export async function getR2Object(
  key: string
): Promise<{ body: ReadableStream; contentType: string | null; contentLength: number | undefined } | null> {
  const s3 = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!s3 || !bucket) return null;
  try {
    const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!result.Body) return null;
    return {
      body: result.Body.transformToWebStream(),
      contentType: result.ContentType ?? null,
      contentLength: result.ContentLength,
    };
  } catch (err) {
    console.error("[r2] failed to fetch object", key, err);
    return null;
  }
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

// next.config.ts's remotePatterns restricts next/image to pathname
// "/tenants/**" — a real key from buildR2Key() always matches that, but a
// stale/foreign r2Key value (e.g. prisma/seed.ts's pre-Phase-4 placeholder
// rows, which predate the real upload pipeline and never match this shape)
// would make next/image throw and 500 the whole page instead of just
// showing a broken image. Guard here so any key that isn't ours to begin
// with degrades to "no image" (the existing placeholder-pattern fallback)
// instead of crashing.
export function r2PublicUrl(key: string): string | null {
  const hostname = process.env.R2_PUBLIC_HOSTNAME;
  if (!hostname || !key.startsWith("tenants/")) return null;
  return `https://${hostname}/${key}`;
}

// Prefer the derived thumbnail everywhere it's available; falls back to the
// original for rows uploaded before thumbnails existed (thumbKey columns
// are nullable, added retroactively — see prisma/schema.prisma) so old
// photos keep rendering instead of going blank.
export function resolveDisplayUrl(originalKey: string | null | undefined, thumbKey: string | null | undefined): string | null {
  if (thumbKey) {
    const thumbUrl = r2PublicUrl(thumbKey);
    if (thumbUrl) return thumbUrl;
  }
  return originalKey ? r2PublicUrl(originalKey) : null;
}
