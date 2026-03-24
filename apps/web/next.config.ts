import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["dev.theop.dev"],
  rewrites: async () => [
    {
      source: "/api/:path*",
      destination: `${process.env.API_URL ?? "http://localhost:3001"}/api/:path*`,
    },
    {
      source: "/rpc/:path*",
      destination: `${process.env.API_URL ?? "http://localhost:3001"}/rpc/:path*`,
    },
  ],
};

export default nextConfig;
