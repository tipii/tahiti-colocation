import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["dev.theop.dev"],
  rewrites: async () => [
    {
      source: "/api/:path*",
      destination: `${API_URL}/api/:path*`,
    },
    {
      source: "/rpc/:path*",
      destination: `${API_URL}/rpc/:path*`,
    },
  ],
};

export default nextConfig;
