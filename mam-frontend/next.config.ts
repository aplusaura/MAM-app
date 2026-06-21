import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      // Single-segment resource roots need trailing slash (FastAPI list endpoints
      // are registered as @router.get("/") so they only match with trailing slash).
      // Adding it here prevents FastAPI's 307 redirect, which would lose the
      // Authorization header on cross-origin redirect (port 3000 → 8001).
      {
        source: "/api/v1/:resource",
        destination: "http://localhost:8001/api/v1/:resource/",
      },
      // All other paths (deeper like /auth/me, /employees/5, /reports/tasks/stats)
      // are forwarded as-is — they do NOT need a trailing slash.
      {
        source: "/api/:path*",
        destination: "http://localhost:8001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
