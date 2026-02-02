import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React Fast Refresh for instant HMR
  reactStrictMode: true,

  // Enable Turbopack (default in Next.js 16) - provides better HMR than webpack
  turbopack: {
  // Empty config to acknowledge we're using Turbopack
  // Turbopack has superior HMR out of the box
  },
};

export default nextConfig;
