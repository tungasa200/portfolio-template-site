import type { NextConfig } from "next";

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
};

export default nextConfig;
