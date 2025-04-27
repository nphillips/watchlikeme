const { loadEnvConfig } = require("@next/env");

// Load environment variables from root .env file
loadEnvConfig(process.cwd());

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "yt3.ggpht.com",
        port: "",
        pathname: "/**", // Allow any path
      },
      {
        protocol: "https",
        hostname: "yt3.googleusercontent.com",
        port: "",
        pathname: "/**", // Allow any path
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        port: "",
        pathname: "/**", // Allow any path
      },
    ],
  },
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  // Add rewrites for API proxying during development
  async rewrites() {
    return [
      // Add a specific rewrite for /api/channels first
      {
        source: "/api/channels",
        // Restore correct destination
        destination: "http://localhost:8888/api/channels",
      },
      // Keep the general rewrite for other API paths
      {
        source: "/api/:path*",
        // Restore correct destination
        destination: "http://localhost:8888/api/:path*", // Proxy to Backend
      },
    ];
  },
};

module.exports = nextConfig;
