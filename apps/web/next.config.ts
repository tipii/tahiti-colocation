import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  rewrites: async () => [
    {
      source: "/api/:path*",
      destination: `${process.env.API_URL ?? "http://localhost:3001"}/api/:path*`,
    },
  ],
};

export default nextConfig;
