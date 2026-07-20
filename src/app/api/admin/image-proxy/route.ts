import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getR2Object } from "@/lib/storage/r2";

// Admin-only same-origin passthrough for a previously uploaded R2 object —
// used by ThumbnailCropModal to reload an existing original into a <canvas>
// for re-cropping without tripping the browser's cross-origin canvas taint
// check (see getR2Object's comment in src/lib/storage/r2.ts for why this
// avoids needing bucket-level CORS). tenantId always comes from the
// session, and the requested key must live under that tenant's own prefix —
// never trust the query string beyond that.
export async function GET(request: Request) {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = new URL(request.url).searchParams.get("key");
  if (!key || !key.startsWith(`tenants/${tenantId}/`)) {
    return NextResponse.json({ error: "Invalid key." }, { status: 400 });
  }

  const object = await getR2Object(key);
  if (!object) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.contentType ?? "application/octet-stream",
      ...(object.contentLength !== undefined ? { "Content-Length": String(object.contentLength) } : {}),
      "Cache-Control": "private, no-store",
    },
  });
}
