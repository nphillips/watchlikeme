import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Get the directory path of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Expose BACKEND_URL as NEXT_PUBLIC_BACKEND_URL so it's available client-side
    NEXT_PUBLIC_BACKEND_URL: process.env.BACKEND_URL || "http://localhost:8888",
  },
  // Add any other Next.js configuration options here
};

export default nextConfig;
