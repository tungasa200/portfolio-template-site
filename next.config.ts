import type { NextConfig } from "next";

// R2_PUBLIC_HOSTNAME is only set once a custom domain is connected to the R2
// bucket (see docs/external-services.md#2) — a dashboard step, not something
// this codebase can provision. Until then, omit the remotePattern rather
// than pointing next/image at an unset hostname.
const r2Hostname = process.env.R2_PUBLIC_HOSTNAME;

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Server Actions default to a 1MB request body cap. The contact
      // form's attachment field advertises "up to 10MB" — leave headroom
      // for multipart/form-data boundary/header overhead (see
      // node_modules/next/dist/docs/.../serverActions.md).
      bodySizeLimit: "11mb",
    },
  },
  images: {
    remotePatterns: r2Hostname
      ? [{ protocol: "https", hostname: r2Hostname, pathname: "/tenants/**" }]
      : [],
  },
};

export default nextConfig;
