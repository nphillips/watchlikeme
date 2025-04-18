import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import { join } from "path";

// Load environment variables from the root .env file
loadEnvConfig(join(process.cwd(), "../.."));

const nextConfig: NextConfig = {
  env: {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    ORIGIN: process.env.ORIGIN,
  },
  images: {
    domains: ["yt3.ggpht.com", "yt4.ggpht.com", "yt5.ggpht.com"],
  },
};

export default nextConfig;
