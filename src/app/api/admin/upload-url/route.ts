import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { buildR2Key, getPresignedUploadUrl, isR2Configured, r2PublicUrl } from "@/lib/storage/r2";

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_SCOPES = new Set(["board-items", "site"]);

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
  const contentType = body?.contentType;
  const scope = body?.scope;

  if (typeof contentType !== "string" || !ALLOWED_CONTENT_TYPES.has(contentType)) {
    return NextResponse.json({ error: "Unsupported content type." }, { status: 400 });
  }
  if (typeof scope !== "string" || !ALLOWED_SCOPES.has(scope)) {
    return NextResponse.json({ error: "Invalid upload scope." }, { status: 400 });
  }

  const key = buildR2Key(tenantId, scope as "board-items" | "site", contentType);
  const uploadUrl = await getPresignedUploadUrl(key, contentType);

  return NextResponse.json({ uploadUrl, r2Key: key, publicUrl: r2PublicUrl(key) });
}
