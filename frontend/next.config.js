const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["yt3.ggpht.com", "yt3.googleusercontent.com", "i.ytimg.com"],
  },
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  async redirects() {
    return [
      {
        source: "/collections",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
