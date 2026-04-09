import type { NextConfig } from "next";

// Build allowed dev origins dynamically
const allowedDevOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
];

// Add ngrok URL from environment if available
if (process.env.NGROK_URL) {
  allowedDevOrigins.push(process.env.NGROK_URL);
}

const nextConfig: NextConfig = {
  // Enable React Fast Refresh for instant HMR
  reactStrictMode: true,
  allowedDevOrigins,

  // Enable Turbopack (default in Next.js 16) - provides better HMR than webpack
  turbopack: {
    // Empty config to acknowledge we're using Turbopack
    // Turbopack has superior HMR out of the box
  },
};

export default nextConfig;
