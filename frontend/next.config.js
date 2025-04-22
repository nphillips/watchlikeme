const { loadEnvConfig } = require("@next/env");

// Load environment variables from root .env file
loadEnvConfig(process.cwd());

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "yt3.ggpht.com", // YouTube profile pictures
      "yt3.googleusercontent.com", // Other YouTube thumbnails
      "i.ytimg.com", // YouTube video thumbnails
    ],
  },
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
};

module.exports = nextConfig;
