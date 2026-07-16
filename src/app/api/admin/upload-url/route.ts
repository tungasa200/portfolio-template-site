import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  buildR2Key,
  getPresignedUploadUrl,
  isR2Configured,
  isValidR2PathSegment,
  r2PublicUrl,
  type R2UploadScope,
} from "@/lib/storage/r2";

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_SITE_SLOTS = new Set(["hero", "logo"]);

function parseScope(body: unknown): R2UploadScope | null {
  const raw = (body as { scope?: unknown } | null)?.scope;
  if (!raw || typeof raw !== "object") return null;
  const kind = (raw as { kind?: unknown }).kind;

  if (kind === "board-item") {
    const { boardId, itemId } = raw as { boardId?: unknown; itemId?: unknown };
    if (typeof boardId !== "string" || typeof itemId !== "string") return null;
    if (!isValidR2PathSegment(boardId) || !isValidR2PathSegment(itemId)) return null;
    return { kind: "board-item", boardId, itemId };
  }
  if (kind === "site") {
    const { slot } = raw as { slot?: unknown };
    if (typeof slot !== "string" || !ALLOWED_SITE_SLOTS.has(slot)) return null;
    return { kind: "site", slot: slot as "hero" | "logo" };
  }
  return null;
}

// Admin-only presigned-PUT issuer. tenantId always comes from the session,
// never the request body — see docs/architecture.md#storage-cloudflare-r2.
// Deliberately doesn't reuse getCurrentTenantContext() (src/lib/auth/
// tenant-context.ts): that helper calls redirect() on a missing session,
// which is meant for page renders, not a fetch()-called Route Handler — here
// we want a real 401 the client's fetch can check.
export async function POST(request: Request) {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "Object storage is not configured on this environment yet." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const contentType = (body as { contentType?: unknown } | null)?.contentType;

  if (typeof contentType !== "string" || !ALLOWED_CONTENT_TYPES.has(contentType)) {
    return NextResponse.json({ error: "Unsupported content type." }, { status: 400 });
  }
  const scope = parseScope(body);
  if (!scope) {
    return NextResponse.json({ error: "Invalid upload scope." }, { status: 400 });
  }

  const key = buildR2Key(tenantId, scope, contentType);
  const uploadUrl = await getPresignedUploadUrl(key, contentType);

  return NextResponse.json({ uploadUrl, r2Key: key, publicUrl: r2PublicUrl(key) });
}
