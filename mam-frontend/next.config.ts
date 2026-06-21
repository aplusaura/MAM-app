import type { NextConfig } from "next";

const API_URL = process.env.API_BACKEND_URL || "http://localhost:8001";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/api/v1/:resource",
        destination: `${API_URL}/api/v1/:resource/`,
      },
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
